// List Enrichment (Tier A / A8 / F14) — start a post-hoc Apollo enrich on a finished result and
// poll its status. Enrichment only fills empty contact/company fields (never overwrites CRM edits)
// unless forceReenrich is set, and consumes credits per enriched company.
import { http } from '../http';
import { endpoints } from '../endpoints';

export type EnrichMode = 'contacts' | 'company_data' | 'all';
export type EnrichRowStatus = 'pending' | 'enriching' | 'done' | 'skipped' | 'failed';

export interface EnrichStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  processed: number;
  total: number;
  message: string;
  found?: boolean;
  running?: boolean;
  done?: number;
  skipped?: number;
  failed?: number;
  byCompany?: Record<string, EnrichRowStatus>;
}

export interface EnrichService {
  start(input: {
    resultId: string;
    mode: EnrichMode;
    listType?: string;
    forceReenrich?: boolean;
  }): Promise<EnrichStatus>;
  getStatus(resultId: string, mode: EnrichMode): Promise<EnrichStatus>;
}

export const enrichService: EnrichService = {
  start: ({ resultId, mode, listType, forceReenrich }) =>
    http<EnrichStatus>(endpoints.enrich.start, {
      method: 'POST',
      body: JSON.stringify({
        resultId,
        mode,
        listType: listType ?? 'target',
        forceReenrich: !!forceReenrich,
      }),
    }),
  getStatus: (resultId, mode) => http<EnrichStatus>(endpoints.enrich.status(resultId, mode)),
};
