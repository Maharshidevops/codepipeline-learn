// MSW handlers for the PE Admin Ops surface (F28.2). Shapes mirror the backend contract:
// staff-only, unified envelope, triggers return 202 {op, enqueued, jobId}. Registration order
// matters — specific literal paths are registered BEFORE the generic `/:op` + `/:op/status`
// matchers so they win, and the two-segment `holdings/re-enrich-missing-descriptions` op has its
// own handlers (a single `:op` segment can't match it).
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { err, ok } from '@/test/mocks/envelope';
import {
  mockPeAdminDedup,
  mockPeAdminNotFoundHoldings,
  mockPeAdminNotFoundPeople,
  mockPeAdminPause,
  mockPeAdminPortfolioQuality,
  mockPeAdminQueueCounts,
  mockPeAdminQueueJobs,
  mockPeAdminStats,
  mockPePipelineHealth,
  mockPeQueueJobs,
  mockPeQueuesHealth,
} from '@/test/mocks/fixtures/peAdmin';

const ADMIN = '/api/pe/admin';

export const peAdminHandlers = [
  // --- Pause ---------------------------------------------------------------
  http.get(endpoints.peAdmin.scraperPause, () => ok(mockPeAdminPause)),
  http.post(endpoints.peAdmin.scraperPause, async ({ request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { paused?: boolean };
    const paused = !!body.paused;
    return ok({ paused, dbPaused: paused, envOverride: false });
  }),

  // --- Queue + stats -------------------------------------------------------
  // `?status=` (F50.2) filters the ROWS only; `meta.counts` stays fleet-wide/all-status, because
  // the console renders those counts as the status filter control. No `status` = every row, which
  // is how MonitoringPanel reads it (it picks the failures out client-side).
  http.get(endpoints.peAdmin.scrapeQueue, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const jobs = status
      ? mockPeAdminQueueJobs.filter((j) => j.status === status)
      : mockPeAdminQueueJobs;
    return ok(
      { jobs, pause: mockPeAdminPause },
      { meta: { counts: mockPeAdminQueueCounts, status } },
    );
  }),
  http.get(endpoints.peAdmin.stats, () => ok(mockPeAdminStats)),

  // --- F50: per-queue health, job list, queue ops --------------------------
  // Registration order matters here as elsewhere: the literal `/queues` path is registered BEFORE
  // the `/queues/:queue/...` matchers so it is not swallowed by them.
  http.get(endpoints.peAdmin.queues, () => ok(mockPeQueuesHealth)),
  http.get(`${ADMIN}/queues/:queue/jobs`, ({ request, params }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'failed';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');
    const queue = String(params.queue);
    // Only the portfolio queue has fixture rows, and only for `failed` — the other tabs must
    // render their empty state, which is worth exercising.
    const jobs =
      queue === 'portfolio' && status === 'failed'
        ? mockPeQueueJobs.map((j) => ({ ...j, queue }))
        : [];
    return ok({ jobs }, { meta: { total: jobs.length, page, pageSize, queue, status } });
  }),
  http.post(`${ADMIN}/queues/:queue/jobs/:jobId/requeue`, ({ params }) =>
    ok({
      job: {
        ...mockPeQueueJobs[0],
        id: String(params.jobId),
        queue: String(params.queue),
        status: 'pending' as const,
        retryCount: 0,
        errorMessage: null,
        isPermanentFailure: false,
      },
    }),
  ),
  // F65 — single-job delete (the per-row Delete action on both queue tables).
  http.delete(`${ADMIN}/queues/:queue/jobs/:jobId`, ({ params }) =>
    ok({ queue: String(params.queue), jobId: String(params.jobId), status: 'failed' }),
  ),
  http.post(`${ADMIN}/queues/:queue/purge`, async ({ request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { status?: string };
    const status = body.status ?? 'failed';
    // Mirror the backend guard rail: only terminal statuses may be purged.
    if (status !== 'failed' && status !== 'completed') {
      return err(400, `Refusing to purge '${status}' — only terminal statuses may be purged.`);
    }
    return ok({ queue: 'portfolio', status, deleted: 2 });
  }),
  http.post(`${ADMIN}/queues/:queue/pause`, async ({ request, params }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { paused?: boolean };
    const queue = String(params.queue);
    return ok({ pausedQueues: body.paused ? [queue] : [], globalPause: mockPeAdminPause });
  }),
  http.get(endpoints.peAdmin.pipelineHealth, () => ok(mockPePipelineHealth)),

  // --- Dedup ---------------------------------------------------------------
  http.get(endpoints.peAdmin.dedupFirms, () => ok(mockPeAdminDedup)),
  http.post(endpoints.peAdmin.dedupFirms, async ({ request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as {
      survivorId?: string;
      loserIds?: string[];
    };
    const group = mockPeAdminDedup.groups[0];
    const survivor = group.firms.find((f) => f.id === body.survivorId) ?? group.firms[0];
    const losers = group.firms.filter((f) => (body.loserIds ?? []).includes(f.id));
    const holdingsMoved = losers.reduce((n, f) => n + f.holdingsCount, 0);
    const peopleMoved = losers.reduce((n, f) => n + f.peopleCount, 0);
    return ok({
      survivorId: survivor.id,
      hostKey: group.hostKey,
      mergedLoserIds: losers.map((f) => f.id),
      holdingsMoved,
      peopleMoved,
      jobsMoved: losers.length,
      reviewItemsMoved: 0,
      correctionsRecorded: 1,
      holdingsCount: survivor.holdingsCount + holdingsMoved,
      peopleCount: survivor.peopleCount + peopleMoved,
    });
  }),

  // --- Not-found removal-review queues ------------------------------------
  http.get(endpoints.peAdmin.notFound('holdings'), () =>
    ok({ items: mockPeAdminNotFoundHoldings }),
  ),
  http.get(endpoints.peAdmin.notFound('people'), () => ok({ items: mockPeAdminNotFoundPeople })),
  http.post(`${ADMIN}/not-found/:id/exit`, () => ok({ ok: true })),
  http.post(`${ADMIN}/not-found/:id/keep`, () => ok({ ok: true })),
  http.delete(`${ADMIN}/not-found/:id`, () => ok({ ok: true })),

  // --- Portfolio quality + backfill actions -------------------------------
  http.get(endpoints.peAdmin.portfolioQualityStatus, () =>
    ok({ op: 'reset-and-backfill', isRunning: false, lastRun: '2026-07-12T09:00:00Z' }),
  ),
  http.get(endpoints.peAdmin.portfolioQuality, () => ok(mockPeAdminPortfolioQuality)),
  http.post(endpoints.peAdmin.resetAndBackfill, () =>
    ok({ op: 'reset-and-backfill', enqueued: true, jobId: 'backfill-1' }, { status: 202 }),
  ),
  http.post(endpoints.peAdmin.queueSampleRescrape, async ({ request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { sampleSize?: number };
    const sampled = body.sampleSize ?? 25;
    return ok({ sampled, queued: sampled - 2, skipped: 2 }, { status: 202 });
  }),

  // --- CU.5: access grants + pipeline status (before the generic `:op` catch-alls) -----
  http.get(endpoints.peAdmin.accessGrants, () =>
    ok({ grants: [{ userId: 'u2', email: 'analyst@client.com', grantedAt: null }] }),
  ),
  http.post(endpoints.peAdmin.accessGrants, async ({ request }) => {
    const body = (await request.json()) as { userId: string; granted: boolean };
    if (body.userId === 'nope') return err(404, 'User not found.');
    return ok({ userId: body.userId, email: `${body.userId}@client.com`, granted: body.granted });
  }),
  http.get(endpoints.peAdmin.pipelineStatus, () =>
    ok({ isRunning: false, lastRun: null, ops: ['clean_holdings'], passes: ['company_master'] }),
  ),

  // --- Two-segment holdings trigger (before the generic single-segment `:op`) ----------
  http.post(`${ADMIN}/holdings/re-enrich-missing-descriptions`, () =>
    ok(
      { op: 'holdings/re-enrich-missing-descriptions', enqueued: true, jobId: 'trig-reenrich' },
      { status: 202 },
    ),
  ),
  http.get(`${ADMIN}/holdings/re-enrich-missing-descriptions/status`, () =>
    ok({ op: 'holdings/re-enrich-missing-descriptions', isRunning: false, lastRun: null }),
  ),

  // --- Generic trigger status + trigger (single segment) — registered LAST ------------
  http.get(`${ADMIN}/:op/status`, ({ params }) =>
    ok({ op: String(params.op), isRunning: false, lastRun: '2026-07-12T09:00:00Z' }),
  ),
  http.post(`${ADMIN}/:op`, ({ params }) =>
    ok(
      { op: String(params.op), enqueued: true, jobId: `trig-${String(params.op)}` },
      { status: 202 },
    ),
  ),
];
