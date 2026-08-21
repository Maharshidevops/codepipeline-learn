// MSW handlers for the PE Analysis Dashboard / Analytics surface (F32.2). All eight GETs return the
// unified success envelope. Each handler echoes the requested `window`/`segment` (defaulting to
// 12m/all, matching the backend) back into the payload so the page test can assert a control change
// re-fetched with the new params. The geographic-clusters handler swaps its row set on `?scope=` so the
// scope-toggle test sees states↔countries. Every handler falls back to a default value on an invalid
// query param (never errors), matching the backend's parse-and-fall-back contract.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import {
  mockActivityTrend,
  mockGeoGlobal,
  mockGeoUs,
  mockHoldPeriods,
  mockMostActiveFirms,
  mockMostExits,
  mockRecentBySector,
  mockSummary,
  mockTopSectors,
} from '@/test/mocks/fixtures/peAnalytics';
import type { PEAnalyticsSegment, PEAnalyticsWindow } from '@/types';

const WINDOWS: PEAnalyticsWindow[] = ['3m', '6m', '12m', '24m', 'all'];
const SEGMENTS: PEAnalyticsSegment[] = [
  'all',
  'lower-middle-market',
  'middle-market',
  'upper-middle-market',
];

/** Parse-and-fall-back the shared window/segment (mirrors the backend's never-400 contract). */
function parseParams(request: Request): { window: PEAnalyticsWindow; segment: PEAnalyticsSegment } {
  const url = new URL(request.url);
  const w = url.searchParams.get('window') as PEAnalyticsWindow | null;
  const s = url.searchParams.get('segment') as PEAnalyticsSegment | null;
  return {
    window: w && WINDOWS.includes(w) ? w : '12m',
    segment: s && SEGMENTS.includes(s) ? s : 'all',
  };
}

export const peAnalyticsHandlers = [
  http.get(endpoints.pe.analyticsSummary, ({ request }) =>
    ok({ ...mockSummary, ...parseParams(request) }),
  ),

  http.get(endpoints.pe.analyticsMostActiveFirms, ({ request }) =>
    ok({ ...mockMostActiveFirms, ...parseParams(request) }),
  ),

  http.get(endpoints.pe.analyticsMostExits, ({ request }) =>
    ok({ ...mockMostExits, ...parseParams(request) }),
  ),

  http.get(endpoints.pe.analyticsTopSectors, ({ request }) =>
    ok({ ...mockTopSectors, ...parseParams(request) }),
  ),

  http.get(endpoints.pe.analyticsRecentBySector, ({ request }) =>
    ok({ ...mockRecentBySector, ...parseParams(request) }),
  ),

  http.get(endpoints.pe.analyticsActivityTrend, ({ request }) =>
    ok({ ...mockActivityTrend, ...parseParams(request) }),
  ),

  http.get(endpoints.pe.analyticsHoldPeriods, ({ request }) =>
    ok({ ...mockHoldPeriods, ...parseParams(request) }),
  ),

  // Scope toggle: `global` → countries, anything else → US states (backend defaults scope=us).
  http.get(endpoints.pe.analyticsGeographicClusters, ({ request }) => {
    const url = new URL(request.url);
    const scope = url.searchParams.get('scope') === 'global' ? 'global' : 'us';
    const base = scope === 'global' ? mockGeoGlobal : mockGeoUs;
    return ok({ ...base, ...parseParams(request), scope });
  }),
];
