// PE Talent Flow service (F33.2) — the typed seam over the /api/pe/talent-flow + person-history
// surface. Detected cross-firm professional moves ("who is building a team, who is bleeding talent")
// plus a per-person career timeline. Router access is `require_pe_access` (staff OR the pe:dataset
// grant); both endpoints are read-only GETs returning the unified envelope `{success,data,…}`
// (unwrapped by the shared http seam). The moves feed carries `total`/`counts`/gainers/losers INSIDE
// `data`. The history endpoint 404s for an unknown id / 400s for a malformed one — surfaced by the
// http seam as a thrown ApiError with `status`, which the page maps to the "person not found" state.
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Talent Flow. Types: `src/types/peTalentFlow.ts`.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { PEPersonHistory, PETalentFlowMoves, PETalentFlowParams } from '@/types';

// --- query-string builder --------------------------------------------------

/** Forward only the params the caller set — omitted params let the backend apply its documented
 *  defaults (confidence=medium, limit=200). `firmId`/`search` are dropped when empty. */
function movesParams(params: PETalentFlowParams): string {
  const qs = new URLSearchParams();
  if (params.confidence) qs.set('confidence', params.confidence);
  if (params.firmId) qs.set('firmId', params.firmId);
  if (params.search) qs.set('search', params.search);
  if (params.limit != null) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export interface PETalentFlowService {
  /** Detected moves + tier counts + top gainers/losers. `confidence` defaults medium; `firmId`
   *  matches either side; `search` is a case-insensitive person-name substring; `limit` caps at 1000. */
  getMoves(params?: PETalentFlowParams): Promise<PETalentFlowMoves>;
  /** Live cross-firm career timeline for one person. Rejects with `{status:404}` for an unknown id
   *  and `{status:400}` for a malformed (non-ObjectId) id. */
  getPersonHistory(id: string): Promise<PEPersonHistory>;
}

export const peTalentFlowService: PETalentFlowService = {
  getMoves: (params = {}) =>
    http<PETalentFlowMoves>(`${endpoints.pe.talentFlowMoves}${movesParams(params)}`),

  getPersonHistory: (id) => http<PEPersonHistory>(endpoints.pe.personHistory(id)),
};
