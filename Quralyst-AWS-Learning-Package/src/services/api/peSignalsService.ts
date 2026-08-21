// PE Signals / Exit Watch service (F30.2) — the typed seam over the /api/pe/signals/* surface.
// Derived analytics over the PE dataset: a per-firm signal bundle (hold period, cadence, mix,
// appetite, roll-ups), a batch firms table, sector rollups, and the exit-readiness ranked list that
// backs the Exit Watch page. Router access is `require_pe_access` (staff OR the pe:dataset grant);
// all endpoints are GETs returning the unified envelope `{success, data, ...}` (unwrapped by the
// shared http seam). The backend applies a 60 s cache. Contract: backend REF-API-CONTRACT.md
// §PE Dataset — Signals. Types: `src/types/peSignals.ts`.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  PEExitReadiness,
  PEExitReadinessQuery,
  PEFirmSignals,
  PESignalsBatch,
  PESectorSignals,
  PESectorSignalsQuery,
} from '@/types';

// --- query-string builders -------------------------------------------------

function exitReadinessParams(query: PEExitReadinessQuery): URLSearchParams {
  const qs = new URLSearchParams();
  if (query.firmId) qs.set('firmId', query.firmId);
  if (query.sector) qs.set('sector', query.sector);
  if (query.tier) qs.set('tier', query.tier);
  if (query.limit != null) qs.set('limit', String(query.limit));
  if (query.holdingIds) qs.set('holdingIds', query.holdingIds);
  return qs;
}

function sectorParams(query: PESectorSignalsQuery): URLSearchParams {
  const qs = new URLSearchParams();
  if (query.window) qs.set('window', query.window);
  if (query.segment) qs.set('segment', query.segment);
  if (query.limit != null) qs.set('limit', String(query.limit));
  return qs;
}

export interface PESignalsService {
  /** Per-firm signal bundle. `recentYears` (1..10) controls the recent-window mix + cadence counts. */
  getFirmSignals(firmId: string, recentYears?: number): Promise<PEFirmSignals>;
  /** Cross-firm batch table (not consumed by the two required F30.2 surfaces; here for completeness). */
  listFirmSignals(): Promise<PESignalsBatch>;
  /** Sector rollups (owned by F32.2 dashboards; here for completeness — no F30.2 UI). */
  listSectorSignals(query?: PESectorSignalsQuery): Promise<PESectorSignals>;
  /** Ranked exit-readiness rows. `tier` is at-least-rank; `n/a` rows are never returned. */
  getExitReadiness(query?: PEExitReadinessQuery): Promise<PEExitReadiness>;
}

export const peSignalsService: PESignalsService = {
  getFirmSignals: (firmId, recentYears) => {
    const qs = new URLSearchParams();
    if (recentYears != null) qs.set('recentYears', String(recentYears));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return http<PEFirmSignals>(`${endpoints.pe.signalsFirm(firmId)}${suffix}`);
  },

  listFirmSignals: () => http<PESignalsBatch>(endpoints.pe.signalsFirms),

  listSectorSignals: (query = {}) =>
    http<PESectorSignals>(`${endpoints.pe.signalsSectors}?${sectorParams(query).toString()}`),

  getExitReadiness: (query = {}) =>
    http<PEExitReadiness>(
      `${endpoints.pe.signalsExitReadiness}?${exitReadinessParams(query).toString()}`,
    ),
};
