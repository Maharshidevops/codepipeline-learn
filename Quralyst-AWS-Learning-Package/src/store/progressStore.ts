// Active-processing / SSE progress store (Zustand). Fully wired in Phase 7;
// defined here so AppLayout's GlobalProgressTracker can subscribe from Phase 0.
import { create } from 'zustand';
import type { ProgressState } from '@/types';

const initial: ProgressState = {
  processId: null,
  processType: 'target_list',
  overallPercentage: 0,
  currentStage: 'initializing',
  status: 'idle',
  heading: '',
  summary: '',
  imageIndex: 0,
  fileNames: [],
  perFileProgress: {},
  fileStatsText: '',
  minimized: false,
  finished: false,
};

interface ProgressStore extends ProgressState {
  update: (patch: Partial<ProgressState>) => void;
  reset: () => void;
}

export const useProgressStore = create<ProgressStore>((set) => ({
  ...initial,
  update: (patch) => set(patch),
  reset: () => set(initial),
}));
