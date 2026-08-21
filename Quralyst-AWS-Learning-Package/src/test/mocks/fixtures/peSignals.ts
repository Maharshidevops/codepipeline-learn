// PE Signals / Exit Watch fixtures (F30.2) — mirror the backend contract shapes exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Signals).
// Used by the signals MSW handlers + the page/tab tests. Covers:
//  • exit-readiness rows across elevated/watch/low, trusted (firm) vs default threshold, + coverage;
//  • a firm bundle with a roll-up cluster + acquisition appetite (`mockFirmSignals`);
//  • an empty/undated book (`mockFirmSignalsEmpty`) so the coverage state renders (not zeros).
import type {
  PEAcquisitionAppetite,
  PEExitReadiness,
  PEExitReadinessRow,
  PEFirmSignals,
  PESignalsBatchRow,
} from '@/types';

const appetiteHigh: PEAcquisitionAppetite = {
  score: 82,
  tier: 'high',
  newInvestmentScore: 70,
  exitActivityScore: 40,
  last2yInvestments: 6,
  exits2y: 2,
  reasons: ['6 new investments in the last 2 years', 'Steady deployment cadence'],
};

const appetiteDormant: PEAcquisitionAppetite = {
  score: 8,
  tier: 'dormant',
  newInvestmentScore: 5,
  exitActivityScore: 4,
  last2yInvestments: 0,
  exits2y: 0,
  reasons: ['No new investments in the last 2 years'],
};

// Exit-readiness rows. The endpoint never returns `n/a` rows; all here are `applicable:true`.
// Row order is the server rank (elevated first) — the page renders them in this order.
export const mockExitReadinessRows: PEExitReadinessRow[] = [
  {
    holdingId: 'h-elev-1',
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    companyName: 'Beacon Analytics',
    sector: 'Software',
    geography: 'North America',
    investmentDate: '2016-05',
    applicable: true,
    score: 88,
    tier: 'elevated',
    holdingAgeYears: 9,
    thresholdYears: 6,
    thresholdSource: 'firm',
    overThreshold: true,
    reasons: ['Held 9y vs firm-typical 6y', 'Sector exits accelerating'],
  },
  {
    holdingId: 'h-elev-2',
    firmId: 'pef2',
    firmName: 'Thoma Bravo',
    companyName: 'Zenith Health',
    sector: 'Healthcare',
    geography: 'Europe',
    investmentDate: '2017-01',
    applicable: true,
    score: 76,
    tier: 'elevated',
    holdingAgeYears: 8,
    // Default threshold — firm has no realized-exit history (the `*` case).
    thresholdYears: 5,
    thresholdSource: 'default',
    overThreshold: true,
    reasons: ['Held 8y vs default 5y (no firm exit history)'],
  },
  {
    holdingId: 'h-watch-1',
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    companyName: 'Cobalt Logistics',
    sector: 'Logistics',
    geography: 'North America',
    investmentDate: '2020-03',
    applicable: true,
    score: 54,
    tier: 'watch',
    holdingAgeYears: 5,
    thresholdYears: 6,
    thresholdSource: 'firm',
    overThreshold: false,
    reasons: ['Approaching firm-typical hold'],
  },
  {
    holdingId: 'h-low-1',
    firmId: 'pef2',
    firmName: 'Thoma Bravo',
    companyName: 'Delta Foods',
    sector: 'Consumer',
    geography: 'North America',
    investmentDate: '2023-06',
    applicable: true,
    score: 21,
    tier: 'low',
    holdingAgeYears: 2,
    thresholdYears: 5,
    thresholdSource: 'default',
    overThreshold: false,
    reasons: ['Recently acquired'],
  },
];

export const mockExitReadinessCoverage = { currentTotal: 40, dated: 28 };

export const mockExitReadiness: PEExitReadiness = {
  asOfYear: 2026,
  total: mockExitReadinessRows.length,
  rows: mockExitReadinessRows,
  coverage: mockExitReadinessCoverage,
};

