// Stable, typed TanStack Query keys for the PE Screener (F29.2). Each list is keyed by its
// server-side filter object so switching filters/pages refetches; options + holdings-stats are
// static keys. Parallels peReviewKeys / peAdminKeys. find-similar is a mutation (no query key).
import type { PEScreenerFirmsQuery, PEScreenerHoldingsQuery, PEScreenerPeopleQuery } from '@/types';

export const peScreenerKeys = {
  all: ['pe', 'screener'] as const,
  holdings: (q: PEScreenerHoldingsQuery) => ['pe', 'screener', 'holdings', q] as const,
  holdingsStats: ['pe', 'screener', 'holdings-stats'] as const,
  firms: (q: PEScreenerFirmsQuery) => ['pe', 'screener', 'firms', q] as const,
  people: (q: PEScreenerPeopleQuery) => ['pe', 'screener', 'people', q] as const,
  options: ['pe', 'screener', 'options'] as const,
};
