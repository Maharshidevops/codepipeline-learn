// Shared lookup of the result metadata across the result-workspace tabs (mirrors the
// legacy `result` object). Split out of ResultLayout.tsx so that file only exports
// components (react-refresh/only-export-components — HMR fast-refresh). The Data tab
// reuses the exact same cache entry instead of re-fetching.
import { useQuery } from '@tanstack/react-query';
import { resultsService } from '@/services/api';
import type { FiltersApplied, ResultSummary } from '@/types';

export const resultSummaryMetaKey = (resultId: string | undefined) => [
  'result-summary-meta',
  resultId,
];

function detailAsSummary(
  resultId: string,
  detail: Awaited<ReturnType<typeof resultsService.get>>,
): ResultSummary {
  return {
    processId: detail.processId || resultId,
    resultId: resultId.startsWith('fv_') ? resultId : undefined,
    createdAt: detail.createdAt,
    username: '',
    userId: '',
    totalMatches: detail.totalMatches,
    totalCount: detail.totalRows,
    filesUploaded: detail.filesUploaded ?? [],
    filtersApplied: (detail.filtersApplied || {}) as FiltersApplied,
    resultFilename: detail.resultFilename,
    hasResultsFile: (detail.totalRows ?? detail.rows?.length ?? 0) > 0,
    status: detail.status,
    version: detail.version,
    versionGroup: detail.versionGroup,
  };
}

export function useResultSummaryMeta(resultId: string | undefined) {
  return useQuery<ResultSummary | null>({
    queryKey: resultSummaryMetaKey(resultId),
    enabled: !!resultId,
    queryFn: async () => {
      const tabs = ['target-list', 'strategic-buyer', 'fv-results'] as const;
      for (const tab of tabs) {
        // Walk a few pages so metadata still resolves when the result isn't on page 1.
        for (let page = 1; page <= 3; page += 1) {
          const res = await resultsService.list(tab, { page, userFilter: 'all', sortBy: 'newest' });
          const match = res.results.find(
            (r) => r.processId === resultId || r.resultId === resultId,
          );
          if (match) {
            // Prefer detail payload for filesUploaded when the listing row is thin.
            if ((!match.filesUploaded || match.filesUploaded.length === 0) && resultId) {
              try {
                const detail = await resultsService.get(resultId);
                if (detail.filesUploaded?.length) {
                  return { ...match, filesUploaded: detail.filesUploaded };
                }
              } catch {
                /* keep listing match */
              }
            }
            return match;
          }
          if (!res.pagination?.hasNext) break;
        }
      }
      // Last resort: detail endpoint (may lack username/userId for creator checks).
      try {
        const detail = await resultsService.get(resultId!);
        return detailAsSummary(resultId!, detail);
      } catch {
        return null;
      }
    },
  });
}
