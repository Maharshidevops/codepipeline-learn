// MSW handlers for the PE Signals / Exit Watch surface (F30.2). All GETs return the unified success
// envelope. The exit-readiness handler honours the server-side `tier` at-least-rank filter (elevated
// ⊂ watch ⊂ low) + `firmId`/`sector`/`limit`, and reports the fixture `coverage`. The firm-bundle
// handler switches on the id (a normal firm with a roll-up cluster vs an empty/undated book) and echoes
// the requested `recentYears` into the returned mix.recentYears so tests can assert the param round-trips.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import {
  mockExitReadiness,
  mockExitReadinessCoverage,
  mockFirmSignals,
  mockFirmSignalsEmpty,
  mockSignalsBatchRows,
} from '@/test/mocks/fixtures/peSignals';
import type { PEReadinessTier } from '@/types';

// At-least-rank ordering: a tier filter returns that tier and everything above it.
const TIER_RANK: Record<PEReadinessTier, number> = { 'n/a': -1, low: 0, watch: 1, elevated: 2 };

export const peSignalsHandlers = [
  // Per-firm signal bundle. `:id` selects the bundle; `recentYears` is echoed back into the mix.
  http.get(endpoints.pe.signalsFirm(':id'), ({ params, request }) => {
    const id = params.id as string;
    const url = new URL(request.url);
    const recentYears = Number(url.searchParams.get('recentYears') ?? '5');
    const base = id === 'pef-empty' ? mockFirmSignalsEmpty : { ...mockFirmSignals, firmId: id };
    return ok({ ...base, mix: { ...base.mix, recentYears } });
  }),

  // Batch firm rows (PE Firms page appetite column).
  http.get(endpoints.pe.signalsFirms, () => ok({ rows: mockSignalsBatchRows })),

  // Sector rollups (owned by F32.2 — return an empty set).
  http.get(endpoints.pe.signalsSectors, ({ request }) => {
    const url = new URL(request.url);
    return ok({
      window: url.searchParams.get('window') ?? 'all',
      segment: url.searchParams.get('segment') ?? 'all',
      rows: [],
    });
  }),

  // Exit-readiness ranked list. Applies the at-least-rank tier filter + firmId/sector + limit.
  http.get(endpoints.pe.signalsExitReadiness, ({ request }) => {
    const url = new URL(request.url);
    const tier = url.searchParams.get('tier') as PEReadinessTier | null;
    const firmId = url.searchParams.get('firmId');
    const sector = url.searchParams.get('sector');
    const limit = Number(url.searchParams.get('limit') ?? '100');

    let rows = mockExitReadiness.rows;
    if (tier && TIER_RANK[tier] != null) {
      const floor = TIER_RANK[tier];
      rows = rows.filter((r) => TIER_RANK[r.tier] >= floor);
    }
    if (firmId) rows = rows.filter((r) => r.firmId === firmId);
    if (sector) rows = rows.filter((r) => r.sector === sector);
    rows = rows.slice(0, limit);

    return ok({
      asOfYear: mockExitReadiness.asOfYear,
      total: rows.length,
      rows,
      coverage: mockExitReadinessCoverage,
    });
  }),
];
