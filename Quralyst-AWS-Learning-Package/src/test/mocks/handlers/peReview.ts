// MSW handlers for the PE Review-Queue + Corrections surface (F27.3). Shapes mirror the backend
// F27 routers: unified envelope, review list honours ?status + ?recordType, PATCH resolves one
// item, bulk-approve posts {ids}, corrections/apply is dry-run by default, rule enable requires
// {confirm:true}. Registration puts the literal /stats + /bulk-approve before the generic /:id
// PATCH so they win.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import {
  mockApplySummary,
  mockCorrectionsStore,
  mockDryRunSummary,
  mockReviewItems,
  mockReviewStats,
  mockRuleDisabled,
  mockRuleEnabled,
} from '@/test/mocks/fixtures/peReview';

export const peReviewHandlers = [
  // --- Review queue --------------------------------------------------------
  http.get(endpoints.pe.reviewQueueStats, () => ok(mockReviewStats)),
  http.get(endpoints.pe.reviewQueue, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'pending';
    const recordType = url.searchParams.get('recordType');
    let items = mockReviewItems.filter((i) => i.status === status);
    if (recordType) items = items.filter((i) => i.recordType === recordType);
    return ok({ items, total: items.length });
  }),
  http.post(endpoints.pe.reviewBulkApprove, async ({ request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { ids?: string[] };
    return ok({ approved: (body.ids ?? []).length });
  }),
  http.patch(`/api/pe/review-queue/:id`, async ({ params, request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as {
      status?: string;
      reviewerNotes?: string | null;
    };
    const base = mockReviewItems.find((i) => i.id === params.id) ?? mockReviewItems[0];
    return ok({
      ...base,
      id: String(params.id),
      status: body.status ?? 'approved',
      reviewerNotes: body.reviewerNotes ?? null,
      resolvedAt: '2026-07-13T11:00:00Z',
    });
  }),

  // --- Corrections + rules -------------------------------------------------
  http.get(endpoints.pe.corrections, () => ok(mockCorrectionsStore)),
  http.post(endpoints.pe.correctionsApply, async ({ request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { dryRun?: boolean };
    // Backend default is dry-run; a real apply must set dryRun:false explicitly.
    return ok(body.dryRun === false ? mockApplySummary : mockDryRunSummary);
  }),
  http.post(`/api/pe/corrections/rules/:id/enable`, ({ params }) =>
    ok({ ...mockRuleDisabled, id: String(params.id), enabled: true }),
  ),
  http.post(`/api/pe/corrections/rules/:id/disable`, ({ params }) =>
    ok({ ...mockRuleEnabled, id: String(params.id), enabled: false }),
  ),
];
