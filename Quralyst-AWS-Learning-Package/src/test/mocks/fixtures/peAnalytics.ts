// PE Analysis Dashboard / Analytics fixtures (F32.2) — mirror the backend contract shapes exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Analysis
// Dashboard / Analytics). Used by the analytics MSW handlers + the page test. Firm ids (pef1/pef2)
// match the F31 changes fixtures so cross-surface deep links stay consistent. The handlers echo the
// requested window/segment/scope back into each payload so query-key/refetch tests can assert them.
import type {
  PEActivityTrend,
  PEAnalyticsSummary,
  PEGeoClusters,
  PEHoldPeriods,
  PEMostActiveFirms,
  PEMostExits,
  PERecentBySector,
  PETopSectors,
} from '@/types';

export const mockSummary: PEAnalyticsSummary = {
  window: '12m',
  segment: 'all',
  newInvestments: 42,
  exits: 11,
  activeFirms: 8,
  uniqueCompanies: 39,
  eligibleFirms: 120,
};

export const mockMostActiveFirms: PEMostActiveFirms = {
  window: '12m',
  segment: 'all',
  rows: [
    {
      firmId: 'pef1',
      firmName: 'Vista Equity Partners',
      websiteUrl: 'https://vista.example',
      newInvestments: 9,
      revMin: 50,
      revMax: 500,
      ebitdaMin: 10,
      ebitdaMax: 75,
    },
    {
      firmId: 'pef2',
      firmName: 'Thoma Bravo',
      websiteUrl: 'https://thomabravo.example',
      newInvestments: 6,
      revMin: null,
      revMax: null,
      ebitdaMin: null,
      ebitdaMax: null,
    },
  ],
};

export const mockMostExits: PEMostExits = {
  window: '12m',
  segment: 'all',
  rows: [
    {
      firmId: 'pef2',
      firmName: 'Thoma Bravo',
      websiteUrl: 'https://thomabravo.example',
      exits: 4,
    },
    {
      firmId: 'pef1',
      firmName: 'Vista Equity Partners',
      websiteUrl: 'https://vista.example',
      exits: 2,
    },
  ],
};

export const mockTopSectors: PETopSectors = {
  window: '12m',
  segment: 'all',
  rows: [
    { sector: 'Healthcare IT', investments: 14, uniqueFirms: 5 },
    { sector: 'Software', investments: 11, uniqueFirms: 4 },
    { sector: 'Unknown', investments: 3, uniqueFirms: 2 },
  ],
};

export const mockRecentBySector: PERecentBySector = {
  window: '12m',
  segment: 'all',
  rows: [
    {
      sector: 'Healthcare IT',
      companyName: 'Helio Robotics',
      firmId: 'pef1',
      firmName: 'Vista Equity Partners',
      kind: 'invested',
      detectedAt: '2026-07-12T14:30:00Z',
    },
    {
      sector: 'Healthcare IT',
      companyName: 'Beacon Analytics',
      firmId: 'pef1',
      firmName: 'Vista Equity Partners',
      kind: 'exited',
      detectedAt: '2026-07-11T09:15:00Z',
    },
    {
      sector: 'Software',
      companyName: 'Delta Foods',
      firmId: 'pef2',
      firmName: 'Thoma Bravo',
      kind: 'invested',
      detectedAt: '2026-07-10T18:45:00Z',
    },
  ],
};

export const mockActivityTrend: PEActivityTrend = {
  window: '12m',
  segment: 'all',
  rows: [
    { month: '2026-05', added: 6, exited: 2 },
    { month: '2026-06', added: 9, exited: 4 },
    { month: '2026-07', added: 5, exited: 1 },
  ],
};

// Geographic clusters — the handler swaps the row set on `scope`, so both are exported.
export const mockGeoUs: PEGeoClusters = {
  window: '12m',
  segment: 'all',
  scope: 'us',
  rows: [
    { key: 'CA', label: 'CA', holdings: 22, uniqueFirms: 6 },
    { key: 'TX', label: 'TX', holdings: 15, uniqueFirms: 4 },
    { key: 'NY', label: 'NY', holdings: 9, uniqueFirms: 3 },
  ],
};

export const mockGeoGlobal: PEGeoClusters = {
  window: '12m',
  segment: 'all',
  scope: 'global',
  rows: [
    { key: 'United Kingdom', label: 'United Kingdom', holdings: 12, uniqueFirms: 4 },
    { key: 'Germany', label: 'Germany', holdings: 7, uniqueFirms: 3 },
    { key: 'Canada', label: 'Canada', holdings: 5, uniqueFirms: 2 },
  ],
};

export const mockHoldPeriods: PEHoldPeriods = {
  window: '12m',
  segment: 'all',
  rows: [
    { bucket: '<1y', sortIdx: 0, current: 8, exited: 1 },
    { bucket: '1-2y', sortIdx: 1, current: 12, exited: 3 },
    { bucket: '2-4y', sortIdx: 2, current: 10, exited: 6 },
    { bucket: '4-6y', sortIdx: 3, current: 4, exited: 5 },
  ],
  stats: {
    currentCount: 34,
    exitedCount: 15,
    avgExitedYears: 3.7,
    avgCurrentYears: 2.1,
    medianExitedYears: 3.5,
  },
};
