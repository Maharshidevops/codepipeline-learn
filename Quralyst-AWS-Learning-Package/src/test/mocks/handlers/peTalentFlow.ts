// MSW handlers for the PE Talent Flow surface (F33.2). Both GETs return the unified envelope. The moves
// handler applies the requested confidence FLOOR (default medium; invalid → medium) by slicing the
// tiered fixture, but keeps `counts` computed over ALL moves (so the tier chips stay constant across
// floor changes — matching the backend). It also honours `firmId` (either side) and `search`
// (case-insensitive person-name substring) so the filter-wiring tests can assert the query params
// round-trip. `total` is the filtered count pre-limit. The history handler returns the two-tenure
// fixture for a known id and a 404 for the reserved `unknown` id (so the not-found empty state is
// exercised).
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok, err } from '@/test/mocks/envelope';
import {
  allMoves,
  mockCounts,
  mockGainers,
  mockLosers,
  mockPersonHistory,
} from '@/test/mocks/fixtures/peTalentFlow';
import type { PEMoveConfidence } from '@/types';

const RANK: Record<PEMoveConfidence, number> = { low: 0, medium: 1, high: 2 };
const TIERS: PEMoveConfidence[] = ['low', 'medium', 'high'];

/** Parse-and-fall-back the confidence floor (mirrors the backend's never-400 contract). */
function parseFloor(request: Request): PEMoveConfidence {
  const url = new URL(request.url);
  const c = url.searchParams.get('confidence') as PEMoveConfidence | null;
  return c && TIERS.includes(c) ? c : 'medium';
}

export const peTalentFlowHandlers = [
  http.get(endpoints.pe.talentFlowMoves, ({ request }) => {
    const url = new URL(request.url);
    const floor = parseFloor(request);
    const firmId = url.searchParams.get('firmId') ?? '';
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const limit = Number(url.searchParams.get('limit') ?? 200);

    let filtered = allMoves.filter((m) => RANK[m.confidence] >= RANK[floor]);
    if (firmId) filtered = filtered.filter((m) => m.fromFirmId === firmId || m.toFirmId === firmId);
    if (search) filtered = filtered.filter((m) => m.personName.toLowerCase().includes(search));

    const total = filtered.length;
    const moves = filtered.slice(0, limit);

    return ok({
      moves,
      total,
      // Counts are over ALL moves, before the floor filter — constant across floor changes.
      counts: mockCounts,
      minConfidence: floor,
      topGainers: mockGainers,
      topLosers: mockLosers,
    });
  }),

  http.get(endpoints.pe.personHistory(':id'), ({ params }) => {
    if (params.id === 'unknown') return err(404, 'Person not found');
    return ok(mockPersonHistory);
  }),
];
