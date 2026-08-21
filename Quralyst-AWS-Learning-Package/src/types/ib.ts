// IB Vertical types (F34.4) — mirror the backend contract shapes exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §IB Vertical (Tier C, F34)).
// The second dataset vertical: investment banks, their advised tombstone transactions, and their
// professionals, capped by an advisory league table. Access is gated by the SAME `pe:dataset`
// permission as the PE vertical (staff OR explicit per-user grant); staff-only ops (DELETE bank,
// infer-emails, scan-contact-pages, the three re-queues) ride `pe:admin`. All shapes are camelCase
// inside the standard `{data}` envelope (unwrapped by the shared http seam).

// ---------------------------------------------------------------------------
// Shared vocabularies (locked to the backend / reference route).
// ---------------------------------------------------------------------------
export type IBBankStatus = 'active' | 'paused';

// ---------------------------------------------------------------------------
// Bank shape (`mapBank`) — GET /api/ib, /api/ib/{id}
// ---------------------------------------------------------------------------
export interface IBBank {
  id: string;
  name: string;
  websiteUrl: string;
  description: string | null;
  dealFocus: string | null;
  /** Free-text deal-type focus blurb (reference `z.string()` — a string, not a list). */
  dealTypes: string | null;
  hqLocation: string | null;
  foundedYear: number | null;
  employeeCount: number | null;
  status: IBBankStatus;
  lastScrapedAt: string | null;
  createdAt: string;
  /** Per-field provenance for criteria auto-filled by the scrape (field → source). */
  criteriaAutoFilled: Record<string, string> | null;
  transactionsCount: number;
  peopleCount: number;
}

// ---------------------------------------------------------------------------
// Transaction (tombstone) wire shape — GET /api/ib/transactions,
// /api/ib/{id}/transactions, league table rows reference it.
// ---------------------------------------------------------------------------
export interface IBTransaction {
  id: string;
  bankId: string;
  bankName: string | null;
  bankWebsite: string | null;
  dealName: string | null;
  /** Canonical deal-type vocabulary value. */
  dealType: string | null;
  /** Raw provenance string (= dealSizeRaw), e.g. "$50MM+". */
  dealSize: string | null;
  /** Absolute USD ints (structured, §3.5). */
  dealSizeMin: number | null;
  dealSizeMax: number | null;
  dealSizeExact: number | null;
  /** ISO-prefixed text (YYYY / YYYY-MM / YYYY-MM-DD), NOT a datetime (§3.6). */
  dealDate: string | null;
  /** Precision of `dealDate` — "year" | "month" | "day" | null. */
  datePrecision: string | null;
  targetCompany: string | null;
  acquirerCompany: string | null;
  /** Canonical role vocabulary value ("Sell-side advisor", …). */
  role: string | null;
  /** Canonical sector vocabulary value. */
  sector: string | null;
  sectorTags: string[];
  description: string | null;
  sourceUrl: string | null;
  scrapedAt: string | null;
}

// ---------------------------------------------------------------------------
// Person shape — GET /api/ib/people, /api/ib/{id}/people
// ---------------------------------------------------------------------------
export interface IBPerson {
  id: string;
  bankId: string;
  bankName: string | null;
  bankWebsite: string | null;
  name: string;
  title: string | null;
  bio: string | null;
  email: string | null;
  /** True when the email was derived (first.last@domain), Kickbox-verified as second-class. */
  emailInferred: boolean;
  linkedinUrl: string | null;
  imageUrl: string | null;
  location: string | null;
  scrapedAt: string | null;
}

// ---------------------------------------------------------------------------
// Coverage stats — GET /api/ib/coverage-stats (Coverage Breakdown panel)
// ---------------------------------------------------------------------------
export interface IBCoverageStats {
  total: number;
  withTransactions: number;
  withPeople: number;
  withBoth: number;
  withNeither: number;
  withTransactionsPct: number;
  withPeoplePct: number;
  withBothPct: number;
  withNeitherPct: number;
}

// ---------------------------------------------------------------------------
// Bulk import — POST /api/ib/bulk-import
// ---------------------------------------------------------------------------
export type IBBulkImportStatus = 'created' | 'exists' | 'error';

export interface IBBulkImportRow {
  url: string;
  status: IBBulkImportStatus;
  name?: string;
}

export interface IBBulkImportResult {
  results: IBBulkImportRow[];
  created: number;
}

/** One GET /api/ib/discover candidate (Serper-backed; BYOK serper key server-side). */
export interface IBDiscoverResult {
  name: string | null;
  websiteUrl: string;
  snippet: string | null;
}

// ---------------------------------------------------------------------------
// Scrape triggers / status
// ---------------------------------------------------------------------------
/** POST /api/ib/scrape-all + the three staff re-queues + scan-contact-pages. */
export interface IBQueuedResult {
  queued: number;
  message: string;
}

/** POST /api/ib/{id}/scrape + /api/ib/{id}/enrich. */
export interface IBScrapeOneResult {
  queued: boolean;
  bankId: string;
}

/** POST /api/ib/infer-emails. */
export interface IBInferEmailsResult {
  processed: number;
  inferred: number;
  message: string;
}

export interface IBScrapeJob {
  id: string;
  ibFirmId: string | null;
  jobType: string;
  status: string;
  trigger: string;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface IBScrapeStatus {
  jobs: IBScrapeJob[];
  counts: Record<string, number>;
}

/** GET /api/ib/rescrape-transactions/progress — deal re-scrape live panel. */
export interface IBTransactionRescrapeProgress {
  running: boolean;
  total: number;
  done: number;
  found: number;
  /** Epoch ms when the batch started, or null. */
  startedAt: number | null;
}

/** GET /api/ib/{id}/enrichment-status — derived from the job queue (thin seam). */
export interface IBEnrichmentStatus {
  total: number;
  urlEnriched: number;
  urlAttempted: number;
  locationEnriched: number;
  locationAttempted: number;
  activeJobs: IBScrapeJob[];
}

// ---------------------------------------------------------------------------
// Screener stats — GET /api/ib/screener/stats
// ---------------------------------------------------------------------------
export interface IBScreenerStats {
  totalBanks: number;
  totalTransactions: number;
  totalPeople: number;
  banksWithTransactions: number;
  dealTypes: string[];
  sectors: string[];
}

// ---------------------------------------------------------------------------
// League table — GET /api/ib/analytics/league-table
// ---------------------------------------------------------------------------
export interface IBLeagueRow {
  bankId: string;
  bankName: string | null;
  dealCount: number;
  /** Up to 3 top sectors. */
  topSectors: string[];
  /** ISO-prefixed text `dealDate` of the most recent deal. */
  mostRecentDeal: string | null;
}

export interface IBLeagueTable {
  rows: IBLeagueRow[];
}

// ---------------------------------------------------------------------------
// Editable field set — PATCH /api/ib/{id} (UpdateBankBody)
// ---------------------------------------------------------------------------
export interface IBBankPatch {
  name?: string;
  websiteUrl?: string;
  description?: string | null;
  dealFocus?: string | null;
  dealTypes?: string | null;
  hqLocation?: string | null;
  status?: IBBankStatus;
}

// ---------------------------------------------------------------------------
// Query param bags
// ---------------------------------------------------------------------------
export interface IBTransactionsQuery {
  dealType?: string;
  sector?: string;
  bankId?: string;
  q?: string;
}

export interface IBPeopleQuery {
  bankId?: string;
  title?: string;
  q?: string;
}

export interface IBLeagueQuery {
  sector?: string;
  dealType?: string;
  /** Integer count of months, or the literal string `"all"`. */
  months?: number | 'all';
}
