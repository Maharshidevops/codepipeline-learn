// companyName → comment count for every row of a result, from ONE all-comments query
// (Phase 29) — not per-row requests. Mutations invalidate the ['comments', resultId] prefix,
// so badges update without refetching the result table itself (no table jank).
import { useQuery } from '@tanstack/react-query';
import { commentsService } from '@/services/api';

export function useCommentCounts(resultId: string | undefined): Record<string, number> {
  const { data } = useQuery({
    queryKey: ['comments', resultId, 'all'],
    queryFn: () => commentsService.list(resultId as string),
    enabled: !!resultId,
  });
  const counts: Record<string, number> = {};
  for (const c of data?.comments ?? []) {
    counts[c.companyName] = (counts[c.companyName] ?? 0) + 1;
  }
  return counts;
}
