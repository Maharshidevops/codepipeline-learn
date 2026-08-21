// PE Dataset types (F23.4) — mirrors the backend contract
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset).
// Access is gated by the `pe:dataset` permission (staff or explicit per-user grant).

export type PEFirmStatus = 'active' | 'error' | 'quarantined' | 'paused';
export type PEFreshness = 'fresh' | 'stale' | 'never';
export type PEScrapeJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PEFirm {
  id: string;
  name: string;
  websiteUrl: string;
  portfolioUrl: string | null;
  criteriaUrl: string | null;
  teamPageUrl: string | null;
  description: string | null;
  status: PEFirmStatus;
  scrapeFrequencyHours: number | null;
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
  sectorCriteriaInferred: string | null;
  geoCriteriaInferred: string | null;
  criteriaAutoFilled: Record<string, string> | null;
  sizeCriteriaDerived: string | null;
  sizeCriteriaSource: string | null;
  firmHostKey: string;
  holdingsCount: number;
  peopleCount: number;
  lastScrapedAt: string | null;
  createdAt: string;
  freshness: PEFreshness;
}

export interface PEScrapeJob {
  id: string;
  firmId: string | null;
  ibFirmId: string | null;
  jobType: string;
  status: PEScrapeJobStatus;
  trigger: string;
  retryCount: number;
  errorMessage: string | null;
  claimedBy: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  /** F60 §9.4 scrape-health — null on pre-F60 / non-portfolio jobs. */
  coverageStatus?: number | null;
  coverageWebsite?: number | null;
  coverageSector?: number | null;
  coverageGeography?: number | null;
  coverageDate?: number | null;
  coverageDescription?: number | null;
  seenCount?: number | null;
  staleRemoved?: number | null;
  replaceVerdict?: string | null;
  targetUrl?: string | null;
  holdingsFound?: number | null;
}

/** In-flight job row on GET /api/pe/firms/{id}/enrichment-status (F60 §4 / F61 R10). */
export interface PEEnrichmentActiveJob {
  id: string;
  jobType: string;
  status: string;
  /** Counters on tool jobs; null on enrichment-queue rows (F62 R10.1). */
  processed: number | null;
  total: number | null;
  /** Homogeneous discriminator: data-tool ledger job vs enrichment-queue job. */
  kind?: 'tool' | 'queue';
}

/** GET /api/pe/firms/{id}/enrichment-status — coverage ledger aggregates (F60 §4). */
export interface PEEnrichmentStatus {
  total: number;
  urlEnriched: number;
  urlAttempted: number;
  gicsEnriched: number;
  gicsAttempted: number;
  locationEnriched: number;
  locationAttempted: number;
  activeJobs: PEEnrichmentActiveJob[];
  /** True when a ledger read failed — zeros are not a real empty coverage. */
  partial?: boolean;
}

/** POST /api/pe/firms/discover response — API-only since CU.5 (no FE consumer; kept
 *  as the wire-shape record for the contract docs). */
export interface PEDiscoverResult {
  firmName: string;
  websiteUrl: string;
  portfolioUrl: string | null;
  criteriaUrl: string | null;
  accepted: boolean;
  quarantineReason: string | null;
}

export type PEBulkImportStatus = 'created' | 'duplicate' | 'quarantined' | 'failed';

export interface PEBulkImportRow {
  url: string;
  status: PEBulkImportStatus;
  firmId?: string;
  firmName?: string | null;
  portfolioUrl?: string | null;
  criteriaUrl?: string | null;
  reason?: string;
  error?: string;
}

export interface PEBulkImportSummary {
  total: number;
  created: number;
  duplicate: number;
  quarantined: number;
  failed: number;
}

export interface PEBulkImportResult {
  results: PEBulkImportRow[];
  summary: PEBulkImportSummary;
}

