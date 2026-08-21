// QueuePanel (F28.2) — the fleet-wide scrape-queue table, newest first across all seven F46
// collections. Columns: status, job type, firm, retries, error note, claimed-by + heartbeat age.
// Contract: GET /api/pe/admin/scrape-queue. Exposed as `id="pe-admin-queue"` so action panels can
// deep-link.
//
// F50.2: the status-count badges became the status FILTER (shared StatusFilterBar), matching the
// per-queue tabs, and the table defaults to `pending` — the work that is actually waiting.
// Filtering happens server-side via `?status=`: the counts are fleet-wide totals, so slicing the
// 50 fetched rows client-side would show "Failed 3" next to an empty table whenever those three
// failures are older than the 50 newest jobs.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peAdminService } from '@/services/api';
import { Badge, Button, Spinner } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';
import type { PEAdminQueueJob, PEScrapeJobStatus } from '@/types';
import { parseBackendDate } from '@/lib/datetime';
import { peAdminKeys } from './peAdminKeys';
import ConfirmDialog from './ConfirmDialog';
import ExpandableCell from './ExpandableCell';
import StatusFilterBar from './StatusFilterBar';

const STATUS_TONE: Record<PEScrapeJobStatus, 'success' | 'danger' | 'warning' | 'info'> = {
  completed: 'success',
  failed: 'danger',
  running: 'info',
  pending: 'warning',
};

/**
 * Compact relative age for the Heartbeat column.
 *
 * F52.2: this used to read `startedAt`, which is null for every *pending* row — so once F50.2
 * defaulted this table to `pending`, the column was permanently "—". The backend has always sent the
 * real `heartbeatAt` (`PEJobService._job_row`); only the TS type omitted it. Falls back to `startedAt`
 * so a row from an older backend still shows something.
 */
