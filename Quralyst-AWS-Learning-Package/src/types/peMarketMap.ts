// PE Market Map types (F38.2) — mirrors backend REF-API-CONTRACT.md §PE Dataset — Market Map.
export type MarketMapSegment = 'lower-middle-market' | 'middle-market' | 'upper-middle-market';

export type CheckSizeFit = 'fits' | 'below' | 'no-filter';

export interface MarketMapSectorOption {
  sector: string;
  deals: number;
  buyers: number;
}

export interface MarketMapRegionOption {
  region: string;
  deals: number;
}

export interface MarketMapOptions {
  sectors: MarketMapSectorOption[];
  regions: MarketMapRegionOption[];
}

export interface MarketMapBuyerRow {
  firmId: string | null;
  firmName: string;
  buyingLikelihood: number;
  sectorDeals: number;
  /** Portfolio share in this sector, 0–100 (one decimal). */
  sectorSharePct: number;
  /** Most recent in-sector investment year, if known. */
  lastSectorYear: number | null;
  /** Firm-cell subtitle lines (appetite · deals · recency · consolidator). */
  reasons: string[];
  appetite: { tier: string; score?: number };
  consolidator?: { active: boolean; totalDeals: number } | null;
  checkSize: { fit: CheckSizeFit; band?: string | null };
  components: {
    appetite: number;
    thesis: number;
    recency: number;
    checkFit: number | null;
  };
  lowConfidence?: boolean;
}

export interface MarketMapBuyersResponse {
  rows: MarketMapBuyerRow[];
  total: number;
  consolidatorCount: number;
  geo?: string;
}

export interface MarketMapWhitespaceRow {
  sector: string;
  region: string;
  band?: string;
  recentDeals: number;
  priorDeals: number;
  specializedBuyers: number;
  whitespaceScore: number;
  exampleFirms?: string[];
  lowConfidence?: boolean;
}

export interface MarketMapWhitespaceResponse {
  rows: MarketMapWhitespaceRow[];
  total: number;
}
