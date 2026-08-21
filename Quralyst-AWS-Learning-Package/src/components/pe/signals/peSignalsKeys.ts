// Stable, typed TanStack Query keys for the PE Signals / Exit Watch surface (F30.2). The firm bundle
// is keyed by firmId + recentYears; exit-readiness by its server-side filter object (tier/sector/…)
// so switching the tier filter refetches. Parallels peScreenerKeys / peReviewKeys. The backend caches
// for ~60 s, so callers pair these with a 60 s-friendly staleTime.
import type { PEExitReadinessQuery, PESectorSignalsQuery } from '@/types';

export const peSignalsKeys = {
  all: ['pe', 'signals'] as const,
  firm: (firmId: string, recentYears: number) =>
    ['pe', 'signals', 'firm', firmId, recentYears] as const,
  firms: ['pe', 'signals', 'firms'] as const,
  sectors: (q: PESectorSignalsQuery) => ['pe', 'signals', 'sectors', q] as const,
  exitReadiness: (q: PEExitReadinessQuery) => ['pe', 'signals', 'exit-readiness', q] as const,
};
