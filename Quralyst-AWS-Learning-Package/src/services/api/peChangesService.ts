// PE Activity Feed / Changes service (F31.2) — the typed seam over the /api/pe/changes* surface.
// A reverse-chronological feed of detected portfolio activity (additions, removals, status changes)
// on PE firm websites, plus a by-type summary. Router access is `require_pe_access` (staff OR the
// pe:dataset grant); both endpoints are read-only GETs returning the unified envelope `{success,data,…}`
// (unwrapped by the shared http seam). `total`/`limit`/`offset` are carried INSIDE `data` (per the
// frozen contract), so the list unwraps `data` directly. Contract: backend REF-API-CONTRACT.md
// §PE Dataset — Changes. Types: `src/types/peChanges.ts`.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { PEChangesList, PEChangesQuery, PEChangesSummary } from '@/types';

// --- query-string builder --------------------------------------------------

function changesParams(query: PEChangesQuery): URLSearchParams {
  const qs = new URLSearchParams();
  if (query.firmId) qs.set('firmId', query.firmId);
  // `all` is the default; only forward a concrete type filter.
  if (query.type && query.type !== 'all') qs.set('type', query.type);
  if (query.limit != null) qs.set('limit', String(query.limit));
  if (query.offset != null) qs.set('offset', String(query.offset));
  return qs;
}

export interface PEChangesService {
  /** Reverse-chronological change rows. `limit` defaults to 100 (max 500); `offset` pages the feed. */
  listChanges(query?: PEChangesQuery): Promise<PEChangesList>;
  /** By-type counts + total across the whole feed (no filters). */
  getChangesSummary(): Promise<PEChangesSummary>;
}

export const peChangesService: PEChangesService = {
  listChanges: (query = {}) => {
    const qs = changesParams(query).toString();
    const suffix = qs ? `?${qs}` : '';
    return http<PEChangesList>(`${endpoints.pe.changes}${suffix}`);
  },

  getChangesSummary: () => http<PEChangesSummary>(endpoints.pe.changesSummary),
};
