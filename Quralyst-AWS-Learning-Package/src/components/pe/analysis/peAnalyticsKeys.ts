// Stable, typed TanStack Query keys for the PE Analysis Dashboard / Analytics surface (F32.2). Each of
// the eight views is keyed by the FULL param tuple (window/segment + any endpoint-specific extra like
// scope/limit) so changing a control refetches exactly the cards that depend on it. Parallels
// peChangesKeys / peSignalsKeys. The page pairs these with a 60 s-friendly staleTime (same convention
// F30/F31 used) since the backend caches these derived reads for ~60 s.
import type { PEAnalyticsParams, PEGeoScope } from '@/types';

export const peAnalyticsKeys = {
  all: ['pe', 'analytics'] as const,
  mostActiveFirms: (p: PEAnalyticsParams, limit?: number) =>
    ['pe', 'analytics', 'most-active-firms', p, limit] as const,
  mostExits: (p: PEAnalyticsParams, limit?: number) =>
    ['pe', 'analytics', 'most-exits', p, limit] as const,
  topSectors: (p: PEAnalyticsParams, limit?: number) =>
    ['pe', 'analytics', 'top-sectors', p, limit] as const,
  recentBySector: (p: PEAnalyticsParams, sectors?: number, perSector?: number) =>
    ['pe', 'analytics', 'recent-by-sector', p, sectors, perSector] as const,
  activityTrend: (p: PEAnalyticsParams) => ['pe', 'analytics', 'activity-trend', p] as const,
  summary: (p: PEAnalyticsParams) => ['pe', 'analytics', 'summary', p] as const,
  geographicClusters: (p: PEAnalyticsParams, scope: PEGeoScope, limit?: number) =>
    ['pe', 'analytics', 'geographic-clusters', p, scope, limit] as const,
  holdPeriods: (p: PEAnalyticsParams) => ['pe', 'analytics', 'hold-periods', p] as const,
};
