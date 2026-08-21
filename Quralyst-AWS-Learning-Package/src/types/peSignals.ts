// PE Signals / Exit Watch types (F30.2) — mirrors the backend contract exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Signals).
// Access is gated by the `pe:dataset` permission (staff or explicit per-user grant). These are the
// SIGNALS read-model DTOs served by /api/pe/signals/* — derived analytics over the same PE dataset
// the screener/collection surfaces read. All shapes are camelCase inside the standard `{data}` envelope.

// ---------------------------------------------------------------------------
// Shared tier vocabularies (locked to the F30 backend / reference test).
// ---------------------------------------------------------------------------
/** Per-holding exit-readiness tier. `n/a` is never returned by the exit-readiness endpoint. */
export type PEReadinessTier = 'elevated' | 'watch' | 'low' | 'n/a';

/** Per-firm acquisition-appetite tier. */
export type PEAppetiteTier = 'high' | 'moderate' | 'low' | 'dormant';

// ---------------------------------------------------------------------------
// Acquisition appetite (per-firm) — carried on the firm bundle + batch rows.
// ---------------------------------------------------------------------------
export interface PEAcquisitionAppetite {
  score: number;
  tier: PEAppetiteTier;
  newInvestmentScore: number;
  exitActivityScore: number;
  last2yInvestments: number;
  exits2y: number;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Sector/geo mix (per-firm bundle).
// ---------------------------------------------------------------------------
export interface PEMixEntry {
  label: string;
  count: number;
  pct: number;
}

export interface PEMixByYearSector {
  year: number;
  total: number;
  sectors: { label: string; count: number }[];
}

export interface PEMixByYearGeo {
  year: number;
  total: number;
  geos: { label: string; count: number }[];
}

export interface PEFirmMix {
  sectorMix: { all: PEMixEntry[]; recent: PEMixEntry[] };
  geoMix: { all: PEMixEntry[]; recent: PEMixEntry[] };
  sectorByYear: PEMixByYearSector[];
  geoByYear: PEMixByYearGeo[];
  recentYears: number;
}

// ---------------------------------------------------------------------------
// Roll-ups (per-firm bundle) — a platform + its add-ons within a sector.
// ---------------------------------------------------------------------------
export interface PERollupDeal {
  companyName: string | null;
  year: number | null;
  status: 'current' | 'exited';
}

export interface PERollup {
  sector: string;
  totalDeals: number;
  currentCount: number;
  exitedCount: number;
  platform: PERollupDeal | null;
  addOns: PERollupDeal[];
  firstYear: number | null;
  lastDealYear: number | null;
  active: boolean;
  nextAddOnProfile: { sector: string; geography: string | null; note: string } | null;
}

// ---------------------------------------------------------------------------
// Firm signal bundle — GET /api/pe/signals/firms/{id}?recentYears=<1..10>
// ---------------------------------------------------------------------------
export interface PEHoldPeriodDistributionBucket {
  bucket: string;
  sortIdx: number;
  current: number;
  exited: number;
  /** F62 R9g — null/blank/unknown status cohort (optional for older payloads). */
  unknown?: number;
}

export interface PEHoldPeriod {
  medianHoldYears: number | null;
  avgHoldYears: number | null;
  exitedSampleSize: number;
  distribution: PEHoldPeriodDistributionBucket[];
}

export interface PECurrentHoldings {
  count: number;
  /** F62 R9g — holdings with null/blank/unknown status. */
  unknownCount?: number;
  withInvestmentDate: number;
  medianAgeYears: number | null;
  overHoldThresholdYears: number | null;
  overHoldCount: number;
  overHoldRatio: number | null;
}

export interface PECadence {
  investmentCount: number;
  firstInvestmentYear: number | null;
  lastInvestmentYear: number | null;
  spanYears: number | null;
  investmentsPerYear: number | null;
  medianGapMonths: number | null;
  last2yCount: number;
  last5yCount: number;
}

export interface PEFirmSignals {
  firmId: string;
  firmName: string | null;
  asOfYear: number;
  holdingsCount: number;
  holdPeriod: PEHoldPeriod;
  currentHoldings: PECurrentHoldings;
  cadence: PECadence;
  mix: PEFirmMix;
  appetite: PEAcquisitionAppetite;
  rollups: PERollup[];
}

// ---------------------------------------------------------------------------
// Batch firm rows — GET /api/pe/signals/firms
// ---------------------------------------------------------------------------
export interface PESignalsBatchRow {
  firmId: string;
  firmName: string | null;
  medianHoldYears: number | null;
  exitedSampleSize: number;
  currentDatedCount: number;
  currentCount: number;
  /** F62 R9g — optional for older payloads. */
  unknownCount?: number;
  overHoldCount: number;
  firstInvestmentYear: number | null;
  lastInvestmentYear: number | null;
  investmentCount: number;
  investmentsPerYear: number | null;
  newInvestments2y: number;
  newInvestments5y: number;
  exits2y: number;
  exits5y: number;
  appetite: PEAcquisitionAppetite;
}

export interface PESignalsBatch {
  rows: PESignalsBatchRow[];
}

// ---------------------------------------------------------------------------
// Sector signals — GET /api/pe/signals/sectors?window&segment&limit
// ---------------------------------------------------------------------------
export interface PESectorSignalRow {
  sector: string;
  investments: number;
  exits: number;
  uniqueFirms: number;
  investmentsPerYear: number | null;
  exitsPerYear: number | null;
  lowSample: boolean;
}

export interface PESectorSignals {
  window: string;
  segment: string;
  rows: PESectorSignalRow[];
}

export interface PESectorSignalsQuery {
  window?: string;
  segment?: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Exit readiness — GET /api/pe/signals/exit-readiness?firmId&sector&tier&limit&holdingIds
// ---------------------------------------------------------------------------
export interface PEExitReadinessRow {
  holdingId: string;
  firmId: string;
  firmName: string | null;
  companyName: string | null;
  sector: string | null;
  geography: string | null;
  investmentDate: string | null;
  applicable: boolean;
  score: number;
  tier: PEReadinessTier;
  holdingAgeYears: number | null;
  thresholdYears: number | null;
  thresholdSource: 'firm' | 'default' | null;
  overThreshold: boolean;
  reasons: string[];
}

export interface PEExitReadiness {
  asOfYear: number;
  total: number;
  rows: PEExitReadinessRow[];
  coverage: { currentTotal: number; dated: number };
}

/** Tier is server-side "at-least-rank": `elevated` returns only elevated; `watch` returns watch+elevated. */
export type PEExitReadinessTierFilter = 'elevated' | 'watch' | 'low';

export interface PEExitReadinessQuery {
  firmId?: string;
  sector?: string;
  /** At-least-rank tier filter (server-side). */
  tier?: PEExitReadinessTierFilter;
  /** Default 100, max 500. Exit Watch fetches 500. */
  limit?: number;
  holdingIds?: string;
}
