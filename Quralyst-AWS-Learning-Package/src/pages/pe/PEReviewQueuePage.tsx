// PE Review Queue page (F27.3) — human-QA triage over dataset anomalies (blocked stale removals,
// low-confidence exit checks, junk-cleanup "review not delete" items). Composes the stats header +
// the filterable review table (with the diff-view drawer + bulk-approve) over the F27
// /api/pe/review-queue/* surface via peReviewService. Gated by the /pe RoleRoute (pe:dataset — staff
// OR the per-user grant). Contract: backend REF-API-CONTRACT.md §PE Dataset — Review Queue.
import ReviewStatsHeader from '@/components/pe/review/ReviewStatsHeader';
import ReviewQueuePanel from '@/components/pe/review/ReviewQueuePanel';

export default function PEReviewQueuePage() {
  return (
    <div className="container">
      <div className="mb-4">
        <h1 className="mb-1">PE Review Queue</h1>
        <p className="text-muted mb-0">
          Triage dataset anomalies — review each proposed change, then approve, reject or edit.
        </p>
      </div>

      <ReviewStatsHeader />
      <ReviewQueuePanel />
    </div>
  );
}