function ageFrom(iso: string | null): string {
  if (!iso) return '—';
  // F64: parseBackendDate treats an offset-less timestamp as UTC. This table had the same bare
  // `new Date(iso)` that made the Heartbeat column read a constant "~6h ago" on a UTC+5:30 browser.
  const then = parseBackendDate(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function firmLabel(job: PEAdminQueueJob): string {
  // F64.4 — name first. This is the DEFAULT landing table ("All queues"), so it is the one an
  // operator actually reads; showing a bare ObjectId here was the whole problem.
  return job.firmName ?? job.firmId ?? job.ibFirmId ?? '—';
}

export interface QueuePanelProps {
  /**
   * Render without the card/heading chrome, for nesting inside QueuesPanel's "All queues" tab
   * (F50). A nested <section> with its own <h2> would double the heading level and duplicate the
   * card border inside the tab panel.
   */
  embedded?: boolean;
}

/** Rows this fleet-wide read asks for. Surfaced as a constant so the truncation notice below cannot
 *  drift from the actual cap. */
const ROW_LIMIT = 50;

export default function QueuePanel({ embedded = false }: QueuePanelProps = {}) {
  const [status, setStatus] = useState<PEScrapeJobStatus>('pending');
  // F65 — the job awaiting delete confirmation.
  const [confirmDelete, setConfirmDelete] = useState<PEAdminQueueJob | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  // F65 — per-row triage on the DEFAULT landing table. Failed rows here previously had no actions
  // at all: an operator had to work out which queue the job belonged to and switch tabs first.
  // `job.queue` now comes from the backend, so the fleet-wide row can address its own queue.
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: peAdminKeys.queue });
    void qc.invalidateQueries({ queryKey: peAdminKeys.queueJobsAll });
    void qc.invalidateQueries({ queryKey: peAdminKeys.queues });
  };

  const requeue = useMutation({
    mutationFn: (job: PEAdminQueueJob) =>
      peAdminService.requeueQueueJob(job.queue ?? job.jobType, job.id),
    onSuccess: () => {
      toast.success('Job requeued — retry count reset.');
      invalidate();
    },
  });

  const deleteJob = useMutation({
    mutationFn: (job: PEAdminQueueJob) =>
      peAdminService.deleteQueueJob(job.queue ?? job.jobType, job.id),
    onSuccess: () => {
      setConfirmDelete(null);
      toast.success('Job deleted.');
      invalidate();
    },
  });

  const { data, isPending } = useQuery({
    queryKey: peAdminKeys.queueByStatus(status),
    queryFn: () => peAdminService.getQueue(ROW_LIMIT, status),
    // Repo idiom (HoldingsTable, PeopleTable, the screener tabs): hold the previous result while
    // the next status loads, so clicking a filter does not blank the filter bar behind a spinner.
    placeholderData: (prev) => prev,
    // F64.6 — this is the table the "All queues" tab lands on, and it polled at nothing at all, so
    // the default view was only ever as fresh as the last mount. Matches the per-queue table's 30s.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const Wrapper = embedded ? 'div' : 'section';

  return (
    <Wrapper
      className={embedded ? 'mt-3' : 'card p-3 mb-4'}
      id={embedded ? undefined : 'pe-admin-queue'}
      aria-labelledby={embedded ? undefined : 'pe-admin-queue-heading'}
    >
      {!embedded && (
        <h2 id="pe-admin-queue-heading" className="h5 mb-3">
          Scrape queue
        </h2>
      )}

      {isPending || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-3">
            <StatusFilterBar
              counts={data.counts}
              active={status}
              onChange={setStatus}
              label="Filter fleet-wide jobs by status"
            />
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Job type</th>
                  <th scope="col">Firm</th>
                  <th scope="col">Retries</th>
                  <th scope="col">Warnings</th>
                  <th scope="col">Error</th>
                  <th scope="col">Claimed by</th>
                  <th scope="col">Heartbeat</th>
                  <th scope="col" className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <Badge tone={STATUS_TONE[job.status]}>{job.status}</Badge>
                    </td>
                    <td>{job.jobType}</td>
                    {/* F65 — expandable, so long names/errors/warning lists are readable in full
                        instead of dying at the CSS ellipsis. */}
                    <ExpandableCell
                      header="Firm"
                      value={firmLabel(job)}
                      className="text-truncate"
                      maxWidth={200}
                      title={job.firmId ?? job.ibFirmId ?? undefined}
                    />
                    <td>{job.retryCount}</td>
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
                      maxWidth={260}
                    />
                    <td>{job.claimedBy ?? '—'}</td>
                    <td className="small text-muted">
                      {ageFrom(job.heartbeatAt ?? job.startedAt)}
                    </td>
                    <td className="text-end">
                      {job.status === 'failed' && (
                        <div className="d-flex gap-2 justify-content-end">
                          <Button
                            onClick={() => requeue.mutate(job)}
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
                {data.jobs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-muted">
                      {/* Named per status: "Queue is empty" under a `failed` filter would read as
                          "no work at all", which is the opposite of what it means. */}
                      No {status} jobs across the fleet.
                    </td>
                  </tr>
                )}
                {/* F52.2 — the counts on the filter buttons are FLEET-WIDE totals, but this read is
                    capped at ROW_LIMIT. Without this line the button could advertise "Pending 500"
                    beside 50 rows and look like the table, not the cap, was wrong. */}
                {data.jobs.length >= ROW_LIMIT && (
                  <tr>
                    <td colSpan={9} className="text-center small text-muted">
                      Showing the {ROW_LIMIT} newest {status} jobs of {data.counts[status]}. Open a
                      queue tab above for the paginated view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* F65 — single-job delete, confirmed because it is irreversible. */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteJob.mutate(confirmDelete)}
        title="Delete this job?"
        confirmLabel="Delete job"
        danger
        pending={deleteJob.isPending}
      >
        {confirmDelete && (
          <>
            <p className="mb-2">
              This permanently removes the <strong>{confirmDelete.status}</strong>{' '}
              <strong>{confirmDelete.jobType}</strong> job for{' '}
              <strong>{firmLabel(confirmDelete)}</strong>.
            </p>
            <p className="small text-muted mb-0">
              The firm and its data are untouched — only the queue row goes. Requeue instead if you
              want the work retried.
            </p>
          </>
        )}
      </ConfirmDialog>
    </Wrapper>
  );
}
