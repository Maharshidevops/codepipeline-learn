// Stable, typed TanStack Query keys for the PE Activity Feed / Changes surface (F31.2). The feed is
// keyed by its filter object (firmId/type/limit/offset) so changing a filter or paging refetches; the
// summary is a singleton key. Parallels peSignalsKeys / peScreenerKeys. The feed pairs these with a
// 60 s-friendly staleTime (same convention F30 used) since the backend caches derived reads.
import type { PEChangesQuery } from '@/types';

export const peChangesKeys = {
  all: ['pe', 'changes'] as const,
  list: (q: PEChangesQuery) => ['pe', 'changes', q] as const,
  summary: ['pe', 'changes', 'summary'] as const,
};
