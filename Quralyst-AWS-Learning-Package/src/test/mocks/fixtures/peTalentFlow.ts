// PE Talent Flow fixtures (F33.2) — mirror the backend contract shapes exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Talent Flow).
// Used by the talent-flow MSW handlers + the page/drawer tests. Firm ids (pef1/pef2/pef3) match the
// F31/F32 fixtures so cross-surface deep links stay consistent. The moves payload exercises all three
// confidence tiers plus gainers/losers; `personHistory` is a two-tenure LinkedIn-anchored timeline with
// one move between them. `counts` is computed over ALL moves (constant across floor changes).
import type { PEPersonHistory, PETalentFlowMoves, PETalentMove } from '@/types';

// One move per tier — newest arrival first (contract ordering).
const highMove: PETalentMove = {
  id: 'mv-high',
  personKey: 'jane-smith',
  personName: 'Jane Smith',
  fromFirmId: 'pef2',
  fromFirmName: 'Thoma Bravo',
  toFirmId: 'pef1',
  toFirmName: 'Vista Equity Partners',
  departedAt: '2026-05-01T00:00:00Z',
  arrivedAt: '2026-06-15T00:00:00Z',
  confidence: 'high',
  linkedinMatch: true,
  reasons: ['Same LinkedIn profile', 'Same role type (partner)'],
  detectedAt: '2026-06-20T00:00:00Z',
  lastDetectedAt: '2026-07-10T00:00:00Z',
};

const mediumMove: PETalentMove = {
  id: 'mv-medium',
  personKey: 'raj-patel',
  personName: 'Raj Patel',
  fromFirmId: 'pef1',
  fromFirmName: 'Vista Equity Partners',
  toFirmId: 'pef3',
  toFirmName: 'Silver Lake',
  departedAt: '2026-03-10T00:00:00Z',
  arrivedAt: '2026-04-02T00:00:00Z',
  confidence: 'medium',
  linkedinMatch: false,
  reasons: ['Similar title'],
  detectedAt: '2026-04-05T00:00:00Z',
  lastDetectedAt: '2026-07-10T00:00:00Z',
};

const lowMove: PETalentMove = {
  id: 'mv-low',
  personKey: 'john-doe',
  personName: 'John Doe',
  fromFirmId: 'pef3',
  fromFirmName: 'Silver Lake',
  toFirmId: 'pef2',
  toFirmName: 'Thoma Bravo',
  departedAt: null,
  arrivedAt: '2026-02-01T00:00:00Z',
  confidence: 'low',
  linkedinMatch: false,
  reasons: ['Common name — unconfirmed identity'],
  detectedAt: '2026-02-03T00:00:00Z',
  lastDetectedAt: '2026-07-10T00:00:00Z',
};

/** All moves (before any floor filter). The handler slices this on the requested confidence floor. */
export const allMoves: PETalentMove[] = [highMove, mediumMove, lowMove];

/** Counts over ALL moves — constant regardless of the floor (contract). */
export const mockCounts = { high: 1, medium: 1, low: 1 };

export const mockGainers: PETalentFlowMoves['topGainers'] = [
  { firmId: 'pef1', firmName: 'Vista Equity Partners', arrivals: 5, departures: 2, net: 3 },
  { firmId: 'pef2', firmName: 'Thoma Bravo', arrivals: 3, departures: 2, net: 1 },
];

export const mockLosers: PETalentFlowMoves['topLosers'] = [
  { firmId: 'pef3', firmName: 'Silver Lake', arrivals: 1, departures: 4, net: -3 },
  { firmId: 'pef4', firmName: 'KKR', arrivals: 2, departures: 3, net: -1 },
];

/** Two-tenure, LinkedIn-anchored career timeline with one move between the tenures. */
export const mockPersonHistory: PEPersonHistory = {
  linkedinAnchored: true,
  tenures: [
    {
      firmId: 'pef2',
      firmName: 'Thoma Bravo',
      personName: 'Jane Smith',
      title: 'Principal',
      roleTag: 'principal',
      linkedinUrl: 'https://linkedin.com/in/jane-smith',
      firstSeenAt: '2023-01-01T00:00:00Z',
      lastSeenAt: '2026-05-01T00:00:00Z',
    },
    {
      firmId: 'pef1',
      firmName: 'Vista Equity Partners',
      personName: 'Jane Smith',
      title: 'Partner',
      roleTag: 'partner',
      linkedinUrl: 'https://linkedin.com/in/jane-smith',
      firstSeenAt: '2026-06-15T00:00:00Z',
      lastSeenAt: '2026-07-10T00:00:00Z',
    },
  ],
  moves: [highMove],
};