export interface PEFirmListMeta {
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// PE Holdings (F24.1 contract) — aggregated cross-firm portfolio dataset.
// Backend: Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Holdings (Tier C).
// ---------------------------------------------------------------------------

export type PEInvestmentStatus = 'current' | 'realized' | 'unknown' | null;

/** Where a field's current value came from (per-field provenance map). */
export type PEHoldingSource =
  | 'operator'
  | 'scrape'
  | 'scrape_unverified'
  | 'ai_search'
  | 'ai_description';

/** Read-time quality tier for a single field. `missing` never flips `hasIssue`. */
export type PEFieldTier = 'valid' | 'suspect' | 'invalid' | 'missing';

/** Overall row tier (the worst present-but-bad field wins). */
export type PEOverallTier = 'valid' | 'suspect' | 'invalid';

export interface PEFieldQuality {
  tier: PEFieldTier;
  reasons: string[];
}

/** The scored fields the backend reports quality for. */
export type PEQualityField =
  | 'companyName'
  | 'websiteUrl'
  | 'sector'
  | 'geography'
  | 'investmentDate'
  | 'description';

export interface PEHoldingQuality {
  overallTier: PEOverallTier;
  /** true when a present field is suspect/invalid — drives the row badge + suspect view. */
  hasIssue: boolean;
  fields: Partial<Record<PEQualityField, PEFieldQuality>>;
}

export interface PEHolding {
  id: string;
  firmId: string;
  firmName: string;
  companyName: string;
  companyKey: string;
  sector: string | null;
  subSector: string | null;
  geography: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  investmentStatus: PEInvestmentStatus;
  foundingYear: string | null;
  investmentDate: string | null;
  exitDate: string | null;
  estimatedInvestmentYear: number | string | null;
  estimatedInvestmentMonth: number | string | null;
  estimatedInvestmentConfidence: number | null;
  description: string | null;
  aiDescription: string | null;
  aiKeywords: string[];
  keyProductsServices: string[];
  websiteUrl: string | null;
  peDetailUrl: string | null;
  logoUrl: string | null;
  pendingReview: boolean;
  manuallyCurated: boolean;
  qualityScore: number | null;
  /** Per-field provenance; only edited/known fields appear. */
  sources: Partial<Record<PEQualityField, PEHoldingSource>>;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  quality: PEHoldingQuality;
  /**
   * This company has people actually attached to it — a direct or sector match. Computed only
   * when the list is filtered by `firmId`; `false` everywhere else, so do not read it as
   * "definitely has no team" on the cross-firm list. Excludes the firm-lead fallback on
   * purpose: that stands in for every holding, so counting it would light up every row.
   */
  hasTeam: boolean;
}

export interface PEHoldingListMeta {
  total: number;
  page: number;
  pageSize: number;
}

/**
 * How this person was attached to the holding:
 *  • `direct`   — the holding is named in their bio or portfolio-company list;
 *  • `sector`   — an investment-role person whose focus overlaps the holding's sector;
 *  • `fallback` — no direct or sector link at all, so the firm's senior investment lead
 *                 stands in. Render it as such ("Firm Lead"), not as a real attachment.
 */
export type PEPersonMatchType = 'direct' | 'sector' | 'fallback';

/** Which rung of the ladder the panel as a whole landed on; `none` = the firm has no people. */
export type PETeamMatchType = 'direct' | 'sector_fallback' | 'firm_fallback' | 'none';

/**
 * A deal-team member. Mirrors `holding_service._team_person` — the backend projects this exact
 * camelCase set rather than echoing the Mongo document, so adding a field here means adding it
 * there too. (F66 Unit 3: the route used to ship `linkedin_url`/`photo_url`/`role_tag`, which
 * this interface never matched; it went unnoticed because the panel only read name and title.)
 */
export interface PEPerson {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  emailInferred: boolean;
  emailSource: string | null;
  emailVerificationStatus: string | null;
  emailVerificationScore: number | null;
  emailVerifiedAt: string | null;
  phone: string | null;
  phoneSource: string | null;
  linkedinUrl: string | null;
  linkedinSource: string | null;
  contactSourceUrl: string | null;
  photoUrl: string | null;
  bio: string | null;
  bioSource: string | null;
  roleTag: string | null;
  focusTags: string[] | null;
  matchType: PEPersonMatchType;
}

export interface PEHoldingTeam {
  people: PEPerson[];
  matchType: PETeamMatchType;
  sector: string | null;
  directCount: number;
  sectorCount: number;
  fallbackCount: number;
}

/** One leg of GET /holdings/:id/enrichment.
 *
 * `status` is the ledger's own verdict: `found` means the pass produced a usable answer,
 * `not_found` means it ran and could not. A leg the pass has not covered yet is `null` on
 * PEHoldingEnrichment rather than an object — an absent run and a failed run are different
 * facts and the panel says so. */
export interface PEEnrichmentLeg {
  status: 'found' | 'not_found' | 'error' | 'skipped_budget';
  confidence: 'high' | 'medium' | 'low' | 'not_found' | null;
  errorMessage: string | null;
  checkedAt: string | null;
}

export interface PEGicsLeg extends PEEnrichmentLeg {
  sector: string | null;
  sectorCode: string | null;
  industryGroup: string | null;
  /** Official 4-digit GICS group code (F70 Unit C) — a static lookup, no LLM. */
  industryGroupCode: string | null;
  /** GICS levels 3/4 (F70 Unit E). Populated only when the model's code NESTED under its
   *  confirmed parent, so a non-null name here has had its position in the tree checked. */
  industry: string | null;
  industryCode: string | null;
  subIndustry: string | null;
  subIndustryCode: string | null;
  reasoning: string | null;
}

export interface PEUrlLeg extends PEEnrichmentLeg {
  url: string | null;
  location: string | null;
  description: string | null;
}

export interface PELocationLeg extends PEEnrichmentLeg {
  city: string | null;
  stateRegion: string | null;
  country: string | null;
  website: string | null;
  source: string | null;
}

/** GET /holdings/:id/enrichment — what the enrichment drain recorded for this holding.
 *
 * These come from the pipeline's own ledgers (`pe_tool_*_results`). GICS in particular is
 * ledger-only by design (F60 13.1): `holding.sector` carries the INVESTOR vocabulary, so the
 * GICS taxonomy has no other read path. */
export interface PEHoldingEnrichment {
  companyName: string | null;
  gics: PEGicsLeg | null;
  url: PEUrlLeg | null;
  location: PELocationLeg | null;
}

/** POST /holdings/:id/ai-enrich outcome (F24.2). */
export interface PEHoldingEnrichResult {
  holding: PEHolding;
  filledFields: string[];
}

// ---------------------------------------------------------------------------
// PE People (F25.1/F25.2 contract) — platform-global team directory.
// Backend: Phases/Migration/REF-API-CONTRACT.md §PE Dataset — People (Tier C).
// Distinct from the holdings-team `PEPerson` subset above: this is the full
// people-dataset row the /pe/people surface renders.
// ---------------------------------------------------------------------------

/** Provenance label shown next to an email (contract-locked to the QURALYST-20 surface). */
export type PEPersonEmailLabel = 'Apollo' | 'Inferred' | 'Confirmed';

/** Kickbox deliverability verdict for an inferred email. */
export type PEEmailVerificationStatus =
  | 'deliverable'
  | 'risky'
  | 'undeliverable'
  | 'unknown'
  | string;

/** Full people-dataset row (camelCase, mirrors the backend `PersonRow`). */
export interface PEPersonRow {
  id: string;
  firmId: string;
  firmName: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  bio: string | null;
  bioSource: string | null;
  email: string | null;
  emailInferred: boolean;
  emailSource: string | null;
  emailLabel: PEPersonEmailLabel | null;
  emailVerificationStatus: PEEmailVerificationStatus | null;
  emailVerificationScore: number | null;
  emailVerifiedAt: string | null;
  phone: string | null;
  phoneSource: string | null;
  linkedinUrl: string | null;
  linkedinSource: string | null;
  contactSourceUrl: string | null;
  photoUrl: string | null;
  pageUrl: string | null;
  location: string | null;
  strategy: string | null;
  roleTag: string | null;
  focusTags: string[];
  portfolioCompanies: string[];
  sector: string | null;
  reviewFlags: string[];
  flaggedAt: string | null;
  flagReason: string | null;
  pendingReview: boolean;
  manuallyCurated: boolean;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

/** GET /pe/people pagination bag (offset-based, unlike holdings' page index). */
export interface PEPeopleListMeta {
  total: number;
  limit: number;
  offset: number;
}

/** Per-firm coverage counts from GET /pe/people/summary (no PII). */
export interface PEFirmCoverage {
  firmId: string;
  firmName: string;
  count: number;
  withLinkedin: number;
  withEmail: number;
  withInferredEmail: number;
  withBio: number;
  withPhoto: number;
  withTags: number;
}

/** Role/tag distribution entry for the summary stat row. */
export interface PETagDistributionEntry {
  role: string;
  count: number;
}

export interface PEPeopleSummary {
  firms: PEFirmCoverage[];
  total: number;
  tagged: number;
  tagDistribution: PETagDistributionEntry[];
}

/** The long-running batch ops registered as SSE processTypes (F25.2). */
export type PEPeopleProcessType =
  | 'pe_people_tag'
  | 'pe_people_tag_focus'
  | 'pe_people_find_emails'
  | 'pe_people_verify_emails'
  | 'pe_people_contact_enrich'
  | 'pe_people_scrape_batch'
  | 'pe_people_scrape_by_firms';

/** 202 payload for a started batch op — the FE subscribes to SSE with these. */
export interface PEPeopleBatchAccepted {
  processId: string;
  processType: PEPeopleProcessType;
}

/** find-emails / verify-emails dry-run preview (spends nothing). */
export interface PEPeopleDryRun {
  eligible: number;
  dryRun: true;
}

/** A firm matched from a pasted URL during the export resolve step. */
export interface PEPeopleResolvedFirm {
  firmId: string;
  firmName: string;
  websiteUrl: string;
}

/** A firm matched only via the parent-domain / non-root fallback (carries a warning). */
export interface PEPeoplePartialMatch extends PEPeopleResolvedFirm {
  inputUrl: string;
  warning: string;
}

export interface PEPeopleResolveResult {
  matched: PEPeopleResolvedFirm[];
  partialMatches: PEPeoplePartialMatch[];
  unmatched: string[];
}
