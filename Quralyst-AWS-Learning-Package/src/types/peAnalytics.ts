// PE Analysis Dashboard / Analytics types (F32.2) — mirrors the backend contract exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Analysis
// Dashboard / Analytics). Access is gated by the `pe:dataset` permission (staff or explicit per-user
// grant). These are the read-only DTOs served by the eight /api/pe/analytics/* endpoints — market-level
// aggregations over the platform-global PE dataset. All shapes are camelCase inside the standard
// `{data}` envelope. Every endpoint accepts a shared window/segment; invalid values fall back
// server-side (never a 400).

// ---------------------------------------------------------------------------
// Shared filter vocabularies (locked to the backend / reference route).
// ---------------------------------------------------------------------------
/** Time window. Default `12m`. `all` = no window cutoff. */
export type PEAnalyticsWindow = '3m' | '6m' | '12m' | '24m' | 'all';

/** Size-band segment. Default `all`. */
export type PEAnalyticsSegment =
  | 'all'
  | 'lower-middle-market'
  | 'middle-market'
  | 'upper-middle-market';

/** Geographic-clusters scope: US states vs. non-null countries. Default `us`. */
export type PEGeoScope = 'us' | 'global';

/** The shared `?window=&segment=` params every endpoint accepts. */
export interface PEAnalyticsParams {
  window?: PEAnalyticsWindow;
  segment?: PEAnalyticsSegment;
}

// ---------------------------------------------------------------------------
// most-active-firms — GET /api/pe/analytics/most-active-firms
// ---------------------------------------------------------------------------
export interface PEMostActiveFirmRow {
  firmId: string;
  firmName: string | null;
  websiteUrl: string | null;
  newInvestments: number;
  /** Size-focus fields ($M). Any may be null. */
  revMin: number | null;
  revMax: number | null;
  ebitdaMin: number | null;
  ebitdaMax: number | null;
}

export interface PEMostActiveFirms {
  window: PEAnalyticsWindow;
  segment: PEAnalyticsSegment;
  rows: PEMostActiveFirmRow[];
}

// ---------------------------------------------------------------------------
// most-exits — GET /api/pe/analytics/most-exits
// ---------------------------------------------------------------------------
export interface PEMostExitsRow {
  firmId: string;
  firmName: string | null;
  websiteUrl: string | null;
  exits: number;
}

export interface PEMostExits {
  window: PEAnalyticsWindow;
  segment: PEAnalyticsSegment;
  rows: PEMostExitsRow[];
}

// ---------------------------------------------------------------------------
// top-sectors — GET /api/pe/analytics/top-sectors
// ---------------------------------------------------------------------------
export interface PETopSectorRow {
  sector: string;
  investments: number;
  uniqueFirms: number;
}

export interface PETopSectors {
  window: PEAnalyticsWindow;
  segment: PEAnalyticsSegment;
  rows: PETopSectorRow[];
}

// ---------------------------------------------------------------------------
// recent-by-sector — GET /api/pe/analytics/recent-by-sector
// ---------------------------------------------------------------------------
export type PERecentKind = 'invested' | 'exited';

export interface PERecentBySectorRow {
  sector: string;
  companyName: string | null;
  firmId: string;
  firmName: string | null;
  kind: PERecentKind;
  /** ISO 8601 datetime. */
  detectedAt: string;
}

export interface PERecentBySector {
  window: PEAnalyticsWindow;
  segment: PEAnalyticsSegment;
  rows: PERecentBySectorRow[];
}

// ---------------------------------------------------------------------------
// activity-trend — GET /api/pe/analytics/activity-trend
// ---------------------------------------------------------------------------
export interface PEActivityTrendRow {
  /** `YYYY-MM`. */
  month: string;
  added: number;
  exited: number;
}

export interface PEActivityTrend {
  window: PEAnalyticsWindow;
  segment: PEAnalyticsSegment;
  rows: PEActivityTrendRow[];
}

// ---------------------------------------------------------------------------
// summary — GET /api/pe/analytics/summary
// ---------------------------------------------------------------------------
export interface PEAnalyticsSummary {
  window: PEAnalyticsWindow;
  segment: PEAnalyticsSegment;
  newInvestments: number;
  exits: number;
  activeFirms: number;
  uniqueCompanies: number;
  /** Firms passing the segment filter alone (no 24 h/window gate). */
  eligibleFirms: number;
}

// ---------------------------------------------------------------------------
// geographic-clusters — GET /api/pe/analytics/geographic-clusters
// ---------------------------------------------------------------------------
export interface PEGeoClusterRow {
  key: string;
  label: string;
  holdings: number;
  uniqueFirms: number;
}

export interface PEGeoClusters {
  window: PEAnalyticsWindow;
  segment: PEAnalyticsSegment;
  scope: PEGeoScope;
  rows: PEGeoClusterRow[];
}

// ---------------------------------------------------------------------------
// hold-periods — GET /api/pe/analytics/hold-periods
// ---------------------------------------------------------------------------
export interface PEHoldPeriodRow {
  /** e.g. `<1y`, `1-2y`, … `10y+`. */
  bucket: string;
  sortIdx: number;
  current: number;
  exited: number;
  /** F62 R9g — optional for older payloads. */
  unknown?: number;
}

export interface PEHoldPeriodStats {
  currentCount: number;
  exitedCount: number;
  /** F62 R9g — optional for older payloads. */
  unknownCount?: number;
  /** Averages are 1-dp, nullable when the cohort is empty. */
  avgExitedYears: number | null;
  avgCurrentYears: number | null;
  medianExitedYears: number | null;
}

export interface PEHoldPeriods {
  window: PEAnalyticsWindow;
  segment: PEAnalyticsSegment;
  rows: PEHoldPeriodRow[];
  stats: PEHoldPeriodStats;
}
