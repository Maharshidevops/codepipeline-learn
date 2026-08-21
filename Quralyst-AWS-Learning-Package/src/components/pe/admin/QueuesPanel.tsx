// QueuesPanel (F50) — the scrape estate is SEVEN collections since F46, so one flat table could no
// longer answer "is THIS queue healthy". Tabs per queue (plus an "All" tab that keeps the F28
// fleet-wide view), the status counts doubling as the job filter (shared StatusFilterBar, F50.2),
// a telemetry line, pagination, and the queue ops: per-queue pause, requeue, purge.
//
// Contract: GET /api/pe/admin/queues, GET /api/pe/admin/queues/{queue}/jobs,
// POST .../requeue | .../purge | .../pause.
//
// Two things the UI must say out loud, because both otherwise look like a bug:
//   * drain order is priority *preference* — a busy high-priority queue DELAYS lower ones, never
//     blocks them, so a lower queue's oldest-pending age growing is expected under load;
//   * pausing a queue takes effect on the worker's next tick and does NOT cancel running jobs.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peAdminService } from '@/services/api';
import { Badge, Button, Pagination, Spinner, Tabs } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';
import type { PEQueueHealth, PEQueueJob, PEScrapeJobStatus } from '@/types';
import { parseBackendDate } from '@/lib/datetime';
import { peAdminKeys } from './peAdminKeys';
import ConfirmDialog from './ConfirmDialog';
import ExpandableCell from './ExpandableCell';
import QueuePanel from './QueuePanel';
import StatusFilterBar from './StatusFilterBar';

const ALL_TAB = 'all';
const PAGE_SIZE = 25;

/** Every tab lands on `pending` — the work actually waiting, and the only status that answers
 *  "is this queue moving". `failed` was the old default and it opened on an empty table whenever
 *  the queue was healthy. */
const DEFAULT_STATUS: PEScrapeJobStatus = 'pending';

const STATUS_TONE: Record<PEScrapeJobStatus, 'success' | 'danger' | 'warning' | 'info'> = {
  completed: 'success',
  failed: 'danger',
  running: 'info',
  pending: 'warning',
};

/** Terminal statuses only. The backend 400s anything else so live work cannot be dropped. */
const PURGEABLE: PEScrapeJobStatus[] = ['failed', 'completed'];

function ageLabel(seconds: number | null | undefined): string {
  // `null` means "nothing pending", which is NOT the same as an age of zero — showing "0s" there
  // would read as "the head of the queue is fresh".
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = seconds / 60;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hrs = mins / 60;
  if (hrs < 24) return `${hrs.toFixed(1)}h`;
  return `${(hrs / 24).toFixed(1)}d`;
}

function secondsLabel(value: number | null | undefined): string {
  return value == null ? '—' : `${value < 10 ? value.toFixed(2) : Math.round(value)}s`;
}

function relativeAge(iso: string | null): string {
  if (!iso) return '—';
  const then = parseBackendDate(iso).getTime();
  if (Number.isNaN(then)) return '—';
  return `${ageLabel(Math.max(0, (Date.now() - then) / 1000))} ago`;
}

/** Compact op label from `params` — the single most useful field when triaging a failed job. */
function opLabel(job: PEQueueJob): string {
  const op = job.params?.op;
  return typeof op === 'string' && op ? op : '—';
}

/**
 * The telemetry half of the health line. The count half moved into {@link StatusFilterBar} — the
 * counts were previously rendered here as badges AND again below as filter buttons, so one control
 * now carries both.
 */
function HealthMetrics({ health }: { health: PEQueueHealth }) {
  const starving = (health.oldestPendingAgeSeconds ?? 0) > 3600;
  return (
    <div className="small text-muted d-flex gap-3 flex-wrap align-items-center">
      {/* The starvation detector for F46's priority-preference ordering. */}
      <span title="Age of the oldest pending job — the starvation detector">
        Oldest pending:{' '}
        <strong className={starving ? 'text-danger' : undefined}>
          {ageLabel(health.oldestPendingAgeSeconds)}
        </strong>
      </span>
      <span title={`Nearest-rank over the most recent ${health.latencySampleSize} completions`}>
        p50/p95: {secondsLabel(health.p50LatencySeconds)} / {secondsLabel(health.p95LatencySeconds)}
      </span>
      <span>Throughput: {health.throughputPerHour}/h</span>
      <span
        title={`${health.failedInWindow} failed of ${health.completedInWindow + health.failedInWindow} finished`}
      >
        Failure rate: {(health.failureRate * 100).toFixed(1)}%
      </span>
    </div>
  );
}

