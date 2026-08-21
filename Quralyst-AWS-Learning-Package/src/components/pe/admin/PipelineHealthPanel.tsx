// PipelineHealthPanel (F50) — Tier-5 *data* health, as opposed to QueuesPanel's *plumbing* health.
// Contract: GET /api/pe/admin/pipeline-health.
//
// The reason this panel exists is the alert at the top. F47 decides "this firm changed" from three
// read-only timestamps, so a MISSED signal is invisible by construction: a firm that should have
// been re-projected looks exactly like one that genuinely did not change. The one observable
// difference is staleness rising while the projection queue is EMPTY — which the backend computes as
// `suspectedMissedSignal`. Without surfacing it, F47's change gating is unfalsifiable.
//
// F53 gives that boolean a SECOND cause: `scanCoverageStalled`, the detector's sweep not completing
// a pass. The two need different alerts because they need different fixes — "the detector is running
// and not marking firms" is a code bug, "the detector is not running" is an ops problem — and the
// original copy ("the queue is empty and nothing is marked dirty") is simply untrue in the second
// case. So the coverage cause takes precedence: it is the upstream one, and if the sweep is not
// running the other numbers cannot be trusted anyway.
//
// Each sub-object carries its own `status`; a failing read is `{status:'error'}` with NO other keys,
// so every field is rendered defensively rather than assumed present.
import { useQuery } from '@tanstack/react-query';
import { peAdminService } from '@/services/api';
import { Badge, Spinner } from '@/components/ui';
import type { PEChangeGating, PEProjectionStaleness, PESemanticCoverage } from '@/types';
import { peAdminKeys } from './peAdminKeys';

function duration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = seconds / 60;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hrs = mins / 60;
  if (hrs < 48) return `${hrs.toFixed(1)}h`;
  return `${(hrs / 24).toFixed(1)}d`;
}

function num(value: number | null | undefined): string {
  return value == null ? '—' : String(value);
}

function pct(value: number | null | undefined): string {
  // null means "nothing to be a percentage of" — 0% would read as "we have none".
  return value == null ? '—' : `${value.toFixed(1)}%`;
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <tr>
      <th scope="row" className="fw-normal text-muted small">
        {label}
        {hint && (
          <>
            {' '}
            <i className="bi bi-info-circle" aria-hidden="true" title={hint} />
          </>
        )}
      </th>
      <td className="text-end">{value}</td>
    </tr>
  );
}

function ErrorNote({ what }: { what: string }) {
  return (
    <p className="small text-muted mb-0">
      Could not read {what}. The metric degrades rather than failing the console — check the worker
      logs.
    </p>
  );
}

