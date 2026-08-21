// Stable, typed TanStack Query keys for the PE Admin Ops console (F28.2). Mutations that
// change scraper/queue/stats state invalidate the relevant key so the tables refetch.
export const peAdminKeys = {
  all: ['pe', 'admin'] as const,
  pause: ['pe', 'admin', 'pause'] as const,
  queue: ['pe', 'admin', 'queue'] as const,
  // F50.2: the fleet-wide table is status-filtered now, so it needs a key per status.
  // F65: MonitoringPanel's recent-failures list used to use the unfiltered `queue` key and pick
  // the failures out client-side — which is the exact trap F50.2 called out for QueuePanel, and it
  // silently emptied the table (see MonitoringPanel). It now reads `queueByStatus('failed')` like
  // everything else; `queue` remains only as the INVALIDATION PREFIX, since it is a prefix of this
  // key and the existing `invalidateQueries({queryKey: peAdminKeys.queue})` calls drop both.
  queueByStatus: (status: string) => ['pe', 'admin', 'queue', 'by-status', status] as const,
  stats: ['pe', 'admin', 'stats'] as const,
  dedup: ['pe', 'admin', 'dedup'] as const,
  notFound: (kind: 'holdings' | 'people') => ['pe', 'admin', 'not-found', kind] as const,
  portfolioQuality: ['pe', 'admin', 'portfolio-quality'] as const,
  accessGrants: ['pe', 'admin', 'access-grants'] as const, // CU.5
  // F50 — per-queue health + the paginated per-queue job list. `queueJobsAll` is the prefix an
  // invalidate() uses to drop every (queue, status, page) combination at once.
  queues: ['pe', 'admin', 'queues'] as const,
  queueJobsAll: ['pe', 'admin', 'queue-jobs'] as const,
  queueJobs: (queue: string, status: string, page: number) =>
    ['pe', 'admin', 'queue-jobs', queue, status, page] as const,
  pipelineHealth: ['pe', 'admin', 'pipeline-health'] as const,
};
