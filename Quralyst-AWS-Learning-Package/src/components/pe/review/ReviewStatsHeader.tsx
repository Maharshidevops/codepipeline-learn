// ReviewStatsHeader (F27.3) — stat tiles (pending/approved/rejected/edited + total) and the
// byReason breakdown from GET /api/pe/review-queue/stats. Tables-first, no chart library (parity
// with the F28.2 monitoring panel).
import { useQuery } from '@tanstack/react-query';
import { peReviewService } from '@/services/api';
import { Badge, Spinner } from '@/components/ui';
import { peReviewKeys } from './peReviewKeys';

const TILES: { key: 'pending' | 'approved' | 'rejected' | 'edited' | 'total'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'edited', label: 'Edited' },
  { key: 'total', label: 'Total' },
];

export default function ReviewStatsHeader() {
  const { data, isPending } = useQuery({
    queryKey: peReviewKeys.stats,
    queryFn: () => peReviewService.getReviewStats(),
  });

  const reasons = data ? Object.entries(data.byReason).sort((a, b) => b[1] - a[1]) : [];

  return (
    <section className="card p-3 mb-4" aria-labelledby="pe-review-stats-heading">
      <h2 id="pe-review-stats-heading" className="h5 mb-3">
        Review queue overview
      </h2>
      {isPending || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="d-flex gap-3 flex-wrap mb-3">
            {TILES.map((tile) => (
              <div key={tile.key} className="text-center">
                <div className="h4 mb-0">{data[tile.key]}</div>
                <div className="text-muted small">{tile.label}</div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="h6 mb-2">By reason</h3>
            {reasons.length === 0 ? (
              <p className="text-muted small mb-0">No items recorded yet.</p>
            ) : (
              <div className="d-flex gap-2 flex-wrap">
                {reasons.map(([reason, count]) => (
                  <Badge key={reason} tone="secondary">
                    {reason} {count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