// --- Firm bundle: a firm with a roll-up cluster + appetite ------------------
export const mockFirmSignals: PEFirmSignals = {
  firmId: 'pef1',
  firmName: 'Vista Equity Partners',
  asOfYear: 2026,
  holdingsCount: 24,
  holdPeriod: {
    medianHoldYears: 6,
    avgHoldYears: 6.4,
    exitedSampleSize: 11,
    distribution: [
      { bucket: '0-3y', sortIdx: 0, current: 5, exited: 1 },
      { bucket: '3-6y', sortIdx: 1, current: 6, exited: 5 },
      { bucket: '6y+', sortIdx: 2, current: 4, exited: 5 },
    ],
  },
  currentHoldings: {
    count: 15,
    withInvestmentDate: 12,
    medianAgeYears: 4,
    overHoldThresholdYears: 6,
    overHoldCount: 3,
    overHoldRatio: 0.2,
  },
  cadence: {
    investmentCount: 24,
    firstInvestmentYear: 2011,
    lastInvestmentYear: 2025,
    spanYears: 14,
    investmentsPerYear: 1.7,
    medianGapMonths: 7,
    last2yCount: 4,
    last5yCount: 9,
  },
  mix: {
    sectorMix: {
      all: [
        { label: 'Software', count: 14, pct: 58 },
        { label: 'Healthcare', count: 6, pct: 25 },
        { label: 'Logistics', count: 4, pct: 17 },
      ],
      recent: [
        { label: 'Software', count: 6, pct: 67 },
        { label: 'Healthcare', count: 3, pct: 33 },
      ],
    },
    geoMix: {
      all: [
        { label: 'North America', count: 18, pct: 75 },
        { label: 'Europe', count: 6, pct: 25 },
      ],
      recent: [{ label: 'North America', count: 9, pct: 100 }],
    },
    sectorByYear: [
      {
        year: 2024,
        total: 3,
        sectors: [
          { label: 'Software', count: 2 },
          { label: 'Healthcare', count: 1 },
        ],
      },
      { year: 2025, total: 2, sectors: [{ label: 'Software', count: 2 }] },
    ],
    geoByYear: [
      { year: 2024, total: 3, geos: [{ label: 'North America', count: 3 }] },
      { year: 2025, total: 2, geos: [{ label: 'North America', count: 2 }] },
    ],
    recentYears: 5,
  },
  appetite: appetiteHigh,
  rollups: [
    {
      sector: 'Software',
      totalDeals: 4,
      currentCount: 3,
      exitedCount: 1,
      platform: { companyName: 'Beacon Analytics', year: 2016, status: 'current' },
      addOns: [
        { companyName: 'Beacon Insights', year: 2018, status: 'current' },
        { companyName: 'Beacon Streams', year: 2020, status: 'current' },
        { companyName: 'Beacon Legacy', year: 2019, status: 'exited' },
      ],
      firstYear: 2016,
      lastDealYear: 2020,
      active: true,
      nextAddOnProfile: {
        sector: 'Software',
        geography: 'North America',
        note: 'Bolt-on analytics tooling to extend the platform',
      },
    },
  ],
};

// --- Empty / undated book: coverage state should show, not zeros ------------
export const mockFirmSignalsEmpty: PEFirmSignals = {
  firmId: 'pef-empty',
  firmName: 'Fresh Capital',
  asOfYear: 2026,
  holdingsCount: 3,
  holdPeriod: {
    medianHoldYears: null,
    avgHoldYears: null,
    exitedSampleSize: 0,
    distribution: [],
  },
  currentHoldings: {
    count: 3,
    withInvestmentDate: 0,
    medianAgeYears: null,
    overHoldThresholdYears: null,
    overHoldCount: 0,
    overHoldRatio: null,
  },
  cadence: {
    investmentCount: 3,
    firstInvestmentYear: null,
    lastInvestmentYear: null,
    spanYears: null,
    investmentsPerYear: null,
    medianGapMonths: null,
    last2yCount: 0,
    last5yCount: 0,
  },
  mix: {
    sectorMix: { all: [], recent: [] },
    geoMix: { all: [], recent: [] },
    sectorByYear: [],
    geoByYear: [],
    recentYears: 5,
  },
  appetite: appetiteDormant,
  rollups: [],
};

// Batch rows for GET /api/pe/signals/firms (PE Firms appetite column).
export const mockSignalsBatchRows: PESignalsBatchRow[] = [
  {
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    medianHoldYears: 6.2,
    exitedSampleSize: 12,
    currentDatedCount: 30,
    currentCount: 42,
    overHoldCount: 4,
    firstInvestmentYear: 2010,
    lastInvestmentYear: 2025,
    investmentCount: 80,
    investmentsPerYear: 5.2,
    newInvestments2y: 6,
    newInvestments5y: 18,
    exits2y: 2,
    exits5y: 8,
    appetite: appetiteHigh,
  },
  {
    firmId: 'pef2',
    firmName: 'Quarantine Capital',
    medianHoldYears: null,
    exitedSampleSize: 0,
    currentDatedCount: 0,
    currentCount: 0,
    overHoldCount: 0,
    firstInvestmentYear: null,
    lastInvestmentYear: null,
    investmentCount: 0,
    investmentsPerYear: null,
    newInvestments2y: 0,
    newInvestments5y: 0,
    exits2y: 0,
    exits5y: 0,
    appetite: appetiteDormant,
  },
];
