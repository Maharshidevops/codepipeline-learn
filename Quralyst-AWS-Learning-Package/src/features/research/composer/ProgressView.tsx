// Replit-parity inline progress view for research composers (stage plan, ETA, stall, stop).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { progressService } from '@/services/api/progressService';
import type { ActiveProcessing, StagePlanEntry } from '@/services/api/processService';
import type { ProcessType } from '@/types';
import { paths } from '@/routes/paths';
import '@/styles/pages/research-composer.css';

const STALE_HINT_SECONDS = 180;
const ETA_WINDOW_SEC = 90;
const ETA_MIN_PCT = 3;

/** Shown early in a Target run before the backend stage_plan is populated. */
const DEFAULT_TARGET_STAGE_PLAN: StagePlanEntry[] = [
  { key: 'finding', label: 'Finding companies', status: 'active' },
  { key: 'dedupe', label: 'Removing duplicates', status: 'pending' },
  { key: 'size_location', label: 'Checking location & size', status: 'pending' },
  { key: 'business_fit', label: 'Scoring business fit', status: 'pending' },
  { key: 'rationales', label: 'Writing rationales', status: 'pending' },
  { key: 'saving', label: 'Saving results', status: 'pending' },
];

function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m <= 0) return `${sec}s`;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

function formatEta(remainingSec: number): string {
  if (remainingSec < 45) return 'less than a minute left';
  const mins = remainingSec / 60;
  if (mins < 10) return `about ${Math.max(1, Math.round(mins))} min left`;
  if (mins < 90) return `about ${Math.round(mins / 5) * 5} min left`;
  const hrs = mins / 60;
  return `about ${(Math.round(hrs * 2) / 2).toFixed(1).replace(/\.0$/, '')} hr left`;
}

function useLiveElapsed(
  startedAt: number | null | undefined,
  lastUpdated: number | null | undefined,
  processId: string | undefined,
  running: boolean,
): number {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  if (!startedAt) return 0;
  const end = running ? Date.now() / 1000 : lastUpdated || Date.now() / 1000;
  void processId;
  return Math.max(0, Math.floor(end - startedAt));
}

function useStaleSeconds(
  lastUpdated: number | null | undefined,
  processId: string | undefined,
  running: boolean,
): number {
  const ref = useRef<{ id?: string; lu?: number | null; at: number }>({ at: Date.now() / 1000 });
  const [, force] = useState(0);
  if (ref.current.id !== processId || lastUpdated !== ref.current.lu) {
    ref.current = { id: processId, lu: lastUpdated, at: Date.now() / 1000 };
  }
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => force((n) => n + 1), 2000);
    return () => clearInterval(id);
  }, [running]);
  if (typeof lastUpdated !== 'number') return 0;
  return Math.max(0, Math.floor(Date.now() / 1000 - ref.current.at));
}

function useEtaEstimate(
  pct: number,
  elapsedSec: number,
  processId: string | undefined,
  running: boolean,
): number | null {
  const ref = useRef<{
    id?: string;
    samples: { t: number; p: number }[];
    smoothed: number | null;
    lastT: number;
    lastP: number;
  }>({ samples: [], smoothed: null, lastT: -1, lastP: -1 });

  if (ref.current.id !== processId) {
    ref.current = { id: processId, samples: [], smoothed: null, lastT: -1, lastP: -1 };
  }

  if (running && (elapsedSec !== ref.current.lastT || pct !== ref.current.lastP)) {
    ref.current.lastT = elapsedSec;
    ref.current.lastP = pct;
    const s = ref.current.samples;
    s.push({ t: elapsedSec, p: pct });
    while (s.length > 2 && elapsedSec - s[0].t > ETA_WINDOW_SEC) s.shift();

    let remaining: number | null = null;
    if (pct >= ETA_MIN_PCT && pct < 100 && elapsedSec >= 5) {
      const first = s[0];
      const dt = elapsedSec - first.t;
      const dp = pct - first.p;
      const recentRate = dt >= 8 && dp > 1e-4 ? dp / dt : null;
      const globalRate = pct / elapsedSec;
      if (recentRate != null) {
        const rate = 0.7 * recentRate + 0.3 * globalRate;
        if (rate > 0) remaining = (100 - pct) / rate;
      } else if (ref.current.smoothed == null && globalRate > 0) {
        remaining = (100 - pct) / globalRate;
      }
    }

    if (remaining != null && isFinite(remaining) && remaining > 0) {
      remaining = Math.min(remaining, 6 * 3600);
      const prev = ref.current.smoothed;
      ref.current.smoothed = prev == null ? remaining : prev * 0.7 + remaining * 0.3;
    }
  }

  if (!running) return null;
  return ref.current.smoothed;
}

