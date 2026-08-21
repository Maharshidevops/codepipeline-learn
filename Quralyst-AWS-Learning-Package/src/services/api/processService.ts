// Process service (Phase 3 slice): the active-processing bootstrap poll. Phase 7 extends this with
// the progress stream + start/stop endpoints. Research Home also reads progress fields for the
// in-progress banner (parity with Replit Home).
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';

export interface StagePlanEntry {
  key: string;
  label: string;
  status: 'done' | 'active' | 'pending' | string;
}

export interface SubProgress {
  current: number;
  total: number;
  unit: string;
}

export interface ActiveProcessing {
  active: boolean;
  completed?: boolean;
  processId?: string | null;
  resultId?: string | null;
  overallPercentage?: number;
  currentStage?: string;
  currentStageName?: string;
  currentSubStage?: string;
  activityMessage?: string;
  processType?: string;
  message?: string;
  redirectUrl?: string;
  status?: string;
  startedAt?: number | null;
  lastUpdated?: number | null;
  stagePlan?: StagePlanEntry[];
  subProgress?: SubProgress | null;
  companyCount?: number | null;
  requestedCompanyCount?: number | null;
  depletionPaused?: boolean;
  depletionProvider?: string | null;
  depletionDetail?: string;
}

export interface ProcessService {
  getActiveProcessing(): Promise<ActiveProcessing>;
}

export const processService: ProcessService = {
  getActiveProcessing: () => http<ActiveProcessing>(endpoints.profile.activeProcessing),
};
