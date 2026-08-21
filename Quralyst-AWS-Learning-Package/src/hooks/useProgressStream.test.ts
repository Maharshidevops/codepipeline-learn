// useProgressStream controller: startProgress seeds the store; the mock stream's `complete`
// flips finished + resultId. The real progressService.openStream opens a live EventSource, so the
// test stubs it with the test-only MockProgressSource (deterministic, timer-driven) to drive the
// controller without a backend SSE connection.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startProgress } from './useProgressStream';
import { useProgressStore } from '@/store/progressStore';
import { progressService } from '@/services/api';
import { MockProgressSource } from '@/test/mocks/progress/mockSse';

beforeEach(() => {
  vi.useFakeTimers();
  useProgressStore.getState().reset();
  vi.spyOn(progressService, 'openStream').mockImplementation(
    ({ processType, fileNames, resultId }) =>
      new MockProgressSource({ processType, fileNames, resultId }),
  );
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useProgressStream controller', () => {
  it('startProgress seeds the store as processing', () => {
    startProgress({
      processId: 'p1',
      processType: 'target_list',
      fileNames: ['a.csv'],
      resultId: 'res-test',
    });

    const st = useProgressStore.getState();
    expect(st.processId).toBe('p1');
    expect(st.status).toBe('processing');
    expect(st.fileNames).toEqual(['a.csv']);
    expect(st.finished).toBe(false);
  });

  it('completes the run with finished + resultId', () => {
    startProgress({
      processId: 'p1',
      processType: 'target_list',
      fileNames: ['a.csv'],
      resultId: 'res-test',
    });

    // Drive the mock stream to completion.
    vi.advanceTimersByTime(220 * 300);

    const st = useProgressStore.getState();
    expect(st.finished).toBe(true);
    expect(st.status).toBe('completed');
    expect(st.overallPercentage).toBe(100);
    expect(st.resultId).toBe('res-test');
  });
});