export interface ProgressViewProps {
  progress: ActiveProcessing;
  processType: ProcessType;
  runningTitle: string;
  completeTitle?: string;
  stoppedTitle?: string;
  onBack: () => void;
  onViewResult?: (resultId: string) => void;
  /** F12 — true when ProgressView was restored via mount-time adopt (same run_id). */
  reconnected?: boolean;
}

export default function ProgressView({
  progress,
  processType,
  runningTitle,
  completeTitle = 'Research complete',
  stoppedTitle = 'Research stopped',
  onBack,
  onViewResult,
  reconnected = false,
}: ProgressViewProps) {
  const navigate = useNavigate();
  const pct = Math.max(0, Math.min(100, Math.round(progress.overallPercentage ?? 0)));
  const status = (progress.status || '').toLowerCase();
  const depletionPaused = !!(progress.depletionPaused || status === 'depletion_paused');
  const failed = !depletionPaused && ['error', 'cancelled', 'stopped'].includes(status);
  const succeeded =
    (progress.completed || pct >= 100 || status === 'completed') && !failed && !depletionPaused;
  const running = !succeeded && !failed && !depletionPaused;
  const resultId = progress.resultId || progress.processId || undefined;

  const remotePlan = progress.stagePlan ?? [];
  const stagePlan: StagePlanEntry[] =
    remotePlan.length > 0
      ? remotePlan
      : processType === 'target_list' || processType === 'strategic_buyer_list'
        ? DEFAULT_TARGET_STAGE_PLAN
        : [];
  const activePhase = stagePlan.find((s) => s.status === 'active');
  const headline = depletionPaused
    ? progress.depletionProvider
      ? `${progress.depletionProvider} API quota/credits ran out.`
      : "An API provider's credits ran out."
    : failed
      ? progress.activityMessage || progress.message || 'Run stopped'
      : activePhase?.label || progress.currentStageName || progress.currentStage || 'Working';
  const detail = progress.activityMessage || progress.currentSubStage || '';
  const sub = progress.subProgress;
  const companyNoun = processType === 'financial_verticals' ? 'firms' : 'companies';
  const workingCount =
    typeof progress.companyCount === 'number' && progress.companyCount > 0
      ? progress.companyCount
      : typeof progress.requestedCompanyCount === 'number' && progress.requestedCompanyCount > 0
        ? progress.requestedCompanyCount
        : null;

  const elapsedSec = useLiveElapsed(
    progress.startedAt,
    progress.lastUpdated,
    progress.processId ?? undefined,
    running,
  );
  const staleSec = useStaleSeconds(progress.lastUpdated, progress.processId ?? undefined, running);
  const looksStalled = running && staleSec >= STALE_HINT_SECONDS;
  const pctRaw = Math.max(0, Math.min(100, progress.overallPercentage ?? 0));
  const etaSeconds = useEtaEstimate(pctRaw, elapsedSec, progress.processId ?? undefined, running);
  let etaText = 'Estimating time remaining…';
  if (running && !looksStalled && etaSeconds != null && etaSeconds > 0) {
    etaText = formatEta(etaSeconds);
  }

  const handleView = () => {
    if (!resultId) return;
    if (onViewResult) onViewResult(resultId);
    else navigate(`/quralyst-research/result/${resultId}/data`);
  };

  const handleStop = async () => {
    try {
      await progressService.stop(processType);
    } catch {
      /* best effort */
    }
  };

  const subUnitLabel =
    sub?.unit === 'firm' ? 'Firm' : sub?.unit === 'company' ? 'Company' : 'Batch';

  return (
    <div className="rc-progress">
      <div className="rc-progress__card">
        <div className="rc-progress__hero">
          <div
            className={`rc-progress__icon ${
              depletionPaused
                ? 'is-depleted'
                : failed
                  ? 'is-fail'
                  : succeeded
                    ? 'is-ok'
                    : 'is-running'
            }`}
          >
            {succeeded ? (
              '✓'
            ) : depletionPaused ? (
              '!'
            ) : failed ? (
              '×'
            ) : (
              <span className="rc-progress__spinner" aria-hidden />
            )}
          </div>
          <h2 className="rc-progress__title">
            {succeeded
              ? completeTitle
              : depletionPaused
                ? 'Run paused — credits depleted'
                : failed
                  ? stoppedTitle
                  : runningTitle}
          </h2>
          <p className="rc-progress__headline">{headline}</p>
          {reconnected && running && (
            <p className="rc-progress__reconnect" role="status">
              Reconnected to your interrupted run — same job id, progress continues from where the
              server left off.
            </p>
          )}
        </div>

        <div className="rc-progress__bar-wrap">
          <div className="rc-progress__bar">
            <div className="rc-progress__bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="rc-progress__bar-meta">
            <span>{!running ? detail : ''}</span>
            <span>{pct}%</span>
          </div>
        </div>

        {running && (
          <>
            {(detail || sub) && (
              <div className="rc-progress__detail">
                {detail && <p>{detail}</p>}
                {sub && sub.total > 0 && (
                  <div className="rc-progress__sub">
                    <div className="rc-progress__bar-meta">
                      <span>
                        {subUnitLabel} {sub.current} of {sub.total}
                      </span>
                      <span>
                        {Math.round((Math.min(sub.current, sub.total) / sub.total) * 100)}%
                      </span>
                    </div>
                    <div className="rc-progress__bar rc-progress__bar--thin">
                      <div
                        className="rc-progress__bar-fill"
                        style={{
                          width: `${Math.round(
                            (Math.min(sub.current, sub.total) / sub.total) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {stagePlan.length > 0 && (
              <ol className="rc-progress__stages">
                {stagePlan.map((s) => (
                  <li key={s.key} className={`is-${s.status}`}>
                    <span className="rc-progress__stage-mark" aria-hidden>
                      {s.status === 'done' ? (
                        '✓'
                      ) : s.status === 'active' ? (
                        <span className="rc-progress__spinner rc-progress__spinner--sm" />
                      ) : (
                        '○'
                      )}
                    </span>
                    {s.label}
                  </li>
                ))}
              </ol>
            )}

            <div className="rc-progress__timing">
              <span>Elapsed {formatDuration(elapsedSec)}</span>
              <span>
                {etaText}
                {etaText.startsWith('about') || etaText.startsWith('less') ? (
                  <span className="rc-progress__eta-hint"> · estimate</span>
                ) : null}
              </span>
            </div>

            {workingCount != null && (
              <p className="rc-progress__count">
                Working through {workingCount.toLocaleString()} {companyNoun} — you can leave this
                page and your results will keep generating.
              </p>
            )}

            {looksStalled && (
              <div className="rc-progress__stall" role="status">
                <span className="rc-progress__stall-icon" aria-hidden>
                  !
                </span>
                <span>
                  No progress updates for {formatDuration(staleSec)}. Some steps take a while, but
                  if this run stays stuck you can head back and start a new one.
                </span>
              </div>
            )}
          </>
        )}

        {depletionPaused && (
          <div className="rc-progress__depletion" role="alert">
            <p>
              <strong>All progress so far is preserved.</strong> To continue: top up your{' '}
              <strong>{progress.depletionProvider || 'provider'}</strong> account, update the key in{' '}
              <strong>Settings → API Keys</strong>, then start a new run and select{' '}
              <em>reuse mode</em> — it skips companies already found in this run so you pick up
              right where you left off.
            </p>
            <div className="rc-progress__depletion-actions">
              <Link to={paths.settings.apiKeys} className="btn btn-warning btn-sm">
                Go to API Keys
              </Link>
            </div>
          </div>
        )}

        <div className="rc-progress__actions">
          {running && (
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => void handleStop()}
            >
              Stop
            </button>
          )}
          {(succeeded || failed || depletionPaused) && (
            <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
              Back
            </button>
          )}
          {succeeded && resultId && (
            <button type="button" className="btn btn-primary rc-progress__cta" onClick={handleView}>
              View results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
