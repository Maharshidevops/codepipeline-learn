// MonitoringPanel (F28.2) — TABLES-FIRST v1 monitoring (no chart library; layout leaves room for
// charts in a later slice, user decision 2026-07-07). Stat tiles + per-strategy table + recent
// failures (from the failed jobs in the scrape queue) come from GET /stats + the queue read. The
// portfolio-companies-quality roll-up (coverage + tiers) gets its own tiles/table plus the
// reset-and-backfill and queue-sample-rescrape actions (each confirm-dialogged).
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Admin Ops (F28 admin-ops additions).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peAdminService } from '@/services/api';
import { Badge, Button, Spinner } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { peAdminKeys } from './peAdminKeys';
import ConfirmDialog from './ConfirmDialog';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="col-6 col-md-3">
      <div className="card p-3 h-100 text-center">
        <div className="h4 mb-0">{value}</div>
        <div className="text-muted small">{label}</div>
      </div>
    </div>
  );
}

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function StatsBlock() {
  const { data: stats, isPending } = useQuery({
    queryKey: peAdminKeys.stats,
    queryFn: () => peAdminService.getStats(60),
  });
  // The /stats shape carries counts, not a failures list, so the recent-failure detail comes from
  // the queue read.
  //
  // F65 — this asked for the 50 newest jobs across ALL statuses and filtered to `failed` in the
  // client. With a busy queue (95 pending) the 50 newest are all pending/running, so ZERO failures
  // survived the filter and the table read "No recent failures" directly beside a tile saying
  // "failures 11". F50.2 documented this exact trap when it fixed QueuePanel; MonitoringPanel was
  // missed. Filter server-side instead — then the rows shown are the newest FAILURES.
  const { data: queue } = useQuery({
    queryKey: peAdminKeys.queueByStatus('failed'),
    queryFn: () => peAdminService.getQueue(50, 'failed'),
  });

  if (isPending || !stats) return <Spinner />;

  const strategies = Object.entries(stats.perStrategy);
  const failures = queue?.jobs ?? [];

  return (
    <>
      <div className="row g-3 mb-3">
        <StatTile label="Jobs / min" value={stats.throughput.perMinute} />
        <StatTile label="Failure rate" value={pct(stats.failureRate.rate)} />
        <StatTile label="Queue depth (pending)" value={stats.queueDepth.pending} />
        <StatTile label="Peak in-flight" value={stats.peakInFlight} />
      </div>

      <p className="text-muted small mb-3">
        Window: last {stats.windowMinutes} min · completed {stats.throughput.completed} · failures{' '}
        {stats.failureRate.total} (permanent {stats.failureRate.permanent}, transient{' '}
        {stats.failureRate.transient}).
      </p>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <h3 className="h6 mb-2">Per-strategy completions</h3>
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Strategy</th>
                  <th scope="col">Completed</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map(([name, count]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{count}</td>
                  </tr>
                ))}
                {strategies.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center text-muted">
                      No completions in the window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <h3 className="h6 mb-2">Recent failures</h3>
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Job type</th>
                  <th scope="col">Firm</th>
                  <th scope="col">Error</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((job) => (
                  <tr key={job.id}>
                    <td>{job.jobType}</td>
                    {/* F64.4 gave the queue read a resolved `firmName`; this table still showed
                        the raw ObjectId. Name first, id as the hover title. */}
                    <td
                      className="text-truncate"
                      style={{ maxWidth: 140 }}
                      title={job.firmId ?? job.ibFirmId ?? undefined}
                    >
                      {job.firmName ?? job.firmId ?? job.ibFirmId ?? '—'}
                    </td>
                    <td className="text-truncate small text-muted" style={{ maxWidth: 220 }}>
                      {job.errorMessage ?? '—'}
                    </td>
                  </tr>
                ))}
                {failures.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      No recent failures.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function QualityBlock() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<'backfill' | 'rescrape' | null>(null);

  const { data: quality, isPending } = useQuery({
    queryKey: peAdminKeys.portfolioQuality,
    queryFn: () => peAdminService.getPortfolioQuality(),
  });
  const status = useQuery({
    queryKey: [...peAdminKeys.portfolioQuality, 'status'],
    queryFn: () => peAdminService.getPortfolioQualityStatus(),
  });

  const backfill = useMutation({
    mutationFn: () => peAdminService.resetAndBackfill(false),
    onSuccess: () => {
      setConfirm(null);
      toast.success('Backfill drain enqueued.');
      void queryClient.invalidateQueries({ queryKey: peAdminKeys.queue });
      void status.refetch();
    },
    onError: () => toast.error('Could not start the backfill.'),
  });

  const rescrape = useMutation({
    mutationFn: () => peAdminService.queueSampleRescrape(),
    onSuccess: (res) => {
      setConfirm(null);
      toast.success(`Sampled ${res.sampled}; queued ${res.queued}, skipped ${res.skipped}.`);
      void queryClient.invalidateQueries({ queryKey: peAdminKeys.queue });
    },
    onError: () => toast.error('Could not queue the sample re-scrape.'),
  });

  if (isPending || !quality) return <Spinner />;

  const coverage = Object.entries(quality.coverage);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="h6 mb-0">Portfolio-companies quality</h3>
        <div className="d-flex gap-2">
          <Button
            variant="popup-secondary"
            onClick={() => setConfirm('rescrape')}
            disabled={rescrape.isPending}
          >
            Queue sample re-scrape
          </Button>
          <Button
            variant="popup-primary"
            onClick={() => setConfirm('backfill')}
            disabled={backfill.isPending || status.data?.isRunning}
          >
            {status.data?.isRunning ? 'Backfill running…' : 'Reset & backfill'}
          </Button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <StatTile label="Live holdings" value={quality.total} />
        <StatTile label="Scanned" value={quality.scanned} />
        <StatTile label="Valid" value={quality.overallTiers.valid} />
        <StatTile
          label="Suspect + invalid"
          value={quality.overallTiers.suspect + quality.overallTiers.invalid}
        />
      </div>

      {quality.capped && (
        <p className="text-warning small" role="note">
          The scan hit its cap — coverage below is a partial roll-up.
        </p>
      )}

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Coverage</th>
              <th scope="col">Present</th>
            </tr>
          </thead>
          <tbody>
            {coverage.map(([field, ratio]) => (
              <tr key={field}>
                <td>{field}</td>
                <td>
                  <Badge tone={ratio >= 0.8 ? 'success' : ratio >= 0.5 ? 'warning' : 'danger'}>
                    {pct(ratio)}
                  </Badge>
                </td>
                <td>{quality.coverageCounts[field] ?? '—'}</td>
              </tr>
            ))}
            {coverage.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-muted">
                  No coverage data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirm === 'backfill'}
        onClose={() => setConfirm(null)}
        onConfirm={() => backfill.mutate()}
        title="Reset & backfill?"
        confirmLabel="Start backfill"
        pending={backfill.isPending}
      >
        <p className="mb-0 small">
          Re-runs the global enrichment drain to backfill missing fields across all live holdings
          (provenance-gated). This enqueues a long-running background job.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'rescrape'}
        onClose={() => setConfirm(null)}
        onConfirm={() => rescrape.mutate()}
        title="Queue a sample re-scrape?"
        confirmLabel="Queue re-scrape"
        pending={rescrape.isPending}
      >
        <p className="mb-0 small">
          Enqueues a portfolio re-scrape for the stalest active firms (default sample size 25).
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function MonitoringPanel() {
  return (
    <section className="card p-3 mb-4" aria-labelledby="pe-admin-monitoring-heading">
      <h2 id="pe-admin-monitoring-heading" className="h5 mb-3">
        Monitoring
      </h2>
      <StatsBlock />
      <hr className="my-4" />
      <QualityBlock />
    </section>
  );
}
