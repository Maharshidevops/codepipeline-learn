// PE People batch-op progress (F25.2). A thin, modal-local binding over the SAME SSE seam the
// research/holdings pipeline uses — `progressService.openStream()` (the native-EventSource wrapper
// against GET /api/sse/progress). We deliberately do NOT reuse the module-scope `useProgressStream`
// controller: that one drives the app-wide GlobalProgressTracker and redirects to a research result,
// which is wrong for an in-page batch op. Here we just surface percentage/status/message and let the
// modal own the lifecycle. No hand-rolled EventSource — the transport stays in progressService.
import { useCallback, useEffect, useRef, useState } from 'react';
import { progressService } from '@/services/api';
import type { PEPeopleProcessType, ProgressSource, ProgressUpdateEvent } from '@/types';

export type BatchStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface BatchProgressState {
  status: BatchStatus;
  percentage: number;
  message: string;
  error: string | null;
}

const INITIAL: BatchProgressState = { status: 'idle', percentage: 0, message: '', error: null };

export interface UsePeopleBatchProgress extends BatchProgressState {
  /** Open the SSE stream for a started (202) batch op. */
  start(processId: string, processType: PEPeopleProcessType): void;
  /** Close the stream client-side and mark the op cancelled. */
  cancel(): void;
  /** Close the stream and return to idle (used on modal close / re-open). */
  reset(): void;
}

export function usePeopleBatchProgress(onDone?: () => void): UsePeopleBatchProgress {
  const [state, setState] = useState<BatchProgressState>(INITIAL);
  const sourceRef = useRef<ProgressSource | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const stopSource = useCallback(() => {
    sourceRef.current?.stop();
    sourceRef.current = null;
  }, []);

  const start = useCallback(
    (processId: string, processType: PEPeopleProcessType) => {
      stopSource();
      setState({ status: 'running', percentage: 0, message: 'Starting…', error: null });

      const source = progressService.openStream({ processId, processType });
      sourceRef.current = source;

      source.on('progress', (d: ProgressUpdateEvent) => {
        setState((s) => ({
          status: 'running',
          percentage:
            typeof d.overall_percentage === 'number' ? d.overall_percentage : s.percentage,
          message: d.activity_message ?? s.message,
          error: null,
        }));
      });
      source.on('complete', (d: ProgressUpdateEvent) => {
        sourceRef.current = null;
        setState({
          status: 'done',
          percentage: 100,
          message: d.activity_message ?? 'Complete.',
          error: null,
        });
        onDoneRef.current?.();
      });
      source.on('error', (d: ProgressUpdateEvent) => {
        sourceRef.current = null;
        setState((s) => ({
          ...s,
          status: 'error',
          error: d.error || 'The operation failed.',
        }));
      });

      source.start();
    },
    [stopSource],
  );

  const cancel = useCallback(() => {
    stopSource();
    setState((s) => ({ ...s, status: 'cancelled' }));
  }, [stopSource]);

  const reset = useCallback(() => {
    stopSource();
    setState(INITIAL);
  }, [stopSource]);

  // Never leak an open EventSource if the modal unmounts mid-run.
  useEffect(() => () => stopSource(), [stopSource]);

  return { ...state, start, cancel, reset };
}
