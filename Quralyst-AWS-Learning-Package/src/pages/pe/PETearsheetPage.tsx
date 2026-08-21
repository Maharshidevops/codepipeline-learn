// PE Tearsheet page (F40.2) — create-on-mount, poll with backoff, stage progress, deck renderer.
// Query params: company (required to generate), website?, slide?. Gated by RoleRoute role="pe_dataset".
// Bare /pe/tearsheet shows a holdings search picker instead of a hard error.
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Spinner, TextInput } from '@/components/ui';
import { TearsheetDeck } from '@/components/pe/tearsheet/TearsheetDeck';
import { CostTooltip } from '@/components/pe/tearsheet/CostTooltip';
import { GammaExportProblemAlert } from '@/components/pe/tearsheet/GammaExportProblem';
import { useGammaExport } from '@/components/pe/tearsheet/useGammaExport';
import { useGammaRerun } from '@/components/pe/tearsheet/useGammaRerun';
import { peService, peTearsheetService } from '@/services/api';
import { buildTearsheetPath, openTearsheetViewer } from '@/lib/tearsheet/openTearsheet';
import { formatDateTime } from '@/lib/datetime';
import type {
  ApiError,
  PEHolding,
  Tearsheet,
  TearsheetStage,
  TearsheetStatus,
  TearsheetSummary,
} from '@/types';
import '@/styles/pages/tearsheet-picker.css';
import '@/styles/pages/tearsheet-loading.css';

const STAGE_LABEL: Record<string, string> = {
  pending: 'Queued — starting research pipeline',
  researching: 'Researching company across the web',
  synthesizing: 'Synthesizing tearsheet with AI',
  polishing: 'Polishing deck with Gamma',
};

const STAGE_PHASE_DETAIL: Record<string, string> = {
  pending: 'Spinning up providers and checking API keys / budget.',
  researching: 'Scraping and searching public sources in parallel.',
  synthesizing: 'An LLM is writing the dossier from research notes.',
  polishing: 'Gamma is laying out the polished PDF tearsheet.',
};

/** Mirrors backend STAGE_DEFS — shown immediately so regenerate never looks blank. */
const DEFAULT_STAGES: TearsheetStage[] = [
  {
    key: 'perplexity',
    label: 'Perplexity deep research',
    status: 'pending',
  },
  {
    key: 'brave',
    label: 'Brave web search',
    status: 'pending',
  },
  {
    key: 'serper',
    label: 'Serper news + knowledge graph',
    status: 'pending',
  },
  {
    key: 'coresignal',
    label: 'LinkedIn metrics (Coresignal / Apify)',
    status: 'pending',
  },
  {
    key: 'reviews',
    label: 'Review-site insights',
    status: 'pending',
  },
  {
    key: 'synthesis',
    label: 'LLM synthesis',
    status: 'pending',
  },
  {
    key: 'gamma',
    label: 'Gamma polished deck',
    status: 'pending',
  },
];

const STAGE_DETAIL: Record<string, string> = {
  perplexity: 'Deep web research via Perplexity for company overview and thesis.',
  brave: 'Brave Search for public pages, sites, and corroborating sources.',
  serper: 'Google news + knowledge graph via Serper for recent coverage.',
  coresignal: 'LinkedIn employee / follower signals via Coresignal or Apify.',
  reviews: 'Public review sites for customer sentiment and risk flags.',
  synthesis: 'LLM assembles the full tearsheet slides from research notes.',
  gamma: 'Gamma lays out the polished multi-page PDF from the research dossier.',
};

const STAGE_ICON: Record<string, string> = {
  perplexity: 'bi-search',
  brave: 'bi-globe2',
  serper: 'bi-newspaper',
  coresignal: 'bi-linkedin',
  reviews: 'bi-star',
  synthesis: 'bi-stars',
  gamma: 'bi-file-earmark-pdf',
};

const TERMINAL: TearsheetStatus[] = ['complete', 'failed', 'cancelled'];

const POLL_START_MS = 1500;
const POLL_MAX_MS = 10000;
const POLL_BACKOFF = 1.15;
const GAMMA_POLL_MS = 3000;

