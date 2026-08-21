/**
 * F12 — adopt an in-flight research job on composer mount.
 *
 * Unlike QURALYST-20's pe-scraper (which folds resume into a shared
 * `useResearchPolling`), this Front-End keeps submit-time progress in page
 * state and adds an explicit one-shot adoption pass. That matters because:
 *   1. `process_id` is only in React state today — refresh loses ProgressView
 *   2. Backend resume keeps the same run_id + Redis progress keys, so
 *      `/api/active-processing` is enough to reattach
 *   3. `ownsActiveJob` gating prevents cross-mode bleed (strategic ≠ target)
 *
 * Research Home passes `{ resumeActive }` in navigate state so ProgressView can
 * paint immediately (no form flash while `/api/active-processing` is in flight).
 *
 * Do NOT gate on a "ran once" ref — React StrictMode runs effect → cleanup →
 * effect again, and a sticky ref would skip the real adoption.
 */
import { useEffect, useLayoutEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { processService, type ActiveProcessing } from '@/services/api/processService';
import { clearRerunMeta } from '@/features/research/composerPrefill';
import type { ProcessType } from '@/types';
import { paths } from '@/routes/paths';

export type ComposerMode = 'target' | 'strategic' | 'financial';

export type ResumeNavigateState = {
  resumeActive?: ActiveProcessing;
};

const PROCESS_TYPE_BY_MODE: Record<ComposerMode, ProcessType> = {
  target: 'target_list',
  strategic: 'strategic_buyer_list',
  financial: 'financial_verticals',
};

export function ownsActiveJob(active: ActiveProcessing, mode: ComposerMode): boolean {
  const expected = PROCESS_TYPE_BY_MODE[mode];
  if (active.processType) return active.processType === expected;
  // Defensive: jobs without processType are claimed by Target only.
  return mode === 'target';
}

function isAdoptable(active: ActiveProcessing, mode: ComposerMode): boolean {
  return Boolean(
    active.active && active.processId && !active.completed && ownsActiveJob(active, mode),
  );
}

/** Placeholder while Research Home handed us a resume intent but payload is still settling. */
export const RESUME_PLACEHOLDER: ActiveProcessing = {
  active: true,
  completed: false,
  overallPercentage: 0,
  currentStage: 'reconnecting',
  currentStageName: 'Reconnecting to your run…',
  status: 'running',
  stagePlan: [],
};

/**
 * On mount, if the user already has a matching in-flight job, adopt it into
 * `setRunProgress`. Sets `adopted` so ProgressView can show a reconnect notice.
 * `checking` is true until the first adopt attempt finishes when we arrived via
 * Research Home resume (so the form never flashes).
 */
export function useAdoptActiveRun(
  mode: ComposerMode,
  setRunProgress: Dispatch<SetStateAction<ActiveProcessing | null>>,
): { adopted: boolean; clearAdopted: () => void; checking: boolean } {
  const location = useLocation();
  const navigate = useNavigate();
  const resumeState = (location.state as ResumeNavigateState | null)?.resumeActive;
  const expectResume = Boolean(resumeState && isAdoptable(resumeState, mode));

  const [adopted, setAdopted] = useState(false);
  const [checking, setChecking] = useState(expectResume);

  // Paint ProgressView before the browser paints the form when Home already
  // knew about the in-flight job.
  useLayoutEffect(() => {
    if (!resumeState || !isAdoptable(resumeState, mode)) return;
    setRunProgress(resumeState);
    setAdopted(true);
    setChecking(false);
    clearRerunMeta();
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    // Intentionally mount-only — consume the one-shot resume handoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const active = await processService.getActiveProcessing();
        if (cancelled) return;
        if (isAdoptable(active, mode)) {
          setRunProgress(active);
          setAdopted(true);
          clearRerunMeta();
        }
      } catch {
        /* bootstrap is best-effort */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, setRunProgress]);

  return {
    adopted,
    checking,
    clearAdopted: () => setAdopted(false),
  };
}

export function researchHomeHrefForProcessType(processType?: string | null): string {
  if (processType === 'financial_verticals') return paths.financialVerticals;
  if (processType === 'strategic_buyer_list') return paths.strategic;
  return paths.targetList;
}
