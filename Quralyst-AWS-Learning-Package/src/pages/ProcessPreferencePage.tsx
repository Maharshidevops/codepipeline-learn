// ProcessPreferencePage — Research Home (parity with Replit quralyst/Home.tsx).
// Mandate launcher → parse & route to Target / Strategic / PE builders; recent lists + private
// market news; quick-start cards; company tearsheet. Responsive (Replit desktop UI + mobile stack).
// Do not change the sidebar — another agent owns that.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useConfirm } from '@/hooks/useConfirm';
import {
  homeNewsService,
  mandateService,
  preferencesService,
  processService,
  resultsService,
} from '@/services/api';
import {
  clearComposerHandoff,
  storeComposerPrefill,
  storeComposerSeed,
} from '@/features/research/composerPrefill';
import { buildTearsheetPath } from '@/lib/tearsheet/openTearsheet';
import { paths } from '@/routes/paths';
import type { ResultSummary } from '@/types';
import '@/styles/pages/process-preference.css';

type ListKind = 'buyer' | 'target';

interface RecentList {
  id: string;
  name: string;
  meta: string;
  count: number;
  kind: ListKind;
  typeLabel: string;
  href: string;
  ts: number;
}

const QUICK_START: { title: string; sub: string; icon: string; path: string }[] = [
  {
    title: 'Strategic buyer list',
    sub: 'Corporates + strategics',
    icon: 'bi-people',
    path: paths.strategic,
  },
  {
    title: 'PE / financial buyer list',
    sub: 'Funds, sponsors, family offices',
    icon: 'bi-pie-chart',
    path: paths.financialVerticals,
  },
  {
    title: 'Target list',
    sub: 'Corporates',
    icon: 'bi-bullseye',
    path: paths.targetList,
  },
];

const SEARCH_CHIPS: { label: string; path: string; prompt: string }[] = [
  {
    label: 'Strategic buyers · healthcare IT',
    path: paths.strategic,
    prompt: 'Strategic buyers for a healthcare IT company with $3-6M EBITDA',
  },
  {
    label: 'PE buyers · manufacturing',
    path: paths.financialVerticals,
    prompt: 'Lower-middle-market manufacturing company in the Southeast US',
  },
  {
    label: 'Add-on targets · dental services',
    path: paths.targetList,
    prompt: 'Acquisition targets for a PE-backed dental services platform looking for add-ons',
  },
  {
    label: 'Targets · B2B SaaS $2M ARR',
    path: paths.targetList,
    prompt: 'B2B SaaS companies with around $2M ARR',
  },
];

const MAX_ATTACHMENTS = 5;
const MAX_FILE_MB = 8;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ATTACH_ACCEPT = '.pdf,.docx,.xlsx,.xls,.csv,.txt';

