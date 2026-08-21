// PE Dataset — Admin Ops service (F28.2). The typed seam for the STAFF-ONLY
// /api/pe/admin/* surface. Contract: backend Phases/Migration/REF-API-CONTRACT.md
// §PE Dataset — Admin Ops. The backend 403s non-staff regardless of the FE gate;
// mutations echo the CSRF token through the shared http seam.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  PEAccessGrant,
  PEAccessGrantResult,
  PEAdminQueue,
  PEAdminQueueJob,
  PEAdminStats,
  PEPipelineStatus,
  PEDedupMergeBody,
  PEDedupPreview,
  PEDedupResult,
  PENotFoundItem,
  PENotFoundKind,
  PEPipelineHealth,
  PEPortfolioQuality,
  PEPurgeableStatus,
  PEQueueCounts,
  PEQueueJob,
  PEQueueJobsPage,
  PEQueuesHealth,
  PEResetBackfillResult,
  PESampleRescrapeResult,
  PEScrapeJobStatus,
  PEScraperPause,
  PETriggerBody,
  PETriggerResult,
  PETriggerStatus,
} from '@/types';

const ZERO_COUNTS: PEQueueCounts = { pending: 0, running: 0, completed: 0, failed: 0 };

export interface PEAdminService {
  getPause(): Promise<PEScraperPause>;
  setPause(paused: boolean): Promise<PEScraperPause>;
  getQueue(limit?: number, status?: PEScrapeJobStatus): Promise<PEAdminQueue>;
  getStats(windowMinutes?: number): Promise<PEAdminStats>;
  getDedupPreview(): Promise<PEDedupPreview>;
  mergeDedup(body: PEDedupMergeBody): Promise<PEDedupResult>;
  runTrigger(op: string, body?: PETriggerBody): Promise<PETriggerResult>;
  getTriggerStatus(op: string): Promise<PETriggerStatus>;
  getNotFound(kind: PENotFoundKind, limit?: number): Promise<PENotFoundItem[]>;
  deleteNotFound(id: string): Promise<void>;
  exitNotFound(id: string): Promise<void>;
  keepNotFound(id: string): Promise<void>;
  getPortfolioQuality(): Promise<PEPortfolioQuality>;
  getPortfolioQualityStatus(): Promise<PETriggerStatus>;
  resetAndBackfill(dryRun?: boolean): Promise<PEResetBackfillResult>;
  queueSampleRescrape(sampleSize?: number): Promise<PESampleRescrapeResult>;
  // CU.5: pe_dataset access grants + the CU.3 pipeline-status read.
  listAccessGrants(): Promise<PEAccessGrant[]>;
  setAccessGrant(userId: string, granted: boolean): Promise<PEAccessGrantResult>;
  getPipelineStatus(): Promise<PEPipelineStatus>;
  // F50 — per-queue observability + queue ops.
  getQueuesHealth(windowMinutes?: number): Promise<PEQueuesHealth>;
  getQueueJobs(
    queue: string,
    status: string,
    page?: number,
    pageSize?: number,
  ): Promise<PEQueueJobsPage>;
  requeueQueueJob(queue: string, jobId: string): Promise<PEQueueJob>;
  /** F65 — discard one terminal (completed/failed) job. Rejected by the API for live work. */
  deleteQueueJob(queue: string, jobId: string): Promise<{ jobId: string }>;
  purgeQueue(queue: string, status: PEPurgeableStatus): Promise<{ deleted: number }>;
  setQueuePaused(queue: string, paused: boolean): Promise<PEQueuesHealth['pausedQueues']>;
  getPipelineHealth(): Promise<PEPipelineHealth>;
}

