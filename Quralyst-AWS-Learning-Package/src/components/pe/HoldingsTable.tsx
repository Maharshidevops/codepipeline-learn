// PE Holdings — aggregated table (F24.3). Server-driven pagination (0-based page, size 50),
// debounced search, pill filters (firm / status / data quality), sortable columns, exit-readiness
// chips, and staff enrichment actions. Used on /pe/holdings and embedded on firm detail (firmId).
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peAdminService, peService, peScreenerService, peSignalsService } from '@/services/api';
import type { PEHoldingSortBy, PEHoldingSortDir } from '@/services/api';
import { paths } from '@/routes/paths';
import { openTearsheet } from '@/lib/tearsheet/openTearsheet';
import { formatDateTime } from '@/lib/datetime';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/useToast';
import { Badge, BaseTable } from '@/components/ui';
import type { BadgeTone, BaseTableColumn } from '@/components/ui';
import type { PEHolding, PEHoldingSource, PEInvestmentStatus } from '@/types';
import { fmtRelativeTime } from '@/components/pe/ib/ibUtils';
import { ReadinessChip } from '@/components/pe/SignalBadges';
import { TruncatedCell } from '@/components/ui';
import { FieldQualityChips, RowQualityBadge } from './HoldingQualityBadge';
import DealTeamPanel from './DealTeamPanel';
import EnrichmentPanel from './EnrichmentPanel';
import HoldingEditDrawer from './HoldingEditDrawer';
import '@/styles/pages/pe-holdings.css';

const STATUS_TONE: Record<Exclude<PEInvestmentStatus, null>, BadgeTone> = {
  current: 'success',
  realized: 'info',
  unknown: 'secondary',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'current', label: 'Current' },
  { value: 'realized', label: 'Realized' },
  { value: 'unknown', label: 'Unknown' },
] as const;

const QUALITY_OPTIONS = [
  { value: 'all', label: 'All Data Quality' },
  { value: 'suspect', label: 'Suspect / invalid only' },
] as const;

type QualityFilter = (typeof QUALITY_OPTIONS)[number]['value'];

const STAT_TILES = [
  { key: 'total' as const, label: 'Total Holdings', tone: '' },
  {
    key: 'withDescription' as const,
    label: 'With Business Context',
    tone: 'peh-stat__value--emerald',
  },
  { key: 'withGeography' as const, label: 'Geolocated', tone: '' },
  {
    key: 'withInvestmentDate' as const,
    label: 'Investment Dates Found',
    tone: 'peh-stat__value--orange',
  },
  { key: 'withWebsite' as const, label: 'With Website', tone: 'peh-stat__value--sky' },
];

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function formatEstimatedInvestment(h: PEHolding): string {
  // estimatedInvestmentYear/Month arrive as numbers from the backend (IntField), so coerce
  // to string before trimming — calling .trim() on a number throws ("not a function").
  const year = h.estimatedInvestmentYear != null ? String(h.estimatedInvestmentYear).trim() : '';
  if (!year) return '';
  const month = h.estimatedInvestmentMonth != null ? String(h.estimatedInvestmentMonth).trim() : '';
  return month ? `${month}/${year}` : year;
}

function formatConfidence(score?: number | null): string {
  if (score == null) return '';
  return `${Math.round(score * 100)}%`;
}

function confidenceClass(score?: number | null): string {
  if (score == null) return '';
  if (score >= 0.8) return 'peh-conf peh-conf--high';
  if (score >= 0.5) return 'peh-conf peh-conf--mid';
  return 'peh-conf peh-conf--low';
}

function stalenessTier(iso: string): 'fresh' | 'aging' | 'stale' {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 90) return 'fresh';
  if (days <= 180) return 'aging';
  return 'stale';
}

function invDateSourceClass(source?: PEHoldingSource): string {
  if (source === 'ai_search' || source === 'ai_description') return 'peh-src peh-src--web';
  if (source === 'scrape' || source === 'scrape_unverified') return 'peh-src peh-src--scrape';
  if (source === 'operator') return 'peh-src peh-src--unverified';
  return 'peh-src';
}

