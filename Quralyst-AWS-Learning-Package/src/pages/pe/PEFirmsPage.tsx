// PE Dataset — firm directory (F23.4; CU.5 add/delete; F28 toolbar parity).
// Port of Replit QURALYST-20/artifacts/pe-scraper/src/pages/Firms.tsx:
//   • Toolbar: search + appetite filter | staff ops + Add / Import / CSV / Scrape
//   • Card table: Firm Name · Top Sectors · Holdings · Appetite · Last Scraped · Criteria · Actions
//   • Client-side sort + appetite filter; pageSize 50 (Q20)
// Global tables.css overridden in pe-firms.css. Gated by RoleRoute role="pe_dataset".
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peService, peAdminService, peSignalsService } from '@/services/api';
import { paths } from '@/routes/paths';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge, Button, Modal, BaseTable, TruncatedCell } from '@/components/ui';
import ConfirmDialog from '@/components/pe/admin/ConfirmDialog';
import { AppetiteBadge } from '@/components/pe/SignalBadges';
import { formatDateTime } from '@/lib/datetime';
import { fmtRelativeTime } from '@/components/pe/ib/ibUtils';
import type {
  PEAdminTriggerOp,
  PEAppetiteTier,
  PEBulkImportResult,
  PEBulkImportStatus,
  PEFirm,
  PEAcquisitionAppetite,
} from '@/types';
import '@/styles/pages/pe-firms.css';

const PAGE_SIZE = 50;
const FETCH_PAGE = 100; // backend max pageSize for /api/pe/firms
const STALE = 60_000;

type SortKey = 'name' | 'holdingsCount' | 'lastScrapedAt' | 'appetite';
type SortDir = 'asc' | 'desc';
type AppetiteFilter = PEAppetiteTier | 'all';

const APPETITE_OPTIONS: { value: AppetiteFilter; label: string }[] = [
  { value: 'all', label: 'All appetite' },
  { value: 'high', label: 'High appetite' },
  { value: 'moderate', label: 'Moderate appetite' },
  { value: 'low', label: 'Low appetite' },
  { value: 'dormant', label: 'Dormant' },
];

/** Compact Q20-style appetite select (avoids global .custom-dropdown 58px chrome). */
function AppetiteFilterSelect({
  value,
  onChange,
}: {
  value: AppetiteFilter;
  onChange: (v: AppetiteFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = APPETITE_OPTIONS.find((o) => o.value === value)?.label ?? 'All appetite';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`pef-appetite${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="pef-appetite__trigger"
        aria-label="Filter by appetite"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="pef-appetite__value">{label}</span>
        <i className="bi bi-chevron-down pef-appetite__chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul className="pef-appetite__menu" role="listbox" aria-label="Appetite">
          {APPETITE_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`pef-appetite__option${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {selected && <i className="bi bi-check2" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Staff bulk ops — order matches Q20 toolbar (Clean → Check Exits → … → Fill Criteria). */
interface StaffTrigger {
  op: PEAdminTriggerOp;
  label: string;
  scope: string;
  destructive: boolean;
}

const TRIGGER_CLEAN: StaffTrigger = {
  op: 'clean-holdings',
  label: 'Clean Holdings',
  scope:
    'Runs the holdings hygiene pass over the whole dataset — normalises rows and removes junk portfolio entries.',
  destructive: true,
};

const TRIGGER_EXITS: StaffTrigger = {
  op: 'check-stale-holdings',
  label: 'Check Exits',
  scope: 'Scans live holdings for likely exits and flags stale ones into the removal-review queue.',
  destructive: false,
};

const TRIGGER_CRITERIA: StaffTrigger = {
  op: 'fill-criteria',
  label: 'Fill Missing Criteria',
  scope:
    'Estimates buy-box size criteria for firms that are still missing them (spends LLM budget). Already-filled firms are skipped.',
  destructive: false,
};

function sectorChips(firm: PEFirm): string[] {
  const raw = firm.sectorCriteriaInferred || firm.sectorCriteria || '';
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;]+/)) {
    const s = part.trim();
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      out.push(s);
    }
  }
  return out.slice(0, 3);
}

function isAiFilled(firm: PEFirm): boolean {
  return !!(firm.criteriaAutoFilled && Object.keys(firm.criteriaAutoFilled).length > 0);
}

function hasManualCriteria(firm: PEFirm): boolean {
  return !!(firm.sectorCriteria || firm.revMin != null || firm.ebitdaMin != null);
}

function stalenessTier(iso: string): 'fresh' | 'aging' | 'stale' {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 90) return 'fresh';
  if (days <= 180) return 'aging';
  return 'stale';
}