function gammaReady(row: Tearsheet | null | undefined): boolean {
  return row?.gammaStatus === 'complete' && !!row.gammaPdfReady;
}

function gammaGenerating(row: Tearsheet | null | undefined): boolean {
  return row?.gammaStatus === 'generating';
}

function gammaPolishing(row: Tearsheet | null | undefined): boolean {
  return (
    !!row && row.status === 'complete' && !!row.content && gammaGenerating(row) && !gammaReady(row)
  );
}

/** When polished is ready: open full-page viewer tab; keep a compact ready card here. */
function TearsheetReadyCard({ data }: { data: Tearsheet }) {
  const { pdfAvailable, pptxAvailable, problem, pending, download, retry } = useGammaExport(
    data.id,
    data.companyName,
    { load: true },
  );
  const { regeneratePdf, regenerating: regeneratingPdf } = useGammaRerun(data.id, retry);

  return (
    <div
      className="tearsheet-loading d-flex align-items-center justify-content-center min-vh-100 px-3"
      data-testid="tearsheet-ready-card"
    >
      <div
        className="card border-0 shadow-sm p-4 tearsheet-ready-card"
        style={{ maxWidth: 480, width: '100%', borderRadius: 16 }}
      >
        <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
          <span
            className="badge"
            style={{
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: 10,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Polished
          </span>
          {data.cost ? <CostTooltip cost={data.cost} /> : null}
        </div>
        <h1 className="h4 mb-1">{data.companyName}</h1>
        <p className="text-muted mb-4">
          Your polished tearsheet is ready. Open it in the full page to download, regenerate, or
          view the data version.
        </p>
        {problem ? (
          <GammaExportProblemAlert
            problem={problem}
            onRetry={retry}
            onRegenerate={regeneratePdf}
            regenerating={regeneratingPdf}
          />
        ) : null}
        <div className="d-grid gap-2">
          <Button
            variant="popup-primary"
            icon={<i className="bi bi-box-arrow-up-right" aria-hidden />}
            data-testid="tearsheet-open-full-page"
            onClick={() => openTearsheetViewer(data.id)}
          >
            Open tearsheet
          </Button>
          <Button
            variant="popup-secondary"
            icon={<i className="bi bi-file-earmark-pdf" aria-hidden />}
            onClick={() => download('pdf')}
            disabled={!pdfAvailable || !!pending}
            data-testid="tearsheet-download-gamma-pdf"
          >
            Download PDF
          </Button>
          {pptxAvailable ? (
            <Button
              variant="popup-secondary"
              icon={<i className="bi bi-file-earmark-slides" aria-hidden />}
              loading={pending === 'pptx'}
              onClick={() => download('pptx')}
              disabled={!!pending}
              data-testid="tearsheet-download-gamma-pptx"
            >
              Download PPTX
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Complete view: polished opens in a dedicated full-page tab (all actions live there). */
function CompleteView({
  data,
  initialSlide,
  regenerating,
  onRegenerate,
}: {
  data: Tearsheet;
  initialSlide: number;
  regenerating: boolean;
  onRegenerate: () => void | Promise<void>;
}) {
  const polished = gammaReady(data);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!polished || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    openTearsheetViewer(data.id);
  }, [polished, data.id]);

  if (polished) {
    return <TearsheetReadyCard data={data} />;
  }

  return (
    <TearsheetDeck
      data={data}
      initialSlide={initialSlide}
      regenerating={regenerating}
      onRegenerate={onRegenerate}
      polishedReady={false}
      gammaGenerating={gammaGenerating(data)}
    />
  );
}

/**
 * Survives React StrictMode remount: one create Promise per company key.
 * Each effect run re-attaches adopt/fail; cleanup only cancels that run's callbacks.
 */
const activeCreates = new Map<string, Promise<Tearsheet>>();

function createKey(company: string, website?: string): string {
  return `${company.toLowerCase()}::${(website ?? '').toLowerCase()}`;
}

/** Drop cached create Promise so a regenerate can start fresh research. */
function forgetActiveCreate(company: string, website?: string): void {
  activeCreates.delete(createKey(company, website));
}

/** Test-only reset for module-level create guard. */
export function __resetTearsheetCreateGuardForTests(): void {
  activeCreates.clear();
}

function mergeStages(remote?: TearsheetStage[]): TearsheetStage[] {
  if (!remote?.length) return DEFAULT_STAGES;
  const byKey = new Map(remote.map((s) => [s.key, s]));
  const merged = DEFAULT_STAGES.map((def) => {
    const hit = byKey.get(def.key);
    return hit ? { ...def, ...hit, label: hit.label || def.label } : def;
  });
  for (const s of remote) {
    if (!DEFAULT_STAGES.some((d) => d.key === s.key)) {
      merged.push(s);
    }
  }
  return merged;
}

/** While Gamma is polishing, keep the progress UI (don't flash the unfinished data deck). */
function stagesForLoading(data?: Tearsheet): TearsheetStage[] {
  const base = mergeStages(data?.stages);
  if (!gammaPolishing(data)) return base;
  const marked = base.map((s) => {
    if (s.key === 'gamma') {
      return {
        ...s,
        status: 'running' as const,
        message: 'Generating polished PDF…',
      };
    }
    const kind = stageDisplayKind(s);
    if (kind === 'pending' || kind === 'running') {
      return { ...s, status: 'complete' as const };
    }
    return s;
  });
  if (!marked.some((s) => s.key === 'gamma')) {
    marked.push({
      key: 'gamma',
      label: 'Polishing (Gamma)',
      status: 'running',
      message: 'Generating polished PDF…',
    });
  }
  return marked;
}

type StageDisplayKind = 'pending' | 'running' | 'complete' | 'skipped' | 'failed';

/** Skips were historically stored as complete + "Skipped — …"; treat both as skipped. */
function stageDisplayKind(stage: TearsheetStage): StageDisplayKind {
  const msg = (stage.message ?? '').trim().toLowerCase();
  const isSkip =
    msg.startsWith('skipped') ||
    msg.includes('skipped —') ||
    msg.includes('skipped -') ||
    msg === 'cancelled' ||
    msg.startsWith('cancelled');
  if (isSkip) return 'skipped';
  if (stage.status === 'failed') return 'failed';
  if (stage.status === 'complete') return 'complete';
  if (stage.status === 'running') return 'running';
  return 'pending';
}

function stageStatusLabel(kind: StageDisplayKind, message?: string): string {
  const msg = (message ?? '').trim().toLowerCase();
  switch (kind) {
    case 'running':
      return 'Running';
    case 'complete':
      return 'Done';
    case 'skipped':
      return msg.startsWith('cancelled') || msg === 'cancelled' ? 'Cancelled' : 'Skipped';
    case 'failed':
      return 'Error';
    default:
      return 'Waiting';
  }
}

function LoadingState({
  data,
  company,
  regenerating = false,
  cancelling = false,
  polishing = false,
  onCancel,
}: {
  data?: Tearsheet;
  company: string;
  regenerating?: boolean;
  cancelling?: boolean;
  polishing?: boolean;
  onCancel?: () => void;
}) {
  const status = polishing ? 'polishing' : (data?.status ?? 'pending');
  const stages = stagesForLoading(data);
  const kinds = stages.map(stageDisplayKind);
  const doneCount = kinds.filter(
    (k) => k === 'complete' || k === 'skipped' || k === 'failed',
  ).length;
  const progressPct = Math.max(4, Math.round((doneCount / stages.length) * 100));
  const running = stages.find((s) => stageDisplayKind(s) === 'running');
  const sourceCount = data?.sources?.length ?? 0;
  const canCancel =
    !!onCancel && !!data?.id && !String(data.id).startsWith('pending-') && !polishing;

  return (
    <div className="tearsheet-loading" data-testid="tearsheet-loading">
      <div className="tearsheet-loading-card">
        <div className="tearsheet-loading-head">
          <Spinner />
          <h1>
            {polishing
              ? 'Polishing tearsheet'
              : regenerating
                ? 'Regenerating tearsheet'
                : 'Generating tearsheet'}
          </h1>
          <p className="tearsheet-loading-company">{company}</p>
          <p className="tearsheet-loading-phase" data-testid="tearsheet-stage-header">
            {running ? `Now: ${running.label}` : (STAGE_LABEL[status] ?? 'Working…')}
          </p>
          <p className="tearsheet-loading-phase-detail">
            {running
              ? (STAGE_DETAIL[running.key] ?? running.message ?? 'In progress…')
              : (STAGE_PHASE_DETAIL[status] ?? 'Gathering research and building the dossier.')}
          </p>
          <div
            className="tearsheet-loading-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            aria-label="Tearsheet research progress"
          >
            <div className="tearsheet-loading-progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="tearsheet-loading-body">
          <ul className="tearsheet-loading-stages" data-testid="tearsheet-stages">
            {stages.map((s) => {
              const kind = stageDisplayKind(s);
              return (
                <li
                  key={s.key}
                  className={`tearsheet-loading-stage tearsheet-loading-stage--${kind}`}
                  data-testid={`tearsheet-stage-${s.key}`}
                  data-stage-kind={kind}
                >
                  <span className="tearsheet-loading-stage-icon" aria-hidden>
                    {kind === 'running' ? (
                      <Spinner size="sm" />
                    ) : kind === 'skipped' || kind === 'failed' ? (
                      <i className="bi bi-x-lg" />
                    ) : kind === 'complete' ? (
                      <i className="bi bi-check-lg" />
                    ) : (
                      <i className={`bi ${STAGE_ICON[s.key] ?? 'bi-circle'}`} />
                    )}
                  </span>
                  <div className="tearsheet-loading-stage-copy">
                    <span className="tearsheet-loading-stage-label">{s.label}</span>
                    <span className="tearsheet-loading-stage-detail">
                      {STAGE_DETAIL[s.key] ?? 'Research stage'}
                    </span>
                    {s.message ? (
                      <span className="tearsheet-loading-stage-message">{s.message}</span>
                    ) : null}
                  </div>
                  <span className="tearsheet-loading-stage-badge">
                    {stageStatusLabel(kind, s.message)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="tearsheet-loading-meta">
            <span>
              Stages {doneCount}/{stages.length}
            </span>
            <span>Sources collected: {sourceCount}</span>
            {data?.updatedAt ? <span>Last update {formatDateTime(data.updatedAt)}</span> : null}
          </div>
          <p className="tearsheet-loading-foot">
            {polishing
              ? 'Research is done — Gamma is producing the polished PDF. This usually takes under a minute.'
              : 'Research providers run in parallel, then LLM synthesis. This usually takes under a minute.'}
          </p>
          {canCancel ? (
            <div className="tearsheet-loading-actions">
              <Button
                variant="popup-secondary"
                onClick={onCancel}
                disabled={cancelling}
                data-testid="tearsheet-cancel"
              >
                {cancelling ? (
                  <>
                    <Spinner size="sm" />
                    <span className="ms-1">Cancelling…</span>
                  </>
                ) : (
                  'Cancel generation'
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function pendingSeed(
  from: Tearsheet | null | undefined,
  company: string,
  website?: string,
): Tearsheet {
  return {
    id: from?.id ?? `pending-${company}`,
    companyName: from?.companyName || company,
    website: from?.website || website,
    status: 'pending',
    stages: DEFAULT_STAGES.map((s) => ({ ...s })),
    sources: [],
    createdAt: from?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function dedupeHoldings(rows: PEHolding[]): PEHolding[] {
  const seen = new Set<string>();
  const out: PEHolding[] = [];
  for (const h of rows) {
    const key = h.companyName.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

function tearsheetGeneratedAt(row: TearsheetSummary): string | undefined {
  return row.updatedAt || row.createdAt || undefined;
}

function TearsheetCompanyPicker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftWebsite, setDraftWebsite] = useState('');
  const deferredQ = query.trim();

  const holdingsQ = useQuery({
    queryKey: ['pe-tearsheet-picker-holdings', deferredQ],
    queryFn: () =>
      peService.listHoldings({
        search: deferredQ || undefined,
        page: 0,
        pageSize: 40,
        sortBy: 'companyName',
        sortDir: 'asc',
      }),
    staleTime: 30_000,
  });

  const recentQ = useQuery({
    queryKey: ['pe-tearsheet-picker-recent'],
    queryFn: () => peTearsheetService.recent(),
    staleTime: 30_000,
  });

  const holdings = useMemo(
    () => dedupeHoldings(holdingsQ.data?.holdings ?? []).slice(0, 40),
    [holdingsQ.data?.holdings],
  );
  const recent = (recentQ.data ?? []).filter((r) => r.companyName?.trim());

  function selectCompany(name: string, website?: string | null) {
    const next = new URLSearchParams(searchParams);
    next.set('company', name.trim());
    if (website?.trim()) next.set('website', website.trim());
    else next.delete('website');
    next.delete('slide');
    setSearchParams(next);
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault();
    const name = draftName.trim();
    if (!name) return;
    selectCompany(name, draftWebsite.trim() || undefined);
  }

  return (
    <div
      className="container-fluid py-4 px-3 px-lg-4 tearsheet-picker-page"
      data-testid="tearsheet-picker"
    >
      <header className="tearsheet-picker-header">
        <div>
          <h1 className="h3 mb-1">Tearsheet</h1>
          <p className="text-muted mb-0">
            Reopen a recent dossier, pick a portfolio company, or generate for any name.
          </p>
        </div>
      </header>

      <div className="tearsheet-picker-layout">
        <section
          className="tearsheet-picker-panel tearsheet-picker-recent"
          aria-labelledby="tearsheet-recent-heading"
        >
          <div className="tearsheet-picker-panel-head">
            <h2 id="tearsheet-recent-heading">Recent tearsheets</h2>
            {recentQ.isFetching ? <Spinner size="sm" /> : null}
          </div>
          {recentQ.isError ? (
            <p className="tearsheet-picker-empty text-danger mb-0">
              Could not load recent tearsheets.
            </p>
          ) : recent.length === 0 ? (
            <p className="tearsheet-picker-empty mb-0" data-testid="tearsheet-recent-empty">
              No tearsheets yet. Generate one from a holding or the form on the right.
            </p>
          ) : (
            <ul className="tearsheet-picker-recent-grid" data-testid="tearsheet-recent">
              {recent.slice(0, 12).map((r: TearsheetSummary) => {
                const generatedAt = tearsheetGeneratedAt(r);
                return (
                  <li key={r.id}>
                    <Link
                      className="tearsheet-picker-recent-card"
                      to={buildTearsheetPath(r.companyName, r.website)}
                      data-testid="tearsheet-recent-card"
                    >
                      <span className="tearsheet-picker-recent-name">{r.companyName}</span>
                      {r.oneLiner ? (
                        <p className="tearsheet-picker-recent-line">{r.oneLiner}</p>
                      ) : null}
                      <div className="tearsheet-picker-recent-meta">
                        <span
                          className={`tearsheet-picker-status tearsheet-picker-status--${r.status}`}
                        >
                          {r.status}
                        </span>
                        {generatedAt ? (
                          <time dateTime={generatedAt} data-testid="tearsheet-recent-generated">
                            Generated {formatDateTime(generatedAt)}
                          </time>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="tearsheet-picker-panel tearsheet-picker-holdings"
          aria-labelledby="tearsheet-holdings-heading"
        >
          <div className="tearsheet-picker-panel-head">
            <h2 id="tearsheet-holdings-heading">Portfolio companies</h2>
            {holdingsQ.isFetching ? <Spinner size="sm" /> : null}
          </div>
          <div className="tearsheet-picker-holdings-search">
            <TextInput
              label="Search holdings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company or sector…"
              data-testid="tearsheet-picker-search"
            />
          </div>
          {holdingsQ.isError ? (
            <p className="tearsheet-picker-empty text-danger mb-0">Could not load holdings.</p>
          ) : holdings.length === 0 ? (
            <p className="tearsheet-picker-empty mb-0" data-testid="tearsheet-picker-empty">
              No holdings match. Import/scrape PE firms first, or enter a company on the right.
            </p>
          ) : (
            <ul className="tearsheet-picker-holdings-list" data-testid="tearsheet-picker-list">
              {holdings.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="tearsheet-picker-holdings-row"
                    onClick={() => selectCompany(h.companyName, h.websiteUrl)}
                    data-testid="tearsheet-picker-row"
                  >
                    <span className="tearsheet-picker-holdings-name">{h.companyName}</span>
                    <span className="tearsheet-picker-holdings-meta">
                      {[h.firmName, h.sector, h.geography].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="tearsheet-picker-panel tearsheet-picker-custom"
          aria-labelledby="tearsheet-custom-heading"
        >
          <div className="tearsheet-picker-panel-head">
            <h2 id="tearsheet-custom-heading">Generate for any company</h2>
          </div>
          <div className="tearsheet-picker-panel-body">
            <p className="small text-muted mb-0">
              Use a free-text name when the company is not in the holdings book.
            </p>
            <form onSubmit={submitCustom}>
              <TextInput
                label="Company name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Acme Corp"
                required
                data-testid="tearsheet-custom-name"
              />
              <TextInput
                label="Website (optional)"
                value={draftWebsite}
                onChange={(e) => setDraftWebsite(e.target.value)}
                placeholder="https://…"
                data-testid="tearsheet-custom-website"
              />
              <div className="tearsheet-picker-custom-actions">
                <Button type="submit" className="w-100" data-testid="tearsheet-custom-submit">
                  Open tearsheet
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PETearsheetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const company = searchParams.get('company')?.trim() ?? '';
  const website = searchParams.get('website')?.trim() || undefined;
  const slideRaw = searchParams.get('slide');
  const slideParsed = slideRaw ? parseInt(slideRaw, 10) : NaN;
  const initialSlide = Number.isFinite(slideParsed) ? Math.max(0, slideParsed - 1) : 0;

  const [id, setId] = useState<string | null>(null);
  const [seed, setSeed] = useState<Tearsheet | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [regenMode, setRegenMode] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const queryClient = useQueryClient();
  const pollAttemptRef = useRef(0);
  /** Timestamp when the current regenerate/force-create started; ignores older completes. */
  const regenStartedAtRef = useRef(0);

  const beginFreshRun = (next: Tearsheet) => {
    forgetActiveCreate(company, website);
    pollAttemptRef.current = 0;
    setCreateError(null);
    setSeed(next);
    setId(next.id);
    queryClient.setQueryData(['pe-tearsheet', next.id], next);
    // Keep Map in sync so StrictMode remount adopts the in-flight regenerate.
    activeCreates.set(createKey(company, website), Promise.resolve(next));
    // Soft refetch (not invalidate) so stages update quickly without dropping the
    // optimistic pending cache if the request is briefly slow.
    void queryClient.refetchQueries({ queryKey: ['pe-tearsheet', next.id] });
  };

  const showOptimisticProgress = (from: Tearsheet | null | undefined) => {
    const optimistic = pendingSeed(from, company, website);
    pollAttemptRef.current = 0;
    regenStartedAtRef.current = Date.now();
    setCreateError(null);
    setSeed(optimistic);
    if (from?.id) {
      setId(from.id);
      queryClient.setQueryData(['pe-tearsheet', from.id], optimistic);
    }
  };

  useEffect(() => {
    if (!company) return;
    const key = createKey(company, website);

    // Important: do NOT gate on a startedRef. React StrictMode runs effect → cleanup →
    // effect again on the same mount; a startedRef would skip re-attaching adopt after
    // cleanup cancelled the first callback, leaving the page stuck on "Queued" forever.
    let cancelled = false;
    const adopt = (row: Tearsheet) => {
      if (cancelled) return;
      // Never let a stale create/reuse "complete" clobber an in-flight regenerate.
      if (regenStartedAtRef.current) {
        const updated = Date.parse(row.updatedAt || '');
        if (
          row.status === 'complete' &&
          (!Number.isFinite(updated) || updated < regenStartedAtRef.current - 1500)
        ) {
          return;
        }
      }
      setSeed(row);
      setId(row.id);
      setCreateError(null);
    };
    const fail = (err: unknown) => {
      if (cancelled) return;
      const apiErr = err as ApiError;
      setCreateError(apiErr?.message || 'Failed to start tearsheet generation.');
    };

    let pending = activeCreates.get(key);
    if (!pending) {
      pending = peTearsheetService.create({ companyName: company, website }).catch((err) => {
        activeCreates.delete(key);
        throw err;
      });
      activeCreates.set(key, pending);
    }
    pending.then(adopt, fail);

    return () => {
      cancelled = true;
    };
  }, [company, website]);

  const pollInterval = useMemo(() => {
    return (attempt: number) =>
      Math.min(Math.round(POLL_START_MS * POLL_BACKOFF ** attempt), POLL_MAX_MS);
  }, []);

  const { data, error, isFetching } = useQuery({
    queryKey: ['pe-tearsheet', id],
    queryFn: () => peTearsheetService.get(id!),
    enabled: !!id,
    // Always refetch while mounted once status leaves a terminal state; avoid
    // serving a cached complete from before regenerate.
    staleTime: 0,
    refetchInterval: (query) => {
      const row = query.state.data as Tearsheet | undefined;
      // Keep polling while Gamma is still generating after research complete.
      if (row?.status === 'complete' && row.content && gammaGenerating(row)) {
        return GAMMA_POLL_MS;
      }
      if (row && TERMINAL.includes(row.status) && row.content) return false;
      // Keep polling complete-without-content (regen race) and all in-flight statuses.
      if (row?.status === 'complete' && !row.content) {
        return pollInterval(pollAttemptRef.current);
      }
      if (row && TERMINAL.includes(row.status)) return false;
      const ms = pollInterval(pollAttemptRef.current);
      if (row) pollAttemptRef.current += 1;
      return ms;
    },
  });

  useEffect(() => {
    if (data?.companyName) document.title = `${data.companyName} — Tearsheet`;
  }, [data?.companyName]);

  // Keep seed aligned with live poll data while in flight / when a fresh complete arrives.
  useEffect(() => {
    if (!data) return;
    if (!TERMINAL.includes(data.status)) {
      setSeed(data);
      return;
    }
    if (data.status === 'complete' && data.content) {
      const updated = Date.parse(data.updatedAt || '');
      if (
        regenStartedAtRef.current &&
        Number.isFinite(updated) &&
        updated < regenStartedAtRef.current - 1500
      ) {
        // Stale complete from before this regenerate — ignore.
        return;
      }
      regenStartedAtRef.current = 0;
      setSeed(data);
      setRegenMode(false);
      return;
    }
    if (data.status === 'failed' || data.status === 'cancelled') {
      regenStartedAtRef.current = 0;
      setSeed(data);
      setRegenMode(false);
    }
  }, [data]);

  if (!company) {
    return <TearsheetCompanyPicker />;
  }

  const goToPicker = () => {
    forgetActiveCreate(company, website);
    regenStartedAtRef.current = 0;
    setId(null);
    setSeed(null);
    setCreateError(null);
    setRegenMode(false);
    setCancelling(false);
    navigate('/pe/tearsheet', { replace: true });
  };

  const cancelGeneration = async () => {
    const tearsheetId = id ?? seed?.id ?? data?.id;
    if (!tearsheetId || String(tearsheetId).startsWith('pending-') || cancelling) return;
    setCancelling(true);
    try {
      const next = await peTearsheetService.cancel(tearsheetId);
      queryClient.setQueryData(['pe-tearsheet', tearsheetId], next);
      forgetActiveCreate(company, website);
      void queryClient.invalidateQueries({ queryKey: ['pe-tearsheet-picker-recent'] });
      goToPicker();
    } catch (err) {
      const apiErr = err as ApiError;
      setCreateError(apiErr?.message || 'Failed to cancel tearsheet.');
      setCancelling(false);
    }
  };

  const regenerate = async (tearsheetId: string) => {
    if (retrying) return;
    setRetrying(true);
    setRegenMode(true);
    // Switch to the progress UI immediately — don't wait for the rerun round-trip.
    showOptimisticProgress(data ?? seed);
    try {
      const next = await peTearsheetService.rerun(tearsheetId);
      beginFreshRun(next);
    } catch (err) {
      const apiErr = err as ApiError;
      setCreateError(apiErr?.message || 'Failed to regenerate tearsheet.');
      setRegenMode(false);
      regenStartedAtRef.current = 0;
    } finally {
      setRetrying(false);
    }
  };

  const forceCreate = async () => {
    if (retrying) return;
    setRetrying(true);
    setRegenMode(true);
    showOptimisticProgress(data ?? seed);
    try {
      forgetActiveCreate(company, website);
      const next = await peTearsheetService.create({
        companyName: company,
        website,
        force: true,
      });
      beginFreshRun(next);
    } catch (err) {
      const apiErr = err as ApiError;
      setCreateError(apiErr?.message || 'Failed to regenerate tearsheet.');
      setRegenMode(false);
      regenStartedAtRef.current = 0;
    } finally {
      setRetrying(false);
    }
  };

  const isStaleComplete = (row: Tearsheet | null | undefined): boolean => {
    if (!row || row.status !== 'complete') return false;
    if (!row.content) return true;
    if (!regenStartedAtRef.current) return false;
    const updated = Date.parse(row.updatedAt || '');
    return Number.isFinite(updated) && updated < regenStartedAtRef.current - 1500;
  };

  // Prefer in-flight seed over a stale terminal `data` (regen race / out-of-order GET).
  const row: Tearsheet | null | undefined = (() => {
    if (seed && !TERMINAL.includes(seed.status)) {
      if (!data || TERMINAL.includes(data.status) || isStaleComplete(data)) return seed;
      return data;
    }
    if (data && !isStaleComplete(data)) return data;
    return seed ?? data;
  })();

  const awaitingFreshComplete =
    !!row && row.status === 'complete' && (!row.content || isStaleComplete(row));

  const polishing = gammaPolishing(row);

  const inFlight =
    retrying ||
    regenMode ||
    cancelling ||
    awaitingFreshComplete ||
    polishing ||
    (!!row && !TERMINAL.includes(row.status) && !createError);

  if (inFlight) {
    return (
      <LoadingState
        data={
          polishing
            ? (row ?? undefined)
            : row && !TERMINAL.includes(row.status)
              ? row
              : (seed ?? row ?? undefined)
        }
        company={company}
        regenerating={regenMode}
        cancelling={cancelling}
        polishing={polishing}
        onCancel={() => void cancelGeneration()}
      />
    );
  }

  if (row?.status === 'cancelled') {
    return (
      <div
        className="d-flex align-items-center justify-content-center min-vh-100 bg-light px-3"
        data-testid="tearsheet-cancelled"
      >
        <div className="card text-center p-4" style={{ maxWidth: 480 }}>
          <h1 className="h4">Generation cancelled</h1>
          <p className="text-muted mb-3">{company}</p>
          <Button onClick={goToPicker} data-testid="tearsheet-cancelled-back">
            Back to tearsheets
          </Button>
        </div>
      </div>
    );
  }

  // Only hard-fail when we are not mid-run. Ignore transient poll errors while seeded.
  const failed = row?.status === 'failed' || !!createError || (!!error && !seed && !isFetching);

  if (failed) {
    const msg =
      createError ||
      row?.errorMessage ||
      (error as Error | undefined)?.message ||
      'Generation failed.';
    const canRerun = !!row?.id && !String(row.id).startsWith('pending-');
    return (
      <div
        className="d-flex align-items-center justify-content-center min-vh-100 bg-light px-3"
        data-testid="tearsheet-error"
      >
        <div className="card border-danger text-center p-4" style={{ maxWidth: 480 }}>
          <i className="bi bi-exclamation-triangle text-danger fs-2" aria-hidden />
          <h1 className="h4 mt-3">Couldn&apos;t generate tearsheet</h1>
          <p className="text-muted mb-0">{company}</p>
          <div className="alert alert-danger small mt-3 mb-3 text-start">{msg}</div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={retrying}
            data-testid="tearsheet-retry"
            onClick={() => (canRerun ? regenerate(row!.id) : forceCreate())}
          >
            {retrying ? 'Starting…' : 'Try again'}
          </button>
        </div>
      </div>
    );
  }

  if (row?.status === 'complete' && row.content) {
    return (
      <CompleteView
        data={row}
        initialSlide={initialSlide}
        regenerating={retrying}
        onRegenerate={() => regenerate(row.id)}
      />
    );
  }

  return (
    <LoadingState
      data={row ?? undefined}
      company={company}
      regenerating={regenMode}
      cancelling={cancelling}
      onCancel={() => void cancelGeneration()}
    />
  );
}
