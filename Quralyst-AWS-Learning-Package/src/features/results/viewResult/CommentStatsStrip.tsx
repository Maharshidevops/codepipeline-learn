// Per-result comment stats strip (Phase 29): total + per-user breakdown, fed by the stats
// endpoint via TanStack Query. Renders nothing while the result has no comments.
import { useQuery } from '@tanstack/react-query';
import { commentsService } from '@/services/api';
import './comment-modal.css';

export default function CommentStatsStrip({ resultId }: { resultId: string | undefined }) {
  const { data } = useQuery({
    queryKey: ['comments', resultId, 'stats'],
    queryFn: () => commentsService.getStats(resultId as string),
    enabled: !!resultId,
  });
  const stats = data?.stats;
  if (!stats || stats.total === 0) return null;

  return (
    <div className="comment-stats">
      <i className="bi bi-chat-text me-2" />
      <strong>{stats.total}</strong> comment{stats.total > 1 ? 's' : ''} on this result
      {stats.perUser.length > 0 && (
        <span className="ms-2 text-secondary">
          ({stats.perUser.map((u) => `${u.name}: ${u.count}`).join(' · ')})
        </span>
      )}
    </div>
  );
}
