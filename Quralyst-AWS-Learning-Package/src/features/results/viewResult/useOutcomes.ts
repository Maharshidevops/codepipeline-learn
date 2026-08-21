// firmKey → resolved outcome for every row of a result, from ONE outcomes query (Tier A / A5) —
// same pattern as useCommentCounts. OutcomeTagSelect invalidates ['outcomes', resultId] after a
// save so other consumers stay consistent without refetching the result table.
import { useQuery } from '@tanstack/react-query';
import { outcomesService } from '@/services/api';
import type { ResolvedOutcome, ResultKind } from '@/services/api';

export function useOutcomes(
  resultId: string | undefined,
  kind: ResultKind = 'processed',
): Record<string, ResolvedOutcome> {
  const { data } = useQuery({
    queryKey: ['outcomes', resultId, kind],
    queryFn: () => outcomesService.list(resultId as string, kind),
    enabled: !!resultId,
  });
  const byKey: Record<string, ResolvedOutcome> = {};
  for (const o of data ?? []) {
    byKey[o.firm_key] = o;
  }
  return byKey;
}