export const peAdminService: PEAdminService = {
  getPause: () => http<PEScraperPause>(endpoints.peAdmin.scraperPause),

  setPause: (paused) =>
    http<PEScraperPause>(endpoints.peAdmin.scraperPause, {
      method: 'POST',
      body: JSON.stringify({ paused }),
    }),

  getQueue: async (limit = 50, status) => {
    // `status` is optional on purpose: omitting it reproduces the original request byte-for-byte,
    // so MonitoringPanel's unfiltered read (which filters failures out client-side) is untouched.
    // `meta.counts` stays ALL-status even when filtered — the console renders those counts as the
    // status filter control itself, so narrowing them would make each button report its own filter.
    const query = new URLSearchParams({ limit: String(limit) });
    if (status) query.set('status', status);
    const env = await http.full<{ jobs: PEAdminQueueJob[]; pause: PEScraperPause }>(
      `${endpoints.peAdmin.scrapeQueue}?${query.toString()}`,
    );
    const meta = (env.meta ?? {}) as { counts?: Partial<PEQueueCounts> };
    return {
      jobs: env.data.jobs,
      pause: env.data.pause,
      counts: { ...ZERO_COUNTS, ...(meta.counts ?? {}) },
    };
  },

  getStats: (windowMinutes = 60) =>
    // Backend query param is snake_case (window_minutes); query params are NOT auto-camelCased
    // (only request bodies are), so sending windowMinutes here would be silently dropped.
    http<PEAdminStats>(`${endpoints.peAdmin.stats}?window_minutes=${windowMinutes}`),

  getDedupPreview: () => http<PEDedupPreview>(endpoints.peAdmin.dedupFirms),

  mergeDedup: (body) =>
    http<PEDedupResult>(endpoints.peAdmin.dedupFirms, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  runTrigger: (op, body = {}) =>
    http<PETriggerResult>(endpoints.peAdmin.trigger(op), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getTriggerStatus: (op) => http<PETriggerStatus>(endpoints.peAdmin.triggerStatus(op)),

  getNotFound: async (kind, limit = 200) => {
    const data = await http<{ items: PENotFoundItem[] }>(
      `${endpoints.peAdmin.notFound(kind)}?limit=${limit}`,
    );
    return data.items;
  },

  deleteNotFound: async (id) => {
    await http.full(endpoints.peAdmin.notFoundItem(id), { method: 'DELETE' });
  },

  exitNotFound: async (id) => {
    await http.full(endpoints.peAdmin.notFoundExit(id), { method: 'POST' });
  },

  keepNotFound: async (id) => {
    await http.full(endpoints.peAdmin.notFoundKeep(id), { method: 'POST' });
  },

  getPortfolioQuality: () => http<PEPortfolioQuality>(endpoints.peAdmin.portfolioQuality),

  getPortfolioQualityStatus: () => http<PETriggerStatus>(endpoints.peAdmin.portfolioQualityStatus),

  resetAndBackfill: (dryRun = false) =>
    http<PEResetBackfillResult>(endpoints.peAdmin.resetAndBackfill, {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    }),

  queueSampleRescrape: (sampleSize) =>
    http<PESampleRescrapeResult>(endpoints.peAdmin.queueSampleRescrape, {
      method: 'POST',
      body: JSON.stringify(sampleSize ? { sampleSize } : {}),
    }),

  listAccessGrants: async () =>
    (await http<{ grants: PEAccessGrant[] }>(endpoints.peAdmin.accessGrants)).grants,

  setAccessGrant: (userId, granted) =>
    http<PEAccessGrantResult>(endpoints.peAdmin.accessGrants, {
      method: 'POST',
      body: JSON.stringify({ userId, granted }),
    }),

  getPipelineStatus: () => http<PEPipelineStatus>(endpoints.peAdmin.pipelineStatus),

  // --- F50 ------------------------------------------------------------------
  // Query params stay snake_case: only request BODIES are auto-camelCased, so `windowMinutes`
  // here would be silently dropped (same trap documented on getStats above). `page`/`pageSize`
  // are already the backend's declared spellings.
  getQueuesHealth: (windowMinutes = 60) =>
    http<PEQueuesHealth>(`${endpoints.peAdmin.queues}?window_minutes=${windowMinutes}`),

  getQueueJobs: async (queue, status, page = 1, pageSize = 25) => {
    // http.full — the row total lives in `meta`, which the plain http() unwrapper discards.
    const env = await http.full<{ jobs: PEQueueJob[] }>(
      `${endpoints.peAdmin.queueJobs(queue)}?status=${encodeURIComponent(status)}&page=${page}&pageSize=${pageSize}`,
    );
    const meta = (env.meta ?? {}) as { total?: number; page?: number; pageSize?: number };
    return {
      jobs: env.data.jobs,
      total: meta.total ?? env.data.jobs.length,
      page: meta.page ?? page,
      pageSize: meta.pageSize ?? pageSize,
    };
  },

  requeueQueueJob: async (queue, jobId) => {
    const data = await http<{ job: PEQueueJob }>(endpoints.peAdmin.queueJobRequeue(queue, jobId), {
      method: 'POST',
    });
    return data.job;
  },

  deleteQueueJob: (queue, jobId) =>
    http<{ jobId: string }>(endpoints.peAdmin.queueJobDelete(queue, jobId), { method: 'DELETE' }),

  purgeQueue: (queue, status) =>
    http<{ deleted: number }>(endpoints.peAdmin.queuePurge(queue), {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  setQueuePaused: async (queue, paused) => {
    const data = await http<{ pausedQueues: string[] }>(endpoints.peAdmin.queuePause(queue), {
      method: 'POST',
      body: JSON.stringify({ paused }),
    });
    return data.pausedQueues;
  },

  getPipelineHealth: () => http<PEPipelineHealth>(endpoints.peAdmin.pipelineHealth),
};