function StalenessChip({ date }: { date: string }) {
  const tier = stalenessTier(date);
  const label = fmtRelativeTime(date) || '—';
  return (
    <span className={`pef-stale pef-stale--${tier}`} title={formatDateTime(date)}>
      <span className="pef-stale__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

async function fetchAllFirms(): Promise<PEFirm[]> {
  const all: PEFirm[] = [];
  let page = 1;
  for (;;) {
    const res = await peService.listFirms({ page, pageSize: FETCH_PAGE });
    all.push(...res.firms);
    if (all.length >= res.meta.total || res.firms.length === 0) break;
    page += 1;
  }
  return all;
}

// F65 — result ordering + tone for the bulk-import outcome list. Worst first: the operator's job
// after an import is to deal with what did NOT land cleanly.
const IMPORT_STATUS_ORDER: Record<PEBulkImportStatus, number> = {
  failed: 0,
  quarantined: 1,
  duplicate: 2,
  created: 3,
};

const IMPORT_STATUS_TONE: Record<PEBulkImportStatus, 'success' | 'danger' | 'warning' | 'info'> = {
  failed: 'danger',
  quarantined: 'warning',
  duplicate: 'info',
  created: 'success',
};

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState<PEBulkImportResult | null>(null);

  const urls = useMemo(
    () =>
      text
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean),
    [text],
  );

  const importMutation = useMutation({
    mutationFn: (list: string[]) => peService.bulkImport(list),
    onSuccess: (result) => {
      setOutcome(result);
      void queryClient.invalidateQueries({ queryKey: ['pe', 'firms'] });
    },
    onError: () => toast.error('Bulk import failed'),
  });

  const close = () => {
    setText('');
    setOutcome(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Import firms" size="lg">
      {outcome ? (
        <>
          <p>
            {outcome.summary.created} created · {outcome.summary.duplicate} duplicate ·{' '}
            {outcome.summary.quarantined} quarantined · {outcome.summary.failed} failed
          </p>
          {/* F65 — worst first. The rows an operator must act on (failed, then quarantined) were
              previously buried in import order among dozens of successes, which for a 200-URL
              import meant scrolling the whole list to find the one that broke. */}
          <ul className="list-group mb-3">
            {[...outcome.results]
              .sort((a, b) => IMPORT_STATUS_ORDER[a.status] - IMPORT_STATUS_ORDER[b.status])
              .map((r) => (
                <li
                  key={r.url}
                  className="list-group-item d-flex justify-content-between align-items-start gap-2"
                >
                  <span className="text-truncate" title={r.url}>
                    {r.firmName ?? r.url}
                  </span>
                  <span className="text-end small">
                    <Badge tone={IMPORT_STATUS_TONE[r.status]}>{r.status}</Badge>
                    {(r.reason || r.error) && (
                      <div className="text-muted">{r.reason ?? r.error}</div>
                    )}
                  </span>
                </li>
              ))}
          </ul>
          <Button onClick={close}>Done</Button>
        </>
      ) : (
        <>
          <label className="form-label" htmlFor="pe-import-urls">
            Firm website URLs (one per line, max 200). Portfolio and criteria pages are
            auto-discovered; low-confidence sites are quarantined for review.
          </label>
          <textarea
            id="pe-import-urls"
            className="form-control mb-2"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="d-flex gap-2 align-items-center">
            <Button
              disabled={urls.length === 0 || urls.length > 200 || importMutation.isPending}
              onClick={() => importMutation.mutate(urls)}
            >
              {importMutation.isPending ? 'Importing…' : `Import ${urls.length} URL(s)`}
            </Button>
            {urls.length > 200 && <span className="text-danger">Max 200 URLs per import.</span>}
          </div>
        </>
      )}
    </Modal>
  );
}

const addFirmSchema = z.object({
  websiteUrl: z.string().min(1, 'Website URL is required').url('Enter a full URL (https://…)'),
  name: z.string(),
});
type AddFirmValues = z.infer<typeof addFirmSchema>;

function AddFirmModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddFirmValues>({
    resolver: zodResolver(addFirmSchema),
    defaultValues: { websiteUrl: '', name: '' },
  });

  const close = () => {
    reset();
    onClose();
  };

  const create = useMutation({
    mutationFn: (values: AddFirmValues) =>
      peService.createFirm({
        websiteUrl: values.websiteUrl,
        ...(values.name.trim() ? { name: values.name.trim() } : {}),
      }),
    onSuccess: (firm) => {
      if (firm.quarantined) {
        toast.success(
          `Firm “${firm.name}” created but quarantined${firm.quarantineReason ? ` — ${firm.quarantineReason}` : ''}.`,
        );
      } else {
        toast.success(`Firm “${firm.name}” created${firm.scrapeQueued ? '; scrape queued' : ''}.`);
      }
      void queryClient.invalidateQueries({ queryKey: ['pe', 'firms'] });
      close();
    },
    onError: () => toast.error('Could not create the firm (is the website already registered?).'),
  });

  return (
    <Modal open={open} onClose={close} title="Add firm">
      <form onSubmit={handleSubmit((values) => create.mutate(values))} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="pe-add-firm-url">
            Firm website URL
          </label>
          <input
            id="pe-add-firm-url"
            type="url"
            className="form-control"
            placeholder="https://examplecapital.com"
            aria-invalid={!!errors.websiteUrl}
            aria-describedby={errors.websiteUrl ? 'pe-add-firm-url-error' : undefined}
            {...register('websiteUrl')}
          />
          {errors.websiteUrl && (
            <div id="pe-add-firm-url-error" className="text-danger small mt-1" role="alert">
              {errors.websiteUrl.message}
            </div>
          )}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="pe-add-firm-name">
            Name (optional — discovered from the site when omitted)
          </label>
          <input id="pe-add-firm-name" type="text" className="form-control" {...register('name')} />
        </div>
        <div className="d-flex gap-2 justify-content-end">
          <Button variant="popup-secondary" type="button" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={create.isPending}
            loading={create.isPending}
            data-testid="pe-add-firm-submit"
          >
            Add firm
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PEFirmsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const isStaff = can('pe:admin');

  const [search, setSearch] = useState('');
  const [appetiteFilter, setAppetiteFilter] = useState<AppetiteFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PEFirm | null>(null);
  const [forceOpen, setForceOpen] = useState(false);
  const [pendingTrigger, setPendingTrigger] = useState<StaffTrigger | null>(null);

  const { data: allFirms = [], isPending } = useQuery({
    queryKey: ['pe', 'firms', 'all'],
    queryFn: fetchAllFirms,
    staleTime: STALE,
  });

  const { data: signalsBatch } = useQuery({
    queryKey: ['pe', 'signals', 'firms'],
    queryFn: () => peSignalsService.listFirmSignals(),
    staleTime: STALE,
  });

  const pause = useQuery({
    queryKey: ['pe', 'admin', 'scraper-pause'],
    queryFn: () => peAdminService.getPause(),
    enabled: isStaff,
  });
  const paused = pause.data?.paused ?? false;

  const appetiteByFirm = useMemo(() => {
    const m = new Map<string, PEAcquisitionAppetite>();
    for (const r of signalsBatch?.rows ?? []) m.set(r.firmId, r.appetite);
    return m;
  }, [signalsBatch]);

  useEffect(() => {
    setPage(0);
  }, [search, appetiteFilter, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else {
        setSortKey(key);
        setSortDir(key === 'name' ? 'asc' : 'desc');
      }
    },
    [sortKey],
  );

  const filtered = useMemo(() => {
    let rows = allFirms;
    if (search.trim()) {
      const lq = search.toLowerCase();
      rows = rows.filter(
        (f) =>
          f.name.toLowerCase().includes(lq) ||
          f.firmHostKey.toLowerCase().includes(lq) ||
          (f.websiteUrl ?? '').toLowerCase().includes(lq),
      );
    }
    if (appetiteFilter !== 'all') {
      rows = rows.filter((f) => appetiteByFirm.get(f.id)?.tier === appetiteFilter);
    }
    return rows;
  }, [allFirms, search, appetiteFilter, appetiteByFirm]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'holdingsCount':
          cmp = (a.holdingsCount ?? 0) - (b.holdingsCount ?? 0);
          break;
        case 'lastScrapedAt':
          cmp =
            (a.lastScrapedAt ? new Date(a.lastScrapedAt).getTime() : 0) -
            (b.lastScrapedAt ? new Date(b.lastScrapedAt).getTime() : 0);
          break;
        case 'appetite':
          cmp = (appetiteByFirm.get(a.id)?.score ?? -1) - (appetiteByFirm.get(b.id)?.score ?? -1);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [filtered, sortKey, sortDir, appetiteByFirm]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showing = sorted.length === 0 ? 0 : Math.min(PAGE_SIZE, sorted.length - page * PAGE_SIZE);

  const scrapeAll = useMutation({
    mutationFn: (opts: { force?: boolean } = {}) => peService.scrapeAll(opts),
    onSuccess: (r) => toast.success(`Queued ${r.queued} scrape(s); ${r.skipped} skipped.`),
    onError: () => toast.error('Scrape-all failed (scraper may be paused).'),
  });

  const exportCsv = useMutation({
    mutationFn: () => peService.exportFirms({ search: search || undefined }),
    onSuccess: () => toast.success('Firm export downloaded.'),
    onError: () => toast.error('Could not export firms.'),
  });

  const togglePause = useMutation({
    mutationFn: (next: boolean) => peAdminService.setPause(next),
    onSuccess: (res) => {
      toast.success(res.paused ? 'Scraping paused.' : 'Scraping resumed.');
      void queryClient.invalidateQueries({ queryKey: ['pe', 'admin', 'scraper-pause'] });
    },
    onError: () => toast.error('Could not change the pause state.'),
  });

  const runTrigger = useMutation({
    mutationFn: (op: PEAdminTriggerOp) => peAdminService.runTrigger(op),
    onSuccess: (_res, op) => {
      const labels: Record<string, string> = {
        'clean-holdings': TRIGGER_CLEAN.label,
        'check-stale-holdings': TRIGGER_EXITS.label,
        'fill-criteria': TRIGGER_CRITERIA.label,
      };
      setPendingTrigger(null);
      toast.success(`${labels[op] ?? 'Job'} enqueued.`);
    },
    onError: () => {
      setPendingTrigger(null);
      toast.error('Could not enqueue the job.');
    },
  });

  const scrapeOne = useMutation({
    mutationFn: (id: string) => peService.scrapeFirm(id),
    onSuccess: (r) => {
      toast.success(r.message || (r.queued ? 'Scrape queued.' : 'Already queued.'));
      void queryClient.invalidateQueries({ queryKey: ['pe', 'firms'] });
    },
    onError: () => toast.error('Could not queue the scrape.'),
  });

  const deleteFirm = useMutation({
    mutationFn: (id: string) => peService.deleteFirm(id),
    onSuccess: () => {
      toast.success(`Firm “${toDelete?.name ?? ''}” deleted.`);
      setToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['pe', 'firms'] });
    },
    onError: () => toast.error('Could not delete the firm.'),
  });

  return (
    <div className="pef-page">
      {/* Toolbar: filters + Add Firm on row 1; staff / data / scrape actions on row 2. */}
      <div className="pef-toolbar">
        <div className="pef-toolbar__row pef-toolbar__row--filters">
          <div className="pef-toolbar__left">
            <div className="pef-search">
              <i className="bi bi-search pef-search__icon" aria-hidden="true" />
              <input
                id="pe-firm-search"
                type="search"
                className="pef-input"
                placeholder="Search firms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search firms"
              />
            </div>
            <AppetiteFilterSelect value={appetiteFilter} onChange={setAppetiteFilter} />
          </div>
          {isStaff && (
            <button
              type="button"
              className="pef-btn pef-btn--primary"
              onClick={() => setAddOpen(true)}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Add Firm
            </button>
          )}
        </div>

        <div className="pef-toolbar__row pef-toolbar__row--actions">
          {isStaff && (
            <div className="pef-toolbar__group">
              <Link to={paths.pe.admin} className="pef-btn pef-btn--outline">
                <i className="bi bi-intersect" aria-hidden="true" />
                Deduplicate
              </Link>
              <button
                type="button"
                className="pef-btn pef-btn--outline"
                disabled={runTrigger.isPending}
                onClick={() => setPendingTrigger(TRIGGER_CLEAN)}
              >
                <i className="bi bi-stars" aria-hidden="true" />
                Clean Holdings
              </button>
              <button
                type="button"
                className="pef-btn pef-btn--outline"
                disabled={runTrigger.isPending}
                onClick={() => setPendingTrigger(TRIGGER_EXITS)}
              >
                <i className="bi bi-lightbulb" aria-hidden="true" />
                Check Exits
              </button>
              <button
                type="button"
                className="pef-btn pef-btn--outline pef-btn--sm"
                disabled={runTrigger.isPending}
                onClick={() => setPendingTrigger(TRIGGER_CRITERIA)}
                title="Scrape investment criteria pages for firms missing data"
              >
                <i className="bi bi-lightbulb" aria-hidden="true" />
                Fill Missing Criteria
              </button>
            </div>
          )}

          <div className="pef-toolbar__group">
            {isStaff && (
              <button
                type="button"
                className="pef-btn pef-btn--outline"
                onClick={() => setImportOpen(true)}
              >
                <i className="bi bi-upload" aria-hidden="true" />
                Bulk Import
              </button>
            )}
            <button
              type="button"
              className="pef-btn pef-btn--outline pef-btn--sm"
              disabled={exportCsv.isPending || sorted.length === 0}
              onClick={() => exportCsv.mutate()}
            >
              <i className="bi bi-download" aria-hidden="true" />
              {exportCsv.isPending
                ? 'Exporting…'
                : `Download CSV${sorted.length ? ` (${sorted.length.toLocaleString()})` : ''}`}
            </button>
          </div>

          {isStaff && (
            <div className="pef-toolbar__group">
              <button
                type="button"
                className={`pef-btn ${paused ? 'pef-btn--pause' : 'pef-btn--outline'}`}
                disabled={togglePause.isPending}
                onClick={() => togglePause.mutate(!paused)}
                title={
                  paused
                    ? 'Resume scraping — works through the preserved pending queue'
                    : 'Pause all scraping (the pending queue is preserved)'
                }
              >
                <i
                  className={`bi ${paused ? 'bi-play-fill' : 'bi-pause-fill'}`}
                  aria-hidden="true"
                />
                {paused ? 'Resume Scraping' : 'Pause Scraping'}
              </button>
              <button
                type="button"
                className="pef-btn pef-btn--outline"
                disabled={scrapeAll.isPending || isPending || allFirms.length === 0 || paused}
                onClick={() => scrapeAll.mutate({})}
                title={
                  paused
                    ? 'Scraping is paused — click Resume Scraping first'
                    : allFirms.length === 0
                      ? 'Add firms before scraping'
                      : 'Queue a fresh scrape for active firms past the 12-hour cooldown'
                }
              >
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                {scrapeAll.isPending ? 'Queuing…' : 'Scrape All'}
              </button>
              <button
                type="button"
                className="pef-btn pef-btn--outline"
                onClick={() => setForceOpen(true)}
                disabled={scrapeAll.isPending || isPending || allFirms.length === 0 || paused}
                title={
                  paused
                    ? 'Scraping is paused — click Resume Scraping first'
                    : allFirms.length === 0
                      ? 'Add firms before scraping'
                      : 'Re-scrape every active firm now, ignoring the 12-hour cooldown'
                }
              >
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                Force Re-scrape All
              </button>
            </div>
          )}
        </div>
      </div>

      {isStaff && paused && (
        <div className="pef-paused-banner" role="status">
          <i className="bi bi-pause-circle-fill" aria-hidden="true" />
          Scraping is paused — <strong>Scrape All</strong> and <strong>Force Re-scrape All</strong>{' '}
          stay disabled until you click <strong>Resume Scraping</strong>.
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="pef-header">
        <div className="pef-crumb">
          <span>Private Equity</span>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <span className="pef-crumb__current">Firms (PE)</span>
        </div>
        <h1 className="pef-header__title">PE Firms</h1>
        <p className="pef-header__sub">
          Database of private equity firms, their holdings, and portfolio activity.
        </p>
      </header>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <BaseTable<PEFirm>
        columns={[
          {
            key: 'name',
            header: 'Firm Name',
            sortable: true,
            headerClass: 'pef-th--firm',
            render: (firm) => (
              <TruncatedCell
                header="Firm Name"
                value={firm.name}
                linkTo={paths.pe.firm(firm.id)}
                maxWidth="18rem"
                extra={
                  <span className="pef-firm__icon ms-1" aria-hidden="true">
                    <i className="bi bi-building" />
                  </span>
                }
              />
            ),
          },
          {
            key: 'topSectors',
            header: 'Top Sectors',
            render: (firm) => {
              const sectors = sectorChips(firm);
              return sectors.length === 0 ? (
                <span className="pef-muted">No sectors yet</span>
              ) : (
                <div className="pef-sectors">
                  {sectors.map((s) => (
                    <span key={s} className="pef-sector">
                      {s}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            key: 'holdingsCount',
            header: 'Holdings',
            sortable: true,
            align: 'right',
            headerClass: 'pef-th--num',
            cellClass: 'pef-td--num',
            render: (firm) => firm.holdingsCount,
          },
          {
            key: 'appetite',
            header: 'Appetite',
            sortable: true,
            render: (firm) => {
              const appetite = appetiteByFirm.get(firm.id);
              return appetite ? (
                <AppetiteBadge
                  tier={appetite.tier}
                  score={appetite.score}
                  reasons={appetite.reasons}
                />
              ) : (
                <span className="pef-muted">—</span>
              );
            },
          },
          {
            key: 'lastScrapedAt',
            header: 'Last Scraped',
            sortable: true,
            render: (firm) =>
              firm.lastScrapedAt ? (
                <StalenessChip date={firm.lastScrapedAt} />
              ) : (
                <span className="pef-muted">Never</span>
              ),
          },
          {
            key: 'criteria',
            header: 'Criteria',
            render: (firm) =>
              isAiFilled(firm) ? (
                <span className="pef-criteria pef-criteria--ai">
                  <i className="bi bi-stars" aria-hidden="true" />
                  AI Filled
                </span>
              ) : hasManualCriteria(firm) ? (
                <span className="pef-criteria pef-criteria--manual">Manual</span>
              ) : null,
          },
          ...(isStaff
            ? [
                {
                  key: 'actions' as const,
                  header: 'Actions',
                  align: 'right' as const,
                  headerClass: 'pef-th--actions',
                  cellClass: 'pef-td--actions',
                  render: (firm: PEFirm) => (
                    <div className="pef-actions">
                      <button
                        type="button"
                        className="pef-btn pef-btn--outline pef-btn--icon"
                        disabled={scrapeOne.isPending}
                        onClick={() => scrapeOne.mutate(firm.id)}
                        title="Trigger scrape"
                        aria-label={`Scrape ${firm.name}`}
                      >
                        <i className="bi bi-arrow-repeat" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="pef-btn pef-btn--danger pef-btn--icon"
                        onClick={() => setToDelete(firm)}
                        title="Delete firm"
                        aria-label={`Delete ${firm.name}`}
                      >
                        <i className="bi bi-trash" aria-hidden="true" />
                      </button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
        rows={paginated}
        getRowKey={(firm) => firm.id}
        loading={isPending}
        loadingRows={5}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k) => handleSort(k as SortKey)}
        stickyFirstCol
        rowClass="pef-row"
        emptyMessage={
          allFirms.length === 0
            ? 'No firms added yet. Click “Add Firm” or “Bulk Import” to get started.'
            : 'No firms match — adjust search or appetite filter.'
        }
        footer={
          <>
            <p className="pef-footer__count">
              {sorted.length === 0 ? (
                'No firms'
              ) : (
                <>
                  Showing <strong>{showing}</strong> of{' '}
                  <strong>{sorted.length.toLocaleString()}</strong> firms
                </>
              )}
            </p>
            {totalPages > 1 && (
              <nav aria-label="Firms pagination" className="pef-pagination">
                <button
                  type="button"
                  className="pef-btn pef-btn--outline"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="pef-btn pef-btn--outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        }
      />

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <AddFirmModal open={addOpen} onClose={() => setAddOpen(false)} />

      <ConfirmDialog
        open={forceOpen}
        onClose={() => setForceOpen(false)}
        onConfirm={() => {
          scrapeAll.mutate({ force: true });
          setForceOpen(false);
        }}
        title="Force re-scrape all firms?"
        confirmLabel="Force re-scrape"
        pending={scrapeAll.isPending}
      >
        <p className="mb-0">
          This queues a scrape for <strong>every</strong> firm, bypassing the 12-hour per-firm
          cooldown. It runs off-request and spends scrape/LLM budget.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingTrigger !== null}
        onClose={() => setPendingTrigger(null)}
        onConfirm={() => pendingTrigger && runTrigger.mutate(pendingTrigger.op)}
        title={pendingTrigger ? `Run “${pendingTrigger.label}”?` : ''}
        confirmLabel="Enqueue job"
        danger={pendingTrigger?.destructive}
        pending={runTrigger.isPending}
      >
        <p className="mb-2">{pendingTrigger?.scope}</p>
        <p className="mb-0 small">
          This enqueues a bulk background job over the whole dataset; watch progress in the admin
          console.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteFirm.mutate(toDelete.id)}
        title="Delete firm"
        confirmLabel="Delete firm"
        danger
        pending={deleteFirm.isPending}
        typedConfirm={toDelete?.name}
      >
        <p>
          Deleting <strong>{toDelete?.name}</strong> is irreversible and cascades: the firm’s
          holdings, people, and scrape jobs are removed with it.
        </p>
      </ConfirmDialog>
    </div>
  );
}
