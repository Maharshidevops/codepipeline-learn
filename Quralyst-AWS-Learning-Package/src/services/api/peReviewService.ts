// PE Dataset — Review Queue + Corrections service (F27.3). The typed seam over the F27
// /api/pe/review-queue/* and /api/pe/corrections/* routers. Router access is `require_pe_access`
// (staff OR the pe:dataset grant); server-side the corrections rule enable/disable and a REAL
// (non-dry-run) apply are staff-only — the FE mirrors that gate in the UI, but the backend 403s
// regardless. Mutations echo the CSRF token through the shared http seam. Contract: backend
// Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Review Queue / Corrections + the F27 routers.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  PECorrectionsApplySummary,
  PECorrectionRule,
  PECorrectionsStore,
  PEReviewBulkApproveResult,
  PEReviewItem,
  PEReviewList,
  PEReviewResolveStatus,
  PEReviewStats,
  PEReviewStatus,
} from '@/types';

export interface PEReviewService {
  // --- Review queue --------------------------------------------------------
  /** List items by status (default `pending`) + optional recordType — newest-first, capped 200.
   *  NOTE: `reason` is filtered client-side (the backend list endpoint has no reason param). */
  listReviewItems(params?: {
    status?: PEReviewStatus;
    recordType?: string | null;
  }): Promise<PEReviewList>;
  getReviewStats(): Promise<PEReviewStats>;
  /** Approve / reject / edit one item. The locked backend PATCH shape carries only
   *  `{status, reviewerNotes}` — approve/edit applies the item's ENQUEUED payload (no override). */
  resolveReviewItem(
    id: string,
    status: PEReviewResolveStatus,
    reviewerNotes?: string | null,
  ): Promise<PEReviewItem>;
  bulkApprove(ids: string[]): Promise<PEReviewBulkApproveResult>;

  // --- Corrections + learned rules -----------------------------------------
  getCorrections(): Promise<PECorrectionsStore>;
  /** Replay overrides + corrections and sweep enabled rules. `dryRun` (default) writes nothing
   *  and returns per-mechanism counts + sample rows; a real apply is staff-only server-side. */
  applyCorrections(dryRun?: boolean): Promise<PECorrectionsApplySummary>;
  /** Enable a learned rule (staff-only). Requires `confirm=true` after previewing the dry-run. */
  enableRule(id: string, confirm: boolean): Promise<PECorrectionRule>;
  disableRule(id: string): Promise<PECorrectionRule>;
}

export const peReviewService: PEReviewService = {
  listReviewItems: ({ status = 'pending', recordType = null } = {}) => {
    const qs = new URLSearchParams({ status });
    if (recordType) qs.set('recordType', recordType);
    return http<PEReviewList>(`${endpoints.pe.reviewQueue}?${qs.toString()}`);
  },

  getReviewStats: () => http<PEReviewStats>(endpoints.pe.reviewQueueStats),

  resolveReviewItem: (id, status, reviewerNotes = null) =>
    http<PEReviewItem>(endpoints.pe.reviewItem(id), {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewerNotes }),
    }),

  bulkApprove: (ids) =>
    http<PEReviewBulkApproveResult>(endpoints.pe.reviewBulkApprove, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  getCorrections: () => http<PECorrectionsStore>(endpoints.pe.corrections),

  applyCorrections: (dryRun = true) =>
    http<PECorrectionsApplySummary>(endpoints.pe.correctionsApply, {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    }),

  enableRule: (id, confirm) =>
    http<PECorrectionRule>(endpoints.pe.correctionRuleEnable(id), {
      method: 'POST',
      body: JSON.stringify({ confirm }),
    }),

  disableRule: (id) =>
    http<PECorrectionRule>(endpoints.pe.correctionRuleDisable(id), {
      method: 'POST',
    }),
};