export default function QueuesPanel() {
  const [active, setActive] = useState<string>(ALL_TAB);
  const [status, setStatus] = useState<PEScrapeJobStatus>(DEFAULT_STATUS);
  const [page, setPage] = useState(1);
  const [purgeTarget, setPurgeTarget] = useState<PEScrapeJobStatus | null>(null);
  // F65 — the job awaiting delete confirmation. Holds the whole job so the dialog can name it.
  const [confirmDelete, setConfirmDelete] = useState<PEQueueJob | null>(null);
  const qc = useQueryClient();
  // Only success toasts are raised here. Failures are surfaced once, globally, by the
  // MutationCache.onError in App.tsx — which normalises the API error and therefore shows the
  // backend's OWN message (e.g. why a purge was refused). A local onError would both double-toast
  // and replace that specific text with a generic one.
  const toast = useToast();

  const { data: healthData, isPending: healthPending } = useQuery({
    queryKey: peAdminKeys.queues,
    queryFn: () => peAdminService.getQueuesHealth(),
    // F52: this view now carries worker liveness, and a "nothing is draining" banner is worthless if
    // it is only as fresh as the last mount or window focus. 20s pairs with the worker's ~10s
    // heartbeat and the backend's ~30s health memo.
    refetchInterval: 20_000,
  });

  const isAll = active === ALL_TAB;
  const health = healthData?.queues.find((q) => q.queue === active);
  const paused = !!healthData?.pausedQueues.includes(active);

  const { data: jobsPage, isPending: jobsPending } = useQuery({
    queryKey: peAdminKeys.queueJobs(active, status, page),
    queryFn: () => peAdminService.getQueueJobs(active, status, page, PAGE_SIZE),
    enabled: !isAll,
    // Hold the previous rows while the next status/page loads, so the table does not collapse to a
    // spinner on every filter click (repo idiom — HoldingsTable, PeopleTable, the screener tabs).
    placeholderData: (prev) => prev,
    // F64 unit 6: the health line above polled at 20s but the ROWS never did, so the table an
    // operator is actually watching was only ever as fresh as the last mount, focus or mutation —
    // jobs appeared to sit in `pending` long after the worker had finished them. 30s is slower
    // than the health poll on purpose: this is a paginated query and the counts are the thing that
    // needs to move first.
    refetchInterval: 30_000,
    // Never poll a tab nobody is looking at. Without this a forgotten console keeps two queries
    // running against the estate all night.
    refetchIntervalInBackground: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: peAdminKeys.queues });
    void qc.invalidateQueries({ queryKey: peAdminKeys.queueJobsAll });
    // The legacy fleet-wide table shares the estate, so it is stale after any queue mutation.
    void qc.invalidateQueries({ queryKey: peAdminKeys.queue });
  };

  const requeue = useMutation({
    mutationFn: (jobId: string) => peAdminService.requeueQueueJob(active, jobId),
    onSuccess: () => {
      toast.success('Job requeued — retry count reset.');
      invalidate();
    },
  });

  // F65 — discard one dead job. Purge (below) is fleet-of-queue wide; an operator triaging a
  // failure list needs to drop a single unrecoverable row without losing the others.
  const deleteJob = useMutation({
    mutationFn: (jobId: string) => peAdminService.deleteQueueJob(active, jobId),
    onSuccess: () => {
      setConfirmDelete(null);
      toast.success('Job deleted.');
      invalidate();
    },
    // No local onError, per the note above: the global MutationCache handler shows the backend's
    // own message — here that is the specific "only terminal statuses may be removed" refusal.
  });

  const purge = useMutation({
    mutationFn: (target: PEScrapeJobStatus) =>
      peAdminService.purgeQueue(active, target as 'failed' | 'completed'),
    onSuccess: (res, target) => {
      toast.success(`Purged ${res.deleted} ${target} job(s) from '${active}'.`);
      setPage(1);
      invalidate();
    },
  });

  const togglePause = useMutation({
    mutationFn: (next: boolean) => peAdminService.setQueuePaused(active, next),
    onSuccess: (_res, next) => {
      toast.success(
        next
          ? `Queue '${active}' paused. Takes effect within one worker tick; running jobs are not cancelled.`
          : `Queue '${active}' resumed.`,
      );
      invalidate();
    },
  });

  const changeTab = (id: string) => {
    setActive(id);
    setStatus(DEFAULT_STATUS);
    setPage(1);
  };

  const changeStatus = (next: PEScrapeJobStatus) => {
    setStatus(next);
    setPage(1);
  };

  const tabs = [
    { id: ALL_TAB, label: 'All queues', controls: 'pe-admin-queue-panel' },
    ...(healthData?.queues ?? []).map((q) => ({
      id: q.queue,
      // The operator's vocabulary ("companies") is more useful than the internal name
      // ("portfolio"), but the internal name is what the API and logs use — show both.
      label: `${q.label} (${q.queue})`,
      // Pending is the actionable number for a queue tab, not the all-time total.
      count: q.pending,
      controls: 'pe-admin-queue-panel',
    })),
  ];

  return (
    <section
      className="card p-3 mb-4"
      id="pe-admin-queues"
      aria-labelledby="pe-admin-queues-heading"
    >
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h2 id="pe-admin-queues-heading" className="h5 mb-1">
            Queues
          </h2>
          <p className="small text-muted mb-0">
            One collection per job type since F46. Drain order is priority <em>preference</em> — a
            busy high-priority queue delays lower ones, it never blocks them.
          </p>
        </div>
        {healthData && (
          <div className="small text-muted text-end">
            {/* The per-status fleet totals used to be repeated here; they are now the "All queues"
                tab's own filter bar, so only the one number no view shows stays. (The queue count
                is not restated either — the tab row IS the count.) */}
            <div>
              Oldest pending anywhere: {ageLabel(healthData.totals.oldestPendingAgeSeconds)}
            </div>
          </div>
        )}
      </div>

      {/* F55 — above even the liveness banner: if the READ itself failed, every number below
          (including workerLiveness) is untrustworthy. On a dead DB connection the per-queue reads
          degrade to all-zero, which without this looks like a healthy, empty estate — the exact
          console equivalent of the one-liner bug F55 fixed. */}
      {healthData?.status === 'error' && (
        <div className="alert alert-danger py-2 small" role="alert">
          <strong>Queue health could not be read — these numbers are not reliable.</strong> The
          all-zero counts below are a failed-read fallback, not an empty estate.
          {healthData.erroredQueues && healthData.erroredQueues.length > 0
            ? ` Failed queues: ${healthData.erroredQueues.join(', ')}.`
            : ''}{' '}
          Check MongoDB connectivity and the API logs.
        </div>
      )}

      {/* F52 — the first thing to know, above everything else. Every other number on this page is
          derived from job rows, so an idle worker and a dead one render identically: a quiet estate
          looks healthy whether or not anything is draining. Branch on `anyAlive === false` only —
          `null` means the liveness read failed and must not be shown as "dead". */}
      {healthData?.workerLiveness?.anyAlive === false && (
        <div className="alert alert-danger py-2 small" role="alert">
          <strong>No scraper worker has checked in — nothing is draining.</strong>{' '}
          {healthData.workerLiveness.newestTickAgeSeconds == null
            ? 'No worker has ever reported in; check that the scraper process is deployed.'
            : `Last heartbeat ${ageLabel(healthData.workerLiveness.newestTickAgeSeconds)} ago.`}
          {healthData.workerLiveness.workers.some((w) => w.stopping)
            ? ' One or more workers reported a deliberate shutdown, so this may be an intentional scale-to-zero.'
            : ''}
          {healthData.totals.running > 0
            ? ` ${healthData.totals.running} job(s) are stuck in "running": stale-claim reclaim happens inside the worker, so nothing will requeue them until one is back.`
            : ''}
        </div>
      )}

      {/* F51 — a handler past its hard timeout keeps running and keeps its slot; the row already says
          failed. A count that never returns to zero is a hung handler, not a busy one. */}
      {!!healthData?.workerLiveness?.abandonedThreads && (
        <div className="alert alert-warning py-2 small" role="status">
          <strong>{healthData.workerLiveness.abandonedThreads} abandoned handler(s).</strong> Past
          the hard timeout, still running, still holding a slot each — their jobs are already marked
          failed. If this does not fall back to zero, a handler is hung.
        </div>
      )}

      {healthData?.globalPause.paused && (
        <div className="alert alert-warning py-2 small" role="status">
          <strong>The whole scraper is paused.</strong> Per-queue state below is irrelevant until it
          is resumed
          {healthData.globalPause.envOverride
            ? ' — and the SCRAPER_PAUSED env override is set, so the DB toggle cannot clear it (needs a worker restart).'
            : '.'}
        </div>
      )}

      {/* Deliberately NOT gated on the health query: the "All queues" tab needs no health data, and
          blocking on it would make the fleet-wide table appear later than it did before F50. The
          tabs render immediately (counts fill in when health lands) and only the per-queue health
          strip waits. */}
      <Tabs tabs={tabs} active={active} onChange={changeTab} />

      <div id="pe-admin-queue-panel" role="tabpanel" aria-labelledby={`tab-${active}`}>
        {isAll ? (
          // The F28 fleet-wide table, unchanged — kept so nothing is lost by the split.
          <QueuePanel embedded />
        ) : healthPending ? (
          <Spinner />
        ) : !health ? (
          <p className="text-muted mt-3 mb-0">Unknown queue.</p>
        ) : (
          <>
            {/* One region, labelled for the queue: the status counts (as the filter), the ops, and
                the telemetry. `aria-label` names the queue so a screen reader reading two
                consecutive queue views can tell them apart. */}
            {/* F52.2 — `role="group"` is load-bearing, not decoration: an aria-label on a bare <div>
                has no role to attach to, so most assistive tech ignores it outright. The test's
                getByLabelText still passed, which is why this went unnoticed. */}
            <div className="mt-3 mb-3" role="group" aria-label={`${health.label} queue health`}>
              <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
                <StatusFilterBar
                  counts={health}
                  active={status}
                  onChange={changeStatus}
                  retrying={health.retrying}
                  permanentFailures={health.permanentFailures}
                  label={`Filter ${health.label} jobs by status`}
                />
                {paused && <Badge tone="danger">Paused</Badge>}

                <div className="ms-auto d-flex gap-2">
                  <Button
                    onClick={() => togglePause.mutate(!paused)}
                    disabled={togglePause.isPending}
                    loading={togglePause.isPending}
                    data-testid="pe-queue-pause-toggle"
                  >
                    {paused ? 'Resume queue' : 'Pause queue'}
                  </Button>
                  <Button
                    variant="stop"
                    disabled={!PURGEABLE.includes(status) || purge.isPending}
                    title={
                      PURGEABLE.includes(status)
                        ? `Delete every ${status} job in this queue`
                        : 'Only terminal statuses (failed, completed) can be purged — live work is protected'
                    }
                    onClick={() => setPurgeTarget(status)}
                  >
                    Purge {status}
                  </Button>
                </div>
              </div>

              <HealthMetrics health={health} />
            </div>

            {jobsPending ? (
              <Spinner />
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th scope="col">Status</th>
                        <th scope="col">Firm</th>
                        <th scope="col">Op</th>
                        <th scope="col">Retries</th>
                        <th scope="col">Warnings</th>
                        <th scope="col">Error</th>
                        <th scope="col">Claimed by</th>
                        <th scope="col">Heartbeat</th>
                        <th scope="col">Created</th>
                        <th scope="col" className="text-end">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(jobsPage?.jobs ?? []).map((job) => (
                        <tr key={job.id}>
                          <td>
                            <Badge tone={STATUS_TONE[job.status]}>{job.status}</Badge>
                            {job.isPermanentFailure && (
                              <>
                                {' '}
                                <span title="Retrying cannot help this job">
                                  <Badge tone="danger">permanent</Badge>
                                </span>
                              </>
                            )}
                          </td>
                          {/* F64 unit 4: name first, id in the tooltip. Triage used to start by
                              copying an ObjectId into another view to find out whose job it was.
                              F65: expandable, so a long name is readable in full. */}
                          <ExpandableCell
                            header="Firm"
                            value={job.firmName ?? job.firmId ?? job.ibFirmId}
                            className="text-truncate"
                            maxWidth={180}
                            title={job.firmId ?? job.ibFirmId ?? undefined}
                          />
                          <td className="small">{opLabel(job)}</td>
                          <td>{job.retryCount}</td>
                          {/* Count badge, codes in the modal — F65 replaces the hover-only
                              `title`, which was unreachable by keyboard and unreadable on touch. */}
                          <ExpandableCell
                            header="Warnings"
                            value={job.warnings?.length ? job.warnings.join('\n') : null}
                            className="small"
                            display={
                              job.warnings?.length ? (
                                <Badge tone="warning">{job.warnings.length}</Badge>
                              ) : undefined
                            }
                          />
                          <ExpandableCell
                            header="Error"
                            value={job.errorMessage}
                            className="text-truncate small text-muted"
                            maxWidth={300}
                          />
                          <td className="small">{job.claimedBy ?? '—'}</td>
                          <td className="small text-muted">{relativeAge(job.heartbeatAt)}</td>
                          <td className="small text-muted">{relativeAge(job.createdAt)}</td>
                          {/* F65 — a failed row now carries its full triage set: retry it, edit
                              the firm that produced it, or discard it. Previously the only action
                              was Requeue, so a job failing on bad firm data (wrong portfolio URL,
                              dead domain) could only be retried into the same failure. */}
                          <td className="text-end">
                            {job.status === 'failed' && (
                              <div className="d-flex gap-2 justify-content-end">
                                <Button
                                  onClick={() => requeue.mutate(job.id)}
                                  disabled={requeue.isPending}
                                  title="Reset to pending with a clean retry count"
                                >
                                  Requeue
                                </Button>
                                {job.firmId && (
                                  <Link
                                    className="btn btn-secondary btn-sm"
                                    to={paths.pe.firm(job.firmId)}
                                    title="Open the firm to correct its URLs or details"
                                  >
                                    Firm
                                  </Link>
                                )}
                                <Button
                                  variant="stop"
                                  onClick={() => setConfirmDelete(job)}
                                  disabled={deleteJob.isPending}
                                  title="Discard this job"
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(jobsPage?.jobs.length ?? 0) === 0 && (
                        <tr>
                          {/* 10 columns: Status, Firm, Op, Retries, Warnings, Error, Claimed by,
                              Heartbeat, Created, Actions. This said 9, so the empty-state row was
                              one short and the last column fell outside it. */}
                          <td colSpan={10} className="text-center text-muted">
                            No {status} jobs in this queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!!jobsPage && jobsPage.total > jobsPage.pageSize && (
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <span className="small text-muted">
                      {jobsPage.total} {status} job(s)
                    </span>
                    <Pagination
                      page={jobsPage.page}
                      totalPages={Math.ceil(jobsPage.total / jobsPage.pageSize)}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={purgeTarget !== null}
        onClose={() => setPurgeTarget(null)}
        onConfirm={() => {
          if (purgeTarget) purge.mutate(purgeTarget);
          setPurgeTarget(null);
        }}
        title={`Purge ${purgeTarget ?? ''} jobs?`}
        confirmLabel={`Purge ${purgeTarget ?? ''}`}
        danger
        pending={purge.isPending}
      >
        <p className="mb-2">
          This permanently deletes every <strong>{purgeTarget}</strong> job in the{' '}
          <strong>{active}</strong> queue.
        </p>
        <p className="small text-muted mb-0">
          Completed and failed rows are queue <em>exhaust</em>, not work. Pending and running jobs
          cannot be purged — the backend refuses them so live work is never dropped by mistake.
        </p>
      </ConfirmDialog>

      {/* F65 — single-job delete. Confirmed like the purge: it is irreversible. */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteJob.mutate(confirmDelete.id)}
        title="Delete this job?"
        confirmLabel="Delete job"
        danger
        pending={deleteJob.isPending}
      >
        {confirmDelete && (
          <>
            <p className="mb-2">
              This permanently removes the <strong>{confirmDelete.status}</strong> job for{' '}
              <strong>{confirmDelete.firmName ?? confirmDelete.firmId ?? 'this firm'}</strong> from
              the <strong>{active}</strong> queue.
            </p>
            <p className="small text-muted mb-0">
              The firm and its data are untouched — only the queue row goes. Requeue instead if you
              want the work retried.
            </p>
          </>
        )}
      </ConfirmDialog>
    </section>
  );
}