function ProjectionCard({ data }: { data: PEProjectionStaleness }) {
  if (data.status !== 'ok') return <ErrorNote what="projection staleness" />;
  const reasons = Object.entries(data.dirtyReasons ?? {});
  return (
    <table className="table table-sm mb-0">
      <tbody>
        <Row label="Active firms" value={num(data.activeFirms)} />
        <Row
          label="Never projected"
          value={num(data.neverProjected)}
          hint="Active firms with no successful projection at all"
        />
        <Row label="Marked dirty" value={num(data.dirty)} />
        <Row
          label="Max staleness"
          value={duration(data.maxStalenessSeconds)}
          hint="Age of the oldest successful projection"
        />
        <Row label="p95 staleness" value={duration(data.p95StalenessSeconds)} />
        <Row label="Projection queue pending" value={num(data.projectionQueuePending)} />
        <Row label="With last error" value={num(data.withLastError)} />
        <Row
          label="Since full scan"
          value={
            data.everCompletedFullScan === false && data.secondsSinceFullScan == null
              ? 'not yet'
              : duration(data.secondsSinceFullScan)
          }
          hint={
            'How long since the change detector last finished a pass over every active firm. ' +
            `A full pass should take about ${duration(data.expectedFullScanSeconds)}.`
          }
        />
        <Row
          label="Since last sweep"
          value={data.scraperPaused ? 'paused' : duration(data.secondsSinceLastSweep)}
          hint={
            'The detector sweeps every 5 minutes; this is the number the stalled-sweep alert is ' +
            'derived from. Shows "paused" while the estate is paused, when it is meant to stop.'
          }
        />
        {reasons.length > 0 && (
          <tr>
            <th scope="row" className="fw-normal text-muted small">
              Dirty reasons
            </th>
            <td className="text-end">
              <span className="d-inline-flex gap-1 flex-wrap justify-content-end">
                {reasons.map(([reason, count]) => (
                  <Badge key={reason} tone="info">
                    {reason.replace(/_/g, ' ')} {count}
                  </Badge>
                ))}
              </span>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function SemanticCard({ data }: { data: PESemanticCoverage }) {
  if (data.status !== 'ok') return <ErrorNote what="semantic coverage" />;
  const staleFirms = data.staleModelFirms ?? 0;
  const staleCompanies = data.staleModelCompanies ?? 0;
  return (
    <>
      <table className="table table-sm mb-2">
        <tbody>
          <Row label="Embedding model" value={data.embeddingModel ?? '—'} />
          <Row
            label="Firm vectors"
            value={`${num(data.firmsWithVector)} / ${num(data.projectedFirms)} (${pct(data.firmVectorCoveragePct)})`}
          />
          <Row
            label="Company vectors"
            value={`${num(data.companyVectors)} / ${num(data.liveDistinctCompanies)} (${pct(data.companyVectorCoveragePct)})`}
            hint="Denominator is DISTINCT live companies — a company held by several firms is embedded once"
          />
          <Row
            label="Written (24h)"
            value={num(data.companyVectorsWritten24h)}
            hint="Cost proxy. Near zero in steady state — the content-hash gate makes an unchanged re-scrape free"
          />
        </tbody>
      </table>
      {(staleFirms > 0 || staleCompanies > 0) && (
        <p className="small mb-0">
          <Badge tone="warning">
            Stale model: {staleFirms} firm(s), {staleCompanies} company vector(s)
          </Badge>{' '}
          <span className="text-muted">
            These are in a <em>different vector space</em>, not merely old — similarity against a
            current query is meaningless until they are re-embedded.
          </span>
        </p>
      )}
    </>
  );
}

function GatingCard({ data }: { data: PEChangeGating }) {
  if (data.status !== 'ok') return <ErrorNote what="change-gating effectiveness" />;
  const ratio = data.projectionsPerScrape;
  // ~1.0 means every scrape still triggers a projection, i.e. F47's gate is buying nothing.
  const notGating = ratio != null && ratio >= 0.9;
  return (
    <>
      <table className="table table-sm mb-2">
        <tbody>
          <Row label="Window" value={`${num(data.windowHours)}h`} />
          <Row label="Portfolio scrapes completed" value={num(data.portfolioScrapesCompleted)} />
          <Row label="Projections completed" value={num(data.projectionsCompleted)} />
          <Row
            label="Projections per scrape"
            value={ratio == null ? '—' : ratio.toFixed(3)}
            hint="Pre-F47 this was ~1.0; after change gating it should fall toward the true change rate"
          />
        </tbody>
      </table>
      {notGating && (
        <p className="small mb-0">
          <Badge tone="warning">Gate not gating</Badge>{' '}
          <span className="text-muted">
            Nearly every scrape is still projecting — F47&apos;s change gating is buying little
            here.
          </span>
        </p>
      )}
    </>
  );
}

export default function PipelineHealthPanel() {
  const { data, isPending } = useQuery({
    queryKey: peAdminKeys.pipelineHealth,
    queryFn: () => peAdminService.getPipelineHealth(),
  });

  const staleness = data?.projectionStaleness;
  const scanStalled = staleness?.scanCoverageStalled === true;
  // Only the "detector is running but not marking" reading gets the original copy — see the
  // header note. When coverage is the cause, that copy would describe the wrong problem.
  const missed = staleness?.suspectedMissedSignal === true && !scanStalled;

  return (
    <section
      className="card p-3 mb-4"
      id="pe-admin-pipeline-health"
      aria-labelledby="pe-admin-pipeline-health-heading"
    >
      <h2 id="pe-admin-pipeline-health-heading" className="h5 mb-1">
        FV pipeline health
      </h2>
      <p className="small text-muted mb-3">
        Is the Financial Verticals read model actually up to date and embedded? (Queue depth above
        is the plumbing; this is the data.)
      </p>

      {isPending || !data ? (
        <Spinner />
      ) : (
        <>
          {scanStalled && (
            <div className="alert alert-danger py-2 small" role="alert">
              <strong>Change detector is not running.</strong> Its last sweep was{' '}
              {duration(data.projectionStaleness.secondsSinceLastSweep)} ago; it should run every 5
              minutes. Firms it has not reached are going stale in FV, and once they all have a
              state row from an earlier backfill that staleness does not show up in the counts below
              — they keep reading clean while the data ages. Check that the scraper worker is alive
              (Queues panel above) and look for <code>fv change detection sweep failed</code> in its
              logs.
            </div>
          )}

          {missed && (
            <div className="alert alert-danger py-2 small" role="alert">
              <strong>Suspected missed change signal.</strong> Firms need projecting, yet the
              projection queue is empty and nothing is marked dirty — so the change detector is
              probably not marking firms it should. This is a code-level problem, not a backlog.
              Re-run the detector, or force a full rebuild with{' '}
              <code>enqueue_all_projections(force=True)</code> (see{' '}
              <code>docs/PE_QUEUE_RUNBOOK.md</code> §3).
            </div>
          )}

          <div className="row g-3">
            <div className="col-lg-4">
              <div className="pea-action-card">
                <h3 className="pea-action-card__title mb-3">Projection staleness</h3>
                <ProjectionCard data={data.projectionStaleness} />
              </div>
            </div>
            <div className="col-lg-4">
              <div className="pea-action-card">
                <h3 className="pea-action-card__title mb-3">Semantic coverage</h3>
                <SemanticCard data={data.semanticCoverage} />
              </div>
            </div>
            <div className="col-lg-4">
              <div className="pea-action-card">
                <h3 className="pea-action-card__title mb-3">Change gating</h3>
                <GatingCard data={data.changeGating} />
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
