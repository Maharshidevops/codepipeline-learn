// PE Analysis Dashboard / Analytics service (F32.2) — the typed seam over the eight
// /api/pe/analytics/* endpoints. Market-level aggregations over the platform-global PE dataset behind
// the `/pe/analysis` page. Router access is `require_pe_access` (staff OR the pe:dataset grant); every
// endpoint is a read-only GET returning the unified envelope `{success,data,…}` (unwrapped by the
// shared http seam) and takes a shared `?window=&segment=` (invalid values fall back server-side).
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Analysis Dashboard / Analytics.
// Types: `src/types/peAnalytics.ts`.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  PEActivityTrend,
  PEAnalyticsParams,
  PEAnalyticsSummary,
  PEGeoClusters,
  PEGeoScope,
  PEHoldPeriods,
  PEMostActiveFirms,
  PEMostExits,
  PERecentBySector,
  PETopSectors,
} from '@/types';

// --- query-string builder --------------------------------------------------

/** Build the shared `window`/`segment` params plus any endpoint-specific extras. Only forwards
 *  values the caller set — omitted params let the backend apply its documented defaults. */
function analyticsParams(
  params: PEAnalyticsParams,
  extra?: Record<string, string | number | undefined>,
): string {
  const qs = new URLSearchParams();
  if (params.window) qs.set('window', params.window);
  if (params.segment) qs.set('segment', params.segment);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v != null) qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export interface PEAnalyticsService {
  /** Firms ranked by new investments in the window (limit default 10, max 50). */
  getMostActiveFirms(params?: PEAnalyticsParams, limit?: number): Promise<PEMostActiveFirms>;
  /** Firms ranked by exits in the window (limit default 10, max 50). */
  getMostExits(params?: PEAnalyticsParams, limit?: number): Promise<PEMostExits>;
  /** Sectors ranked by holdings first-seen in the window (limit default 12, max 30). */
  getTopSectors(params?: PEAnalyticsParams, limit?: number): Promise<PETopSectors>;
  /** Top sectors, each with its newest transactions (sectors 1–20 default 8, perSector 1–10 default 5). */
  getRecentBySector(
    params?: PEAnalyticsParams,
    sectors?: number,
    perSector?: number,
  ): Promise<PERecentBySector>;
  /** Monthly added-vs-exited counts, ascending by month. */
  getActivityTrend(params?: PEAnalyticsParams): Promise<PEActivityTrend>;
  /** Top-level KPI tiles (newInvestments, exits, activeFirms, uniqueCompanies, eligibleFirms). */
  getSummary(params?: PEAnalyticsParams): Promise<PEAnalyticsSummary>;
  /** Holdings clustered by US state (`us`) or country (`global`) (limit default 15, max 50). */
  getGeographicClusters(
    params?: PEAnalyticsParams,
    scope?: PEGeoScope,
    limit?: number,
  ): Promise<PEGeoClusters>;
  /** Hold-period bucket distribution (current/exited) + cohort stats. */
  getHoldPeriods(params?: PEAnalyticsParams): Promise<PEHoldPeriods>;
}

export const peAnalyticsService: PEAnalyticsService = {
  getMostActiveFirms: (params = {}, limit) =>
    http<PEMostActiveFirms>(
      `${endpoints.pe.analyticsMostActiveFirms}${analyticsParams(params, { limit })}`,
    ),

  getMostExits: (params = {}, limit) =>
    http<PEMostExits>(`${endpoints.pe.analyticsMostExits}${analyticsParams(params, { limit })}`),

  getTopSectors: (params = {}, limit) =>
    http<PETopSectors>(`${endpoints.pe.analyticsTopSectors}${analyticsParams(params, { limit })}`),

  getRecentBySector: (params = {}, sectors, perSector) =>
    http<PERecentBySector>(
      `${endpoints.pe.analyticsRecentBySector}${analyticsParams(params, { sectors, perSector })}`,
    ),

  getActivityTrend: (params = {}) =>
    http<PEActivityTrend>(`${endpoints.pe.analyticsActivityTrend}${analyticsParams(params)}`),

  getSummary: (params = {}) =>
    http<PEAnalyticsSummary>(`${endpoints.pe.analyticsSummary}${analyticsParams(params)}`),

  getGeographicClusters: (params = {}, scope, limit) =>
    http<PEGeoClusters>(
      `${endpoints.pe.analyticsGeographicClusters}${analyticsParams(params, { scope, limit })}`,
    ),

  getHoldPeriods: (params = {}) =>
    http<PEHoldPeriods>(`${endpoints.pe.analyticsHoldPeriods}${analyticsParams(params)}`),
};