function invDateSourceIcon(source?: PEHoldingSource): string {
  if (source === 'ai_search' || source === 'ai_description') return 'bi-globe';
  if (source === 'scrape' || source === 'scrape_unverified') return 'bi-building';
  if (source === 'operator') return 'bi-calendar-event';
  return 'bi-question-circle';
}

function invDateSourceTitle(source?: PEHoldingSource): string {
  if (source === 'ai_search') return 'Date found via web search';
  if (source === 'ai_description') return 'Inferred from description';
  if (source === 'scrape') return 'Date from PE firm website';
  if (source === 'scrape_unverified') return 'Date from page (unverified)';
  if (source === 'operator') return 'Edited by operator';
  return 'Source unknown';
}

function truncateDescription(text: string, maxWords = 20): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function Skel({ w, h = 14 }: { w: number; h?: number }) {
  return <span className="peh-skel" style={{ width: w, height: h }} />;
}

interface PillOption {
  value: string;
  label: string;
}

interface PillSelectProps {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  'aria-label': string;
}

function PillSelect({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: PillSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`peh-pill${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="peh-pill__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="peh-pill__value">{selected?.label}</span>
        <i className="bi bi-chevron-down peh-pill__chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} className="peh-pill__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value || '__all'} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`peh-pill__option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <i className="bi bi-check2" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StalenessChip({ date }: { date: string }) {
  const tier = stalenessTier(date);
  const label = fmtRelativeTime(date) || '—';
  return (
    <span className={`peh-stale peh-stale--${tier}`} title={formatDateTime(date)}>
      <span className="peh-stale__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export interface HoldingsTableProps {
  /** When set, scopes the table to one firm and hides firm filter, Firm column, and page chrome. */
  firmId?: string;
  /** Number of holdings per page. Defaults to 15. */
  pageSize?: number;
}

export default function HoldingsTable({
  firmId,
  pageSize: propsPageSize = 15,
}: HoldingsTableProps) {
  const pageSize = propsPageSize;
  const toast = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const isStaff = can('pe:admin');
  const showPageChrome = !firmId;
  const showFirmColumn = !firmId;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quality, setQuality] = useState<QualityFilter>('all');
  const [sortBy, setSortBy] = useState<PEHoldingSortBy>('companyName');
  const [sortDir, setSortDir] = useState<PEHoldingSortDir>('asc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<PEHolding | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  // One row open at a time (reference `expandedHoldingId`): the panel fires its own request,
  // so letting every row stay open would fan out a query per row on a 50-row page.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [search, firmFilter, statusFilter, quality, sortBy, sortDir, firmId]);

  const firmsQuery = useQuery({
    queryKey: ['pe', 'firms', 'options'],
    queryFn: () => peService.listFirmOptions(),
    enabled: showFirmColumn,
  });

  const firmOptions = useMemo<PillOption[]>(
    () => [
      { value: '', label: 'All Firms' },
      ...(firmsQuery.data ?? []).map((f) => ({ value: f.id, label: f.name })),
    ],
    [firmsQuery.data],
  );

  const statsQuery = useQuery({
    queryKey: ['pe', 'screener', 'holdings-stats'],
    queryFn: () => peScreenerService.getHoldingsStats(),
    enabled: showPageChrome,
    staleTime: 60_000,
  });

  const { data, isPending, isFetching } = useQuery({
    queryKey: [
      'pe',
      'holdings',
      {
        firmId: firmId ?? firmFilter,
        search,
        statusFilter,
        quality,
        sortBy,
        sortDir,
        page,
        pageSize,
      },
    ],
    queryFn: () =>
      peService.listHoldings({
        firmId: firmId ?? (firmFilter || undefined),
        search: search || undefined,
        status: statusFilter || undefined,
        quality: quality === 'suspect' ? 'suspect' : undefined,
        sortBy,
        sortDir,
        page,
        pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const holdings = data?.holdings ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const holdingIdsKey = holdings.map((h) => h.id).join(',');

  const readinessQuery = useQuery({
    queryKey: ['pe', 'signals', 'exit-readiness', holdingIdsKey],
    queryFn: () =>
      peSignalsService.getExitReadiness({
        holdingIds: holdings.map((h) => h.id).join(','),
      }),
    enabled: holdings.length > 0,
    staleTime: 60_000,
  });

  const readinessRows = readinessQuery.data?.rows;
  const readinessByHolding = useMemo(() => {
    const m = new Map<string, NonNullable<typeof readinessRows>[number]>();
    for (const r of readinessRows ?? []) m.set(r.holdingId, r);
    return m;
  }, [readinessRows]);

  const onSort = useCallback((column: PEHoldingSortBy) => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return column;
    });
  }, []);

  const exportCsv = useMutation({
    mutationFn: () =>
      peService.exportHoldings({
        search: search || undefined,
        status: statusFilter || undefined,
        firmId: firmId ?? (firmFilter || undefined),
        quality: quality === 'suspect' ? 'suspect' : undefined,
        sortBy,
        sortDir,
      }),
    onSuccess: () => toast.success('Holdings CSV downloaded.'),
    onError: () => toast.error('Could not export holdings.'),
  });

  const enrichDates = useMutation({
    mutationFn: () => peAdminService.runTrigger('enrich-investment-dates', { limit: 500 }),
    onSuccess: () => {
      setBanner('Investment date enrichment queued — refresh shortly to see updates.');
      void queryClient.invalidateQueries({ queryKey: ['pe', 'holdings'] });
    },
    onError: () => toast.error('Could not enqueue investment date enrichment.'),
  });

  const assignSectors = useMutation({
    mutationFn: () => peAdminService.runTrigger('assign-sectors', { limit: 300 }),
    onSuccess: () => {
      setBanner('Sector assignment queued — refresh shortly to see updates.');
      void queryClient.invalidateQueries({ queryKey: ['pe', 'holdings'] });
    },
    onError: () => toast.error('Could not enqueue sector assignment.'),
  });

  const emptyMessage =
    quality === 'suspect'
      ? 'No suspect-quality holdings — everything looks clean.'
      : 'No holdings found.';

  // Held in a const rather than inline so the deal-team sub-row can span `columns.length`.
  // The old hand-counted colSpan (14 / 15, branching on showFirmColumn) had to be edited by
  // hand whenever a column moved; deriving it from the array cannot drift.
  const columns: BaseTableColumn<PEHolding>[] = [
    {
      key: 'dealTeam',
      header: <span className="visually-hidden">Deal team</span>,
      headerClass: 'peh-th--expand',
      cellClass: 'peh-td--expand',
      render: (h) => {
        const isExpanded = expandedId === h.id;
        return (
          <button
            type="button"
            className="peh-expand"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Hide' : 'Show'} the deal team for ${h.companyName}`}
            onClick={() => setExpandedId(isExpanded ? null : h.id)}
          >
            <i
              className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}
              aria-hidden="true"
            />
          </button>
        );
      },
    },
    {
      key: 'companyName',
      header: 'Company',
      sortable: true,
      render: (h) => {
        const readiness = readinessByHolding.get(h.id);
        return (
          <TruncatedCell
            header="Company"
            value={h.companyName}
            href={h.websiteUrl || undefined}
            maxWidth="15rem"
            extra={
              <>
                {h.hasTeam && (
                  <i
                    className="bi bi-people-fill peh-company__team ms-1"
                    title="Has linked deal-team members"
                    aria-label="Has linked deal-team members"
                    role="img"
                  />
                )}
                <RowQualityBadge quality={h.quality} />
                {readiness && (
                  <ReadinessChip
                    tier={readiness.tier}
                    score={readiness.score}
                    reasons={readiness.reasons}
                  />
                )}
              </>
            }
          />
        );
      },
    },
    {
      key: 'tearsheet',
      header: 'Tear Sheet',
      render: (h) => (
        <Link
          to={openTearsheet(h.companyName, h.websiteUrl ?? undefined)}
          className="peh-btn peh-btn--pill"
          title="Request Tearsheet"
          data-testid="holding-tearsheet-request"
        >
          <i className="bi bi-file-earmark-text" aria-hidden="true" />
          Request
        </Link>
      ),
    },
    ...(showFirmColumn
      ? [
          {
            key: 'firmName',
            header: 'Firm',
            sortable: true,
            render: (h: PEHolding) => (
              <TruncatedCell
                header="Firm"
                value={h.firmName}
                linkTo={paths.pe.firm(h.firmId)}
                maxWidth="14rem"
              />
            ),
          },
        ]
      : []),
    {
      key: 'sector',
      header: 'Sector & Geo',
      sortable: true,
      render: (h) => (
        <div className="peh-sector">
          {h.sector ? (
            <span>
              {h.sector}
              {quality === 'suspect' && (
                <FieldQualityChips field={h.quality.fields.sector} label="Sector" />
              )}
            </span>
          ) : (
            <span className="peh-muted">—</span>
          )}
          {h.geography && (
            <span className="peh-geo">
              <i className="bi bi-geo-alt" aria-hidden="true" />
              {h.geography}
              {quality === 'suspect' && (
                <FieldQualityChips field={h.quality.fields.geography} label="Geography" />
              )}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'investmentStatus',
      header: 'Status',
      sortable: true,
      render: (h) =>
        h.investmentStatus ? (
          <Badge tone={STATUS_TONE[h.investmentStatus]}>{h.investmentStatus}</Badge>
        ) : (
          <Badge tone="secondary">unknown</Badge>
        ),
    },
    {
      key: 'investmentDate',
      header: 'Inv. Date',
      sortable: true,
      render: (h) => {
        const invSource = h.sources.investmentDate;
        return h.investmentDate ? (
          <span className="peh-date">
            {h.investmentDate}
            {invSource && (
              <i
                className={`bi ${invDateSourceIcon(invSource)} ${invDateSourceClass(invSource)}`}
                title={invDateSourceTitle(invSource)}
                aria-hidden="true"
              />
            )}
            {quality === 'suspect' && (
              <FieldQualityChips field={h.quality.fields.investmentDate} label="Inv. date" />
            )}
          </span>
        ) : (
          <span className="peh-muted">—</span>
        );
      },
    },
    {
      key: 'estimatedInvestment',
      // "Est. Investment" read as an estimated AMOUNT, so a date under it looked like a value
      // in the wrong column — especially since `Inv. Date` is empty on the same row whenever
      // this one is filled. The two are mutually exclusive by design: an AI estimate never
      // writes `investment_date` (that field is scrape/detail/operator only), so it is surfaced
      // here instead, with its confidence.
      header: 'Est. Inv. Date',
      sortable: true,
      render: (h) =>
        h.investmentDate ? (
          <span className="peh-muted">—</span>
        ) : formatEstimatedInvestment(h) ? (
          <span className="peh-est">
            {formatEstimatedInvestment(h)}
            {h.estimatedInvestmentConfidence != null && (
              <span className={confidenceClass(h.estimatedInvestmentConfidence)}>
                {formatConfidence(h.estimatedInvestmentConfidence)}
              </span>
            )}
          </span>
        ) : (
          <span className="peh-muted">—</span>
        ),
    },
    {
      key: 'websiteUrl',
      header: 'Website',
      render: (h) => (
        <>
          {h.websiteUrl ? (
            <a href={h.websiteUrl} target="_blank" rel="noreferrer" className="peh-web">
              <i className="bi bi-globe" aria-hidden="true" />
              <span className="peh-web__host">{safeHostname(h.websiteUrl)}</span>
            </a>
          ) : (
            <span className="peh-muted">—</span>
          )}
          {quality === 'suspect' && (
            <div>
              <FieldQualityChips field={h.quality.fields.websiteUrl} label="Website" />
            </div>
          )}
        </>
      ),
    },
    {
      key: 'peDetailUrl',
      header: 'PE Page',
      render: (h) =>
        h.peDetailUrl ? (
          <a href={h.peDetailUrl} target="_blank" rel="noreferrer" className="peh-web">
            <i className="bi bi-briefcase" aria-hidden="true" />
            View
          </a>
        ) : (
          <span className="peh-muted">—</span>
        ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (h) => {
        const fullDesc = h.description ?? '';
        const shortDesc = h.aiDescription
          ? h.aiDescription
          : fullDesc
            ? truncateDescription(fullDesc)
            : '';
        const fromAi = !!h.aiDescription && !fullDesc;
        return (
          <>
            {shortDesc ? (
              <span className="peh-desc" title={fullDesc || h.aiDescription || ''}>
                {shortDesc}
                {fromAi && <span className="peh-ai">AI</span>}
              </span>
            ) : (
              <span className="peh-muted">—</span>
            )}
            {quality === 'suspect' && (
              <FieldQualityChips field={h.quality.fields.description} label="Description" />
            )}
          </>
        );
      },
    },
    {
      key: 'products',
      header: 'Products & Services',
      render: (h) =>
        h.keyProductsServices.length > 0 ? (
          <ul className="peh-products">
            {h.keyProductsServices.slice(0, 6).map((p) => (
              <li key={p} title={p}>
                {p}
              </li>
            ))}
          </ul>
        ) : (
          <span className="peh-muted">—</span>
        ),
    },
    {
      key: 'keywords',
      header: 'Keywords',
      render: (h) =>
        h.aiKeywords.length > 0 ? (
          <div className="peh-keywords">
            {h.aiKeywords.slice(0, 5).map((kw) => (
              <span key={kw} className="peh-kw">
                {kw}
              </span>
            ))}
          </div>
        ) : (
          <span className="peh-muted">—</span>
        ),
    },
    {
      key: 'lastSeenAt',
      header: 'Last Seen',
      sortable: true,
      align: 'right',
      render: (h) =>
        h.lastSeenAt ? <StalenessChip date={h.lastSeenAt} /> : <span className="peh-muted">—</span>,
    },
    ...(isStaff
      ? [
          {
            key: 'actions' as const,
            header: 'Edit',
            align: 'right' as const,
            render: (h: PEHolding) => (
              <button
                type="button"
                className="peh-btn peh-btn--pill"
                onClick={() => setSelected(h)}
              >
                Edit
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="peh-scope">
      <div className="peh-toolbar">
        <div className="peh-toolbar__left">
          <div className="peh-search">
            <i className="bi bi-search peh-search__icon" aria-hidden="true" />
            <input
              id="holdings-search"
              type="search"
              className="peh-input"
              placeholder="Search companies or sectors…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search holdings"
            />
          </div>
        </div>
        {showPageChrome && (
          <div className="peh-toolbar__right">
            {isStaff && (
              <>
                <button
                  type="button"
                  className="peh-btn"
                  disabled={enrichDates.isPending}
                  onClick={() => enrichDates.mutate()}
                  title="Search the web for missing investment dates (500 per run)"
                >
                  <i
                    className={`bi ${enrichDates.isPending ? 'bi-arrow-repeat' : 'bi-calendar-search'}`}
                    aria-hidden="true"
                  />
                  {enrichDates.isPending ? 'Searching…' : 'Fill Investment Dates'}
                </button>
                <button
                  type="button"
                  className="peh-btn"
                  disabled={assignSectors.isPending}
                  onClick={() => assignSectors.mutate()}
                  title="AI-assign sectors to described companies without a sector (300 per run)"
                >
                  <i
                    className={`bi ${assignSectors.isPending ? 'bi-arrow-repeat' : 'bi-tag'}`}
                    aria-hidden="true"
                  />
                  {assignSectors.isPending ? 'Assigning…' : 'Assign Sectors'}
                </button>
              </>
            )}
            <button
              type="button"
              className="peh-btn"
              disabled={exportCsv.isPending || total === 0}
              onClick={() => exportCsv.mutate()}
            >
              <i className="bi bi-download" aria-hidden="true" />
              Download CSV
              {total > 0 && <span className="peh-muted">({total.toLocaleString()})</span>}
            </button>
          </div>
        )}
      </div>

      {showPageChrome && (
        <>
          <header className="peh-header">
            <nav className="peh-crumb" aria-label="Breadcrumb">
              <Link to={paths.pe.firms}>Private Equity</Link>
              <i className="bi bi-chevron-right" aria-hidden="true" />
              <span className="peh-crumb__current">All Holdings</span>
            </nav>
            <h1 className="peh-header__title">All Holdings</h1>
            <p className="peh-header__sub">
              Aggregated view of portfolio companies across all tracked firms.
            </p>
          </header>

          <div className="peh-stats" aria-label="Holdings coverage">
            {STAT_TILES.map((t) => (
              <div key={t.key} className="peh-stat">
                <p className="peh-stat__label">{t.label}</p>
                {statsQuery.data ? (
                  <p className={`peh-stat__value${t.tone ? ` ${t.tone}` : ''}`}>
                    {statsQuery.data[t.key].toLocaleString()}
                  </p>
                ) : (
                  <Skel w={48} h={24} />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {banner && (
        <div className="peh-banner d-flex align-items-center gap-2" role="status">
          <span className="flex-grow-1">{banner}</span>
          <button
            type="button"
            className="peh-btn peh-btn--pill"
            onClick={() => setBanner(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div className="peh-filters">
        {showFirmColumn && (
          <PillSelect
            className="peh-pill--firm"
            aria-label="Filter by firm"
            options={firmOptions}
            value={firmFilter}
            onChange={setFirmFilter}
          />
        )}
        <PillSelect
          className="peh-pill--status"
          aria-label="Status"
          options={[...STATUS_OPTIONS]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <PillSelect
          className="peh-pill--quality"
          aria-label="Data quality"
          options={[...QUALITY_OPTIONS]}
          value={quality}
          onChange={(v) => setQuality(v as QualityFilter)}
        />
      </div>

      <BaseTable<PEHolding>
        columns={columns}
        rows={holdings}
        getRowKey={(h) => h.id}
        loading={isPending}
        emptyMessage={emptyMessage}
        fetching={isFetching && !isPending}
        sortKey={sortBy}
        sortDir={sortDir}
        onSort={(col) => onSort(col as PEHoldingSortBy)}
        rowClass={(h) => (expandedId === h.id ? 'peh-row--expanded' : undefined)}
        isRowExpanded={(h) => expandedId === h.id}
        renderExpandedRow={(h) => (
          <td colSpan={columns.length} className="peh-td--panel">
            {/* Both panels share the one expander rather than adding a second column: the
                table is already 15 columns wide, and each panel fetches on its own so an
                unexpanded row still costs nothing. */}
            <DealTeamPanel holdingId={h.id} companyName={h.companyName} />
            <EnrichmentPanel holdingId={h.id} companyName={h.companyName} />
          </td>
        )}
      />

      <footer className="peh-footer">
        <p className="peh-footer__count">
          {total === 0
            ? 'No holdings'
            : `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total}`}
        </p>
        {totalPages > 1 && (
          <nav className="peh-pagination" aria-label="Holdings pagination">
            <button
              type="button"
              className="peh-btn"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="peh-muted">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="peh-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </footer>

      {isStaff && (
        <HoldingEditDrawer
          holding={selected}
          open={selected !== null}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
