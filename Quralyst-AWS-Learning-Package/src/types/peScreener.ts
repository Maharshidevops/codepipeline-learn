// PE Screener types (F29.2) — mirrors the backend contract
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Screener).
// Access is gated by the `pe:dataset` permission (staff or explicit per-user grant). These are the
// SCREENER read-model DTOs served by /api/pe/screener/* — distinct from the collection-side PE types
// in `pe.ts` (the screener returns a flattened, provenance-annotated projection over the same data).

import type { PEHoldingQuality } from './pe';

// ---------------------------------------------------------------------------
// Common envelope meta — every list path returns { data, meta:{total,page,pageSize} }.
// (`export=true` bypasses this: `data` is then a bare flat array up to 50000.)
// ---------------------------------------------------------------------------
export interface PEScreenerListMeta {
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Holdings tab — GET /api/pe/screener/holdings
// ---------------------------------------------------------------------------
export type PEScreenerHoldingSortBy =
  | 'companyName'
  | 'firmName'
  | 'sector'
  | 'investmentStatus'
  | 'investmentDate'
  | 'lastSeenAt';

export type PEScreenerSortDir = 'asc' | 'desc';

/** yes|no tri-state exists-filter value (empty string ⇒ unset). */
export type PEScreenerYesNo = '' | 'yes' | 'no';

export interface PEScreenerHoldingRow {
  id: string;
  firmId: string;
  firmName: string;
  companyName: string;
  sector: string | null;
  geography: string | null;
  investmentStatus: 'current' | 'realized' | 'unknown' | null;
  foundingYear: string | null;
  investmentDate: string | null;
  exitDate: string | null;
  description: string | null;
  aiDescription: string | null;
  /** Backend ListField — always an array on the wire (may be empty). */
  aiKeywords: string[];
  keyProductsServices: string[];
  websiteUrl: string | null;
  peDetailUrl: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  // Per-field provenance keys (present when the backend knows a field's origin).
  companyNameSource?: string | null;
  sectorSource?: string | null;
  geographySource?: string | null;
  investmentDateSource?: string | null;
  descriptionSource?: string | null;
  websiteUrlSource?: string | null;
  quality: PEHoldingQuality;
}

export interface PEScreenerHoldingsQuery {
  search?: string;
  firmId?: string;
  status?: string;
  sector?: string;
  geography?: string;
  investYearFrom?: string;
  investYearTo?: string;
  hasDate?: PEScreenerYesNo;
  hasDescription?: PEScreenerYesNo;
  hasWebsite?: PEScreenerYesNo;
  /** `'suspect'` restricts to rows with a present-but-bad field (fix-it view). */
  qualityFilter?: 'suspect';
  /** Default off — when true the default suspect-exclusion is lifted. */
  includeSuspect?: boolean;
  sortBy?: PEScreenerHoldingSortBy;
  sortDir?: PEScreenerSortDir;
  /** 0-based page index (contract). */
  page?: number;
  pageSize?: number;
}

export interface PEScreenerHoldingsList {
  rows: PEScreenerHoldingRow[];
  meta: PEScreenerListMeta;
}

// ---------------------------------------------------------------------------
// Holdings header stats — GET /api/pe/screener/holdings-stats
// ---------------------------------------------------------------------------
export interface PEScreenerHoldingsStats {
  total: number;
  withDescription: number;
  withGeography: number;
  withInvestmentDate: number;
  withWebsite: number;
}

// ---------------------------------------------------------------------------
// Firms tab — GET /api/pe/screener/firms
// ---------------------------------------------------------------------------
export interface PEScreenerFirmRow {
  id: string;
  name: string;
  websiteUrl: string | null;
  description: string | null;
  status: string | null;
  lastScrapedAt: string | null;
  holdingsCount: number;
  revMin: number | null;
  revMax: number | null;
  negativeEbitdaOk: boolean | null;
  ebitdaMin: number | null;
  ebitdaMax: number | null;
  evMin: number | null;
  evMax: number | null;
  equityCheckMin: number | null;
  equityCheckMax: number | null;
  sectorCriteria: string | null;
  geoCriteria: string | null;
  sizeCriteriaDerived: string | null;
  sizeCriteriaSource: string | null;
  criteriaAutoFilled: Record<string, string> | null;
}

export interface PEScreenerFirmsQuery {
  search?: string;
  status?: string;
  /** Target-company overlap targets ($M). A firm passes when its stated range covers the target. */
  revTarget?: number;
  ebitdaTarget?: number;
  evTarget?: number;
  equityTarget?: number;
  negativeEbitdaOk?: boolean;
  sectorSearch?: string;
  geoSearch?: string;
  page?: number;
  pageSize?: number;
}

export interface PEScreenerFirmsList {
  rows: PEScreenerFirmRow[];
  meta: PEScreenerListMeta;
}

// ---------------------------------------------------------------------------
// People tab — GET /api/pe/screener/people
// ---------------------------------------------------------------------------
export interface PEScreenerPersonRow {
  id: string;
  firmId: string;
  firmName: string;
  name: string;
  title: string | null;
  email: string | null;
  emailSource: string | null;
  emailInferred: boolean;
  emailVerificationStatus: string | null;
  emailVerificationScore: number | null;
  emailVerifiedAt: string | null;
  linkedinUrl: string | null;
  linkedinSource: string | null;
  bioSource: string | null;
  phone: string | null;
  phoneSource: string | null;
  contactSourceUrl: string | null;
  photoUrl: string | null;
  roleTag: string | null;
  focusTags: string[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

export interface PEScreenerPeopleQuery {
  search?: string;
  firmId?: string;
  title?: string;
  roleTag?: string;
  hasLinkedIn?: PEScreenerYesNo;
  page?: number;
  pageSize?: number;
}

export interface PEScreenerPeopleList {
  rows: PEScreenerPersonRow[];
  meta: PEScreenerListMeta;
}

// ---------------------------------------------------------------------------
// Options — GET /api/pe/screener/options
// ---------------------------------------------------------------------------
export interface PEScreenerOptions {
  sectors: string[];
  geographies: string[];
}

// ---------------------------------------------------------------------------
// Find Similar — POST /api/pe/screener/find-similar-firms
// ---------------------------------------------------------------------------
export type PEScreenerSearchMode = 'current_owners' | 'past_owners' | 'sector_interest_only';

/** The AI-extracted industry plan echoed back with the result. */
export interface PEScreenerCriteria {
  sectors: string[];
  industryLabel: string;
  subTerms: string[];
  geography: string | null;
  rationale: string;
}

/** One matching portfolio company (evidence) under a ranked firm. */
export interface PEScreenerTopMatch {
  id: string;
  companyName: string;
  sector: string | null;
  geography: string | null;
  description: string | null;
  investmentStatus: 'current' | 'realized' | 'unknown' | null;
  investmentDate: string | null;
  websiteUrl: string | null;
  similarity: number | null;
  matchReason: string | null;
}

/** A ranked PE firm. Mode C firms carry score=100, matchCount=0, topMatches=[]. */
export interface PEScreenerSimilarFirm {
  firmId: string;
  firmName: string;
  firmWebsite: string | null;
  firmDescription: string | null;
  firmStatus: string | null;
  sectorCriteria: string | null;
  geoCriteria: string | null;
  revMin: number | null;
  revMax: number | null;
  ebitdaMin: number | null;
  ebitdaMax: number | null;
  evMin: number | null;
  evMax: number | null;
  equityCheckMin: number | null;
  equityCheckMax: number | null;
  negativeEbitdaOk: boolean | null;
  score: number;
  matchCount: number;
  topMatches: PEScreenerTopMatch[];
}

export interface PEScreenerSimilarResult {
  query: string;
  mode: PEScreenerSearchMode;
  criteria: PEScreenerCriteria;
  firms: PEScreenerSimilarFirm[];
  candidatesSearched: number;
  /** Present on an empty plan / empty result — a rephrase hint to show the user. */
  message?: string | null;
}

export interface PEScreenerFindSimilarBody {
  query: string;
  mode: PEScreenerSearchMode;
}
