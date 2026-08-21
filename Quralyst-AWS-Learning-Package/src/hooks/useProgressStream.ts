// Progress controller + hook. Replaces sse_progress_manager.js / sse_fv_progress_manager.js.
//
// The active ProgressSource is owned at module scope so that BOTH the page that starts a run and the
// app-wide ProgressModal / sidebar tracker (mounted in AppLayout) drive the same stream. Components
// read state from progressStore; this module is the only place that talks to progressService.
//
//  • startProgress(opts) — pages call after a successful wizard submit.
//  • stopProgress()      — modal Stop button.
//  • minimizeProgress()  — modal Minimize button.
//  • maximizeProgress()  — sidebar tracker Maximize (navigates to results if finished).
//  • useProgressBinding() — mounted once in AppLayout to bind the router navigate fn.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '@/store/progressStore';
import { progressService } from '@/services/api';
import { paths } from '@/routes/paths';
import type { ProcessType, ProgressSource, ProgressUpdateEvent } from '@/types';

let activeSource: ProgressSource | null = null;
let navigateFn: ((path: string) => void) | null = null;

function resultPathFor(processType: ProcessType, resultId: string): string {
  return processType === 'financial_verticals'
    ? paths.financialVerticalsResults(resultId)
    : paths.viewResult(resultId);
}

function applyEvent(d: ProgressUpdateEvent): void {
  const store = useProgressStore.getState();
  const files = d.file_names ?? store.fileNames;
  const done = files.filter((f) => (d.per_file_progress?.[f] ?? 0) >= 100).length;
  store.update({
    overallPercentage: d.overall_percentage,
    currentStage: d.current_stage,
    status: d.status,
    summary: d.activity_message ?? store.summary,
    fileNames: files,
    perFileProgress: d.per_file_progress ?? store.perFileProgress,
    fileStatsText: files.length ? `${done}/${files.length} Files Processed…` : '',
  });
}

export interface StartProgressOptions {
  processId: string;
  processType: ProcessType;
  fileNames?: string[];
  resultId?: string;
}

export function startProgress(opts: StartProgressOptions): void {
  stopActiveSource();
  const store = useProgressStore.getState();
  store.reset();
  store.update({
    processId: opts.processId,
    processType: opts.processType,
    status: 'processing',
    fileNames: opts.fileNames ?? [],
    minimized: false,
    finished: false,
    resultId: opts.resultId,
  });

  const source = progressService.openStream(opts);
  activeSource = source;
  source.on('progress', applyEvent);
  source.on('complete', (d) => {
    applyEvent(d);
    const resultId = d.result_id ?? opts.resultId;
    useProgressStore.getState().update({
      overallPercentage: 100,
      status: 'completed',
      currentStage: 'completed',
      finished: true,
      resultId,
    });
    activeSource = null;
    // Auto-redirect only if the modal is still open; if minimized, the tracker turns green and the
    // user maximizes to navigate.
    const st = useProgressStore.getState();
    if (!st.minimized && resultId && navigateFn) {
      const path = resultPathFor(opts.processType, resultId);
      // Navigate, then clear the store so the modal/tracker unmounts on landing (mirrors
      // maximizeProgress). Without the reset, processId/status persist and the "All done!"
      // modal stays open on the results page until the user minimizes it manually.
      window.setTimeout(() => {
        navigateFn?.(path);
        useProgressStore.getState().reset();
      }, 1200);
    }
  });
  source.on('error', (d) => {
    useProgressStore.getState().update({ status: d.status || 'stopped', currentStage: 'stopped' });
    activeSource = null;
    window.setTimeout(() => useProgressStore.getState().reset(), 600);
  });
  source.start();
}

function stopActiveSource(): void {
  if (activeSource) {
    activeSource.stop();
    activeSource = null;
  }
}

export function stopProgress(): void {
  const { processType } = useProgressStore.getState();
  stopActiveSource();
  void progressService.stop(processType).catch(() => undefined);
  useProgressStore.getState().reset();
}

export function minimizeProgress(): void {
  useProgressStore.getState().update({ minimized: true });
}

export function maximizeProgress(): void {
  const st = useProgressStore.getState();
  if (st.finished && st.resultId && navigateFn) {
    navigateFn(resultPathFor(st.processType, st.resultId));
    useProgressStore.getState().reset();
    return;
  }
  useProgressStore.getState().update({ minimized: false });
}

/** Mounted once (AppLayout) to give the controller access to the router navigate fn + cleanup. */
export function useProgressBinding(): void {
  const navigate = useNavigate();
  useEffect(() => {
    navigateFn = (path: string) => navigate(path);
    return () => {
      navigateFn = null;
    };
  }, [navigate]);
}