const MODE_PATH: Record<string, string> = {
  target: paths.targetList,
  strategic: paths.strategic,
  financial: paths.financialVerticals,
};

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function tsOf(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function resultHref(
  tab: 'target-list' | 'strategic-buyer' | 'fv-results',
  r: ResultSummary,
): string {
  if (tab === 'fv-results') {
    const id = r.resultId || r.processId;
    return paths.financialVerticalsResults(id);
  }
  return paths.viewResult(r.processId);
}

declare global {
  interface Window {
    gptApiIssue?: boolean;
  }
}

export default function ProcessPreferencePage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const ranGate = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mandate, setMandate] = useState('');
  const [parsing, setParsing] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachError, setAttachError] = useState('');
  const [tsName, setTsName] = useState('');
  const [tsWebsite, setTsWebsite] = useState('');

  // GPT key gate (existing behaviour) — skip when a run is already in progress.
  useEffect(() => {
    if (ranGate.current) return;
    ranGate.current = true;
    (async () => {
      try {
        const active = await processService.getActiveProcessing();
        if (active.active && !active.completed) return;
      } catch {
        /* fall through */
      }
      try {
        const result = await preferencesService.testGptKey();
        if (!result.success) {
          const go = await confirm({
            title: 'GPT API Configuration Required',
            message: result.message,
            confirmText: 'Configure API Key',
            cancelText: 'Continue Anyway',
          });
          if (go) navigate(paths.settings.apiKeys);
          else window.gptApiIssue = true;
        }
      } catch {
        const go = await confirm({
          title: 'GPT API Configuration Required',
          message: 'Failed to validate GPT API key. Please check your configuration.',
          confirmText: 'Configure API Key',
          cancelText: 'Continue Anyway',
        });
        if (go) navigate(paths.settings.apiKeys);
        else window.gptApiIssue = true;
      }
    })();
  }, [confirm, navigate]);

  const { data: active } = useQuery({
    queryKey: ['research-home', 'active-processing'],
    queryFn: () => processService.getActiveProcessing(),
    refetchInterval: 5000,
  });

  const {
    data: news,
    isLoading: newsLoading,
    isError: newsError,
  } = useQuery({
    queryKey: ['research-home', 'news'],
    queryFn: () => homeNewsService.getNews(),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const listOpts = { page: 1, sortBy: 'newest', timeRange: 'all', userFilter: 'me' } as const;

  const {
    data: targetRes,
    isLoading: targetLoading,
    isError: targetError,
  } = useQuery({
    queryKey: ['research-home', 'results', 'target-list'],
    queryFn: () => resultsService.list('target-list', listOpts),
    staleTime: 60 * 1000,
  });
  const {
    data: strategicRes,
    isLoading: strategicLoading,
    isError: strategicError,
  } = useQuery({
    queryKey: ['research-home', 'results', 'strategic-buyer'],
    queryFn: () => resultsService.list('strategic-buyer', listOpts),
    staleTime: 60 * 1000,
  });
  const {
    data: fvRes,
    isLoading: fvLoading,
    isError: fvError,
  } = useQuery({
    queryKey: ['research-home', 'results', 'fv-results'],
    queryFn: () => resultsService.list('fv-results', listOpts),
    staleTime: 60 * 1000,
  });

  const listsLoading = targetLoading || strategicLoading || fvLoading;
  const allListsError = targetError && strategicError && fvError;

  const targetTotal = targetRes?.pagination.totalResults ?? 0;
  const strategicTotal = strategicRes?.pagination.totalResults ?? 0;
  const fvTotal = fvRes?.pagination.totalResults ?? 0;
  const totalLists = targetTotal + strategicTotal + fvTotal;
  const buyerLists = strategicTotal + fvTotal;

  const recentLists: RecentList[] = useMemo(() => {
    const rows: RecentList[] = [];
    (targetRes?.results ?? []).forEach((r) => {
      rows.push({
        id: `t-${r.processId}`,
        name: r.resultFilename || 'Target list',
        meta: `Target discovery · ${timeAgo(r.createdAt)}`,
        count: r.totalMatches ?? 0,
        kind: 'target',
        typeLabel: 'Targets',
        href: resultHref('target-list', r),
        ts: tsOf(r.createdAt),
      });
    });
    (strategicRes?.results ?? []).forEach((r) => {
      rows.push({
        id: `s-${r.processId}`,
        name: r.resultFilename || 'Strategic buyer list',
        meta: `Strategic buyers · ${timeAgo(r.createdAt)}`,
        count: r.totalMatches ?? 0,
        kind: 'buyer',
        typeLabel: 'Buyers',
        href: resultHref('strategic-buyer', r),
        ts: tsOf(r.createdAt),
      });
    });
    (fvRes?.results ?? []).forEach((r) => {
      rows.push({
        id: `f-${r.resultId || r.processId}`,
        name: 'Financials buyer list',
        meta: `PE / financial buyers · ${timeAgo(r.createdAt)}`,
        count: r.totalCount ?? r.totalMatches ?? 0,
        kind: 'buyer',
        typeLabel: 'Buyers',
        href: resultHref('fv-results', r),
        ts: tsOf(r.createdAt),
      });
    });
    return rows.sort((a, b) => b.ts - a.ts).slice(0, 6);
  }, [targetRes, strategicRes, fvRes]);

  const companiesInRecent = recentLists.reduce((sum, r) => sum + (r.count || 0), 0);

  const isRunning = Boolean(active?.active && active.processId && !active.completed);
  const runPct = Math.max(0, Math.min(100, Math.round(active?.overallPercentage ?? 0)));
  const runHref =
    active?.processType === 'financial_verticals'
      ? paths.financialVerticals
      : active?.processType === 'strategic_buyer_list'
        ? paths.strategic
        : paths.targetList;
  const runStage =
    active?.currentStageName ||
    active?.activityMessage ||
    active?.currentStage ||
    active?.message ||
    'Working';

  const newsItems = news?.items ?? [];

  const launch = (path: string, prompt?: string) => {
    clearComposerHandoff();
    if (prompt?.trim()) storeComposerSeed(prompt.trim());
    navigate(path);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setAttachError('');
    const next = [...attachments];
    for (const f of Array.from(incoming)) {
      if (f.size > MAX_FILE_BYTES) {
        setAttachError(`"${f.name}" is over ${MAX_FILE_MB}MB and was skipped.`);
        continue;
      }
      if (next.some((e) => e.name === f.name && e.size === f.size)) continue;
      if (next.length >= MAX_ATTACHMENTS) {
        setAttachError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
        break;
      }
      next.push(f);
    }
    setAttachments(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    setAttachError('');
  };

  const hasInput = mandate.trim().length > 0 || attachments.length > 0;

  const runMandate = async (text: string, fallbackPath: string = paths.targetList) => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || parsing) return;
    setParsing(true);
    try {
      const prefill = await mandateService.parseMandate({
        text: trimmed,
        files: attachments,
      });
      storeComposerPrefill(prefill);
      navigate(MODE_PATH[prefill.mode ?? 'target'] ?? fallbackPath);
    } catch {
      if (attachments.length > 0) {
        setAttachError(
          "Couldn't read the mandate with the provided context. Try again or remove some items.",
        );
      } else {
        launch(fallbackPath, trimmed);
      }
    } finally {
      setParsing(false);
    }
  };

  const openTs = () => {
    const name = tsName.trim();
    if (!name) return;
    window.open(
      buildTearsheetPath(name, tsWebsite.trim() || undefined),
      '_blank',
      'noopener,noreferrer',
    );
  };

  const fmt = (value: number, errored: boolean): string => (errored ? '—' : value.toLocaleString());
  const metrics = [
    {
      label: 'Lists generated',
      display: fmt(totalLists, targetError || strategicError || fvError),
      sub: 'All time',
      icon: 'bi-list-ul',
    },
    {
      label: 'Companies in recent lists',
      display: fmt(companiesInRecent, allListsError),
      sub: 'Across latest runs',
      icon: 'bi-building',
    },
    {
      label: 'Buyer lists',
      display: fmt(buyerLists, strategicError || fvError),
      sub: 'Strategic + PE',
      icon: 'bi-people',
    },
    {
      label: 'Target lists',
      display: fmt(targetTotal, targetError),
      sub: 'Discovery',
      icon: 'bi-bullseye',
    },
  ];

  return (
    <div className="rh-page">
      <header className="rh-header">
        <p className="rh-eyebrow">Quralyst Research</p>
        <h1 className="rh-title">Research home</h1>
        <p className="rh-subtitle">
          Describe a mandate to build a buyer or target list, or pick up where you left off.
        </p>
      </header>

      {/* Mandate launcher */}
      <section className="rh-mandate" aria-labelledby="rh-mandate-label">
        <label id="rh-mandate-label" htmlFor="rh-mandate-input" className="rh-mandate-label">
          What are you working on?
        </label>
        <div className="rh-mandate-bar">
          <i className="bi bi-stars rh-mandate-spark" aria-hidden="true" />
          <input
            id="rh-mandate-input"
            type="text"
            value={mandate}
            onChange={(e) => setMandate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runMandate(mandate);
            }}
            disabled={parsing}
            placeholder="Describe a mandate — industry, size, geography — and build a list..."
            className="rh-mandate-input"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ATTACH_ACCEPT}
            onChange={(e) => addFiles(e.target.files)}
            className="d-none"
            aria-hidden="true"
          />
          <button
            type="button"
            className="rh-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing || attachments.length >= MAX_ATTACHMENTS}
            title="Attach documents (PDF, Word, Excel, CSV)"
            aria-label="Attach documents"
          >
            <i className="bi bi-paperclip" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rh-build-btn"
            onClick={() => void runMandate(mandate)}
            disabled={parsing || !hasInput}
          >
            {parsing ? (
              <>
                Reading
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
              </>
            ) : (
              <>
                Build list
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </>
            )}
          </button>
        </div>

        {attachments.length > 0 && (
          <div className="rh-attachments">
            {attachments.map((f, i) => (
              <span key={`${f.name}-${f.size}-${i}`} className="rh-attach-chip">
                <i className="bi bi-file-earmark-text" aria-hidden="true" />
                <span className="rh-attach-name">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={parsing}
                  aria-label={`Remove ${f.name}`}
                  className="rh-attach-remove"
                >
                  <i className="bi bi-x" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
        {attachError && <p className="rh-error">{attachError}</p>}

        <div className="rh-chips">
          {SEARCH_CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              className="rh-chip"
              onClick={() => void runMandate(c.prompt, c.path)}
              disabled={parsing}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <div className="rh-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="rh-metric-card">
            <div className="rh-metric-label">
              <i className={`bi ${m.icon}`} aria-hidden="true" />
              {m.label}
            </div>
            <div className="rh-metric-value">
              {listsLoading ? <span className="rh-skeleton rh-skeleton--num" /> : m.display}
            </div>
            <div className="rh-metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* In-progress banner — pass the live snapshot so the composer paints ProgressView immediately */}
      {isRunning && (
        <button
          type="button"
          className="rh-running"
          onClick={() => navigate(runHref, { state: { resumeActive: active } })}
        >
          <div className="rh-running-icon">
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          </div>
          <div className="rh-running-body">
            <div className="rh-running-row">
              <p className="rh-running-title">A research run is in progress</p>
              <span className="rh-running-pct">{runPct}%</span>
            </div>
            <p className="rh-running-stage">{runStage}</p>
            <div className="rh-running-bar" aria-hidden="true">
              <div className="rh-running-bar-fill" style={{ width: `${runPct}%` }} />
            </div>
          </div>
          <i className="bi bi-arrow-right rh-running-chevron" aria-hidden="true" />
        </button>
      )}

      {/* Recent lists + News */}
      <div className="rh-split">
        <section className="rh-panel">
          <div className="rh-panel-head">
            <div className="rh-panel-title">
              <i className="bi bi-clock" aria-hidden="true" />
              <h2>Recent lists</h2>
            </div>
            <Link to={paths.previousResults} className="rh-view-all">
              View all <i className="bi bi-chevron-right" aria-hidden="true" />
            </Link>
          </div>
          <div className="rh-panel-body">
            {listsLoading ? (
              <div className="rh-skel-stack">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="rh-skeleton rh-skeleton--row" />
                ))}
              </div>
            ) : allListsError ? (
              <p className="rh-empty">
                Couldn&apos;t load your lists right now. Try again shortly.
              </p>
            ) : recentLists.length === 0 ? (
              <div className="rh-empty-block">
                <p className="rh-empty">No lists yet.</p>
                <button
                  type="button"
                  className="rh-link-btn"
                  onClick={() => launch(paths.targetList)}
                >
                  Build your first list
                </button>
              </div>
            ) : (
              <ul className="rh-list">
                {recentLists.map((r) => (
                  <li key={r.id}>
                    <button type="button" className="rh-list-row" onClick={() => navigate(r.href)}>
                      <span
                        className={`rh-list-icon ${r.kind === 'buyer' ? 'rh-list-icon--buyer' : 'rh-list-icon--target'}`}
                      >
                        <i
                          className={`bi ${r.kind === 'buyer' ? 'bi-people' : 'bi-bullseye'}`}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="rh-list-copy">
                        <span className="rh-list-name">{r.name}</span>
                        <span className="rh-list-meta">{r.meta}</span>
                      </span>
                      <span className="rh-list-count">{r.count}</span>
                      <span
                        className={`rh-badge ${r.kind === 'buyer' ? 'rh-badge--buyer' : 'rh-badge--target'}`}
                      >
                        {r.typeLabel}
                      </span>
                      <i className="bi bi-chevron-right rh-list-chevron" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rh-panel">
          <div className="rh-panel-head">
            <div className="rh-panel-title">
              <i className="bi bi-newspaper" aria-hidden="true" />
              <h2>Private Market News</h2>
            </div>
          </div>
          <div className="rh-panel-body rh-panel-body--news">
            {newsLoading ? (
              <div className="rh-skel-stack">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="rh-skeleton rh-skeleton--row" />
                ))}
              </div>
            ) : newsError ? (
              <p className="rh-empty">Couldn&apos;t load news right now. Try again shortly.</p>
            ) : newsItems.length === 0 ? (
              <p className="rh-empty">No recent headlines available.</p>
            ) : (
              <ul className="rh-news">
                {newsItems.slice(0, 6).map((n, i) => (
                  <li key={`${n.url}-${i}`}>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rh-news-item"
                    >
                      <p className="rh-news-title">{n.title}</p>
                      <p className="rh-news-meta">
                        {n.source && <span className="rh-news-source">{n.source}</span>}
                        {n.source && n.age && <span className="rh-news-dot">·</span>}
                        {n.age && <span>{n.age}</span>}
                        <i className="bi bi-box-arrow-up-right rh-news-ext" aria-hidden="true" />
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Start a new list */}
      <section className="rh-quickstart" aria-labelledby="rh-qs-heading">
        <p id="rh-qs-heading" className="rh-section-label">
          Start a new list
        </p>
        <div className="rh-qs-grid">
          {QUICK_START.map((q) => (
            <button
              key={q.path}
              type="button"
              className="rh-qs-card"
              onClick={() => launch(q.path)}
            >
              <span className="rh-qs-icon">
                <i className={`bi ${q.icon}`} aria-hidden="true" />
              </span>
              <span className="rh-qs-copy">
                <span className="rh-qs-title">{q.title}</span>
                <span className="rh-qs-sub">{q.sub}</span>
              </span>
              <i className="bi bi-arrow-right rh-qs-arrow" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      {/* Company Tearsheet */}
      <section className="rh-panel rh-tearsheet">
        <div className="rh-panel-head">
          <div className="rh-panel-title">
            <i className="bi bi-file-earmark-text" aria-hidden="true" />
            <h2>Company Tearsheet</h2>
          </div>
          <p className="rh-tearsheet-hint">AI-generated one-pager — opens in a new tab</p>
        </div>
        <div className="rh-panel-body rh-tearsheet-form">
          <div className="rh-ts-field">
            <label htmlFor="rh-ts-name">
              Company name <span className="rh-req">*</span>
            </label>
            <input
              id="rh-ts-name"
              type="text"
              value={tsName}
              onChange={(e) => setTsName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openTs();
              }}
              placeholder="e.g. Acme Corporation"
            />
          </div>
          <div className="rh-ts-field">
            <label htmlFor="rh-ts-web">
              Website <span className="rh-opt">(optional)</span>
            </label>
            <input
              id="rh-ts-web"
              type="url"
              value={tsWebsite}
              onChange={(e) => setTsWebsite(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openTs();
              }}
              placeholder="e.g. https://acmecorp.com"
            />
          </div>
          <button
            type="button"
            className="rh-build-btn rh-ts-btn"
            disabled={!tsName.trim()}
            onClick={openTs}
          >
            <i className="bi bi-file-earmark-plus" aria-hidden="true" />
            Generate tearsheet
          </button>
        </div>
      </section>
    </div>
  );
}
