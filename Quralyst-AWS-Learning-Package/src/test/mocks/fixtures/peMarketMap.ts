import type {
  MarketMapBuyersResponse,
  MarketMapOptions,
  MarketMapWhitespaceResponse,
} from '@/types';

export const mockMarketMapOptions: MarketMapOptions = {
  sectors: [
    { sector: 'Healthcare', deals: 12, buyers: 4 },
    { sector: 'Software', deals: 8, buyers: 3 },
    { sector: 'Dental', deals: 5, buyers: 1 },
  ],
  regions: [
    { region: 'Southwest US', deals: 9 },
    { region: 'Northeast US', deals: 6 },
  ],
};

export const mockMarketMapBuyers: MarketMapBuyersResponse = {
  total: 3,
  consolidatorCount: 1,
  geo: undefined,
  rows: [
    {
      firmId: 'pef1',
      firmName: 'Active Capital',
      buyingLikelihood: 78,
      sectorDeals: 3,
      sectorSharePct: 90,
      lastSectorYear: 2026,
      reasons: [
        'High acquisition appetite',
        '3 Healthcare deals (90% of portfolio)',
        'Bought in Healthcare this year',
      ],
      appetite: { tier: 'high', score: 80 },
      consolidator: { active: true, totalDeals: 3 },
      checkSize: { fit: 'no-filter', band: 'middle-market' },
      components: { appetite: 0.8, thesis: 0.9, recency: 0.7, checkFit: null },
      lowConfidence: false,
    },
    {
      firmId: 'pef2',
      firmName: 'Small Shop',
      buyingLikelihood: 42,
      sectorDeals: 1,
      sectorSharePct: 30,
      lastSectorYear: 2024,
      reasons: [
        'Moderate acquisition appetite',
        '1 Healthcare deals (30% of portfolio)',
        'Last Healthcare buy in 2024',
      ],
      appetite: { tier: 'moderate', score: 45 },
      consolidator: null,
      checkSize: { fit: 'below', band: 'lower-middle-market' },
      components: { appetite: 0.45, thesis: 0.3, recency: 0.5, checkFit: 0 },
      lowConfidence: true,
    },
    {
      firmId: 'pef3',
      firmName: 'Dormant Fund',
      buyingLikelihood: 18,
      sectorDeals: 1,
      sectorSharePct: 20,
      lastSectorYear: 2010,
      reasons: [
        'Dormant acquisition appetite',
        '1 Healthcare deals (20% of portfolio)',
        'Last Healthcare buy in 2010',
      ],
      appetite: { tier: 'dormant', score: 0 },
      consolidator: null,
      checkSize: { fit: 'fits', band: 'middle-market' },
      components: { appetite: 0, thesis: 0.2, recency: 0.1, checkFit: 1 },
      lowConfidence: false,
    },
  ],
};

export const mockMarketMapBuyersEmpty: MarketMapBuyersResponse = {
  rows: [],
  total: 0,
  consolidatorCount: 0,
};

export const mockMarketMapWhitespace: MarketMapWhitespaceResponse = {
  total: 3,
  rows: [
    {
      sector: 'Climate',
      region: 'Southwest US',
      band: 'middle-market',
      recentDeals: 4,
      priorDeals: 1,
      specializedBuyers: 0,
      whitespaceScore: 72,
    },
    {
      sector: 'Fintech',
      region: 'Northeast US',
      band: 'middle-market',
      recentDeals: 3,
      priorDeals: 2,
      specializedBuyers: 1,
      whitespaceScore: 35,
    },
    {
      sector: 'Logistics',
      region: 'Midwest US',
      band: 'lower-middle-market',
      recentDeals: 2,
      priorDeals: 1,
      specializedBuyers: 0,
      whitespaceScore: 12,
    },
  ],
};
