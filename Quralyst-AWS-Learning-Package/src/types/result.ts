// Result types. See REF-DATA-MODEL.md.

export type ResultTab = 'target-list' | 'strategic-buyer' | 'fv-results' | 'tearsheets';

export interface UploadedFile {
  displayFilename: string;
  fileName: string;
  /** GridFS id used for preview/download of the original upload. */
  gridfsId?: string | null;
  totalFileRecords?: number;
  matchesFound?: number;
  error?: boolean;
  validationFailed?: boolean;
  validationReason?: string;
}

export interface FiltersApplied {
  industryPairs?: { industry: string; subIndustry?: string }[];
  locationGroups?: { continent?: string; country?: string; state?: string; city?: string }[];
  minEmployees?: number;
  maxEmployees?: number;
  minRevenue?: number;
  maxRevenue?: number;
  businessQueries?: string[];
  customInsights?: { questions: string[] };
  // Activity / matching options (View-result Files Processing Summary). All optional → payloads that
  // omit them fall back to the UI's sensible default.
  primaryActivity?: string; // 'Product' | 'Service' | 'Both'
  secondaryActivity?: string; // 'Manufacturer' | 'Distributor' | 'Retailer' | 'Not Applicable'
  sizeCriteriaLogic?: string;
  /** @deprecated Legacy mock alias — prefer sizeCriteriaLogic. */
  sizeMatchLogic?: 'AND' | 'OR';
  primaryBusinessOnly?: boolean;
  skipWebsiteScraping?: boolean;
  // Enrichment toggles (camelCase keys emitted by the API after filters_applied is camelized).
  useApollo?: boolean;
  useNews?: boolean;
  useAcquisitionNews?: boolean;
  enableLinkedinEnrichment?: boolean;
  ownershipEnrichment?: boolean;
  acquisitionEnrichment?: boolean;
  blankFieldBackfill?: boolean;
  // Additional-source search toggles + per-source result caps (Data Sourcing Options).
  enableApolloSearch?: boolean;
  enableGmapsSearch?: boolean;
  enableCoresignalSearch?: boolean;
  enableLinkedinSearch?: boolean;
  enableFindallSearch?: boolean;
  apolloMaxResults?: number;
  gmapsMaxResults?: number;
  coresignalMaxResults?: number;
  linkedinMaxResults?: number;
  findallMaxResults?: number;
  // AI model selection for the run (stored as llm_providers / llm_fallback_enabled).
  llmProviders?: string[] | null;
  llmFallbackEnabled?: boolean;
  // FV-only:
  industry?: string;
  subIndustry?: string;
  location?: { state?: string; country?: string };
}

export interface ResultSummary {
  processId: string;
  resultId?: string; // FV uses resultId
  createdAt: string;
  username: string;
  userId: string;
  totalMatches?: number;
  totalCount?: number; // FV uses totalCount
  filesUploaded: UploadedFile[];
  filtersApplied: FiltersApplied;
  resultFilename?: string;
  hasResultsFile: boolean;
  status?: string;
  /** Present when the result was saved with re-run versioning. */
  version?: number;
  versionGroup?: string;
}

export interface CrmRow {
  companyName: string;
  [field: string]: string;
}

/** Applied search criteria for a Financial Verticals result (camelCase of the stored
 *  filters_applied). Only present on FV result detail. */
export interface FvAppliedFilters {
  targetDescription?: string;
  businessType?: string;
  industry?: string;
  subIndustry?: string;
  location?: { state?: string; country?: string };
  size?: {
    revenueMin?: string | number;
    revenueMax?: string | number;
    ebitdaMin?: string | number;
    ebitdaMax?: string | number;
  };
  // F67 — resolved floors actually applied to the run (defaults filled in); the raw
  // pair the analyst typed is carried separately for rerun prefill.
  platformFloors?: { ebitda?: number | null; revenue?: number | null };
  platformFloorsRaw?: { ebitda?: number | null; revenue?: number | null };
  exposure?: {
    currentPortfolio?: boolean;
    pastPortfolio?: boolean;
    listedInterest?: boolean;
  };
}

export interface ResultVersionSibling {
  processId: string;
  version: number;
  createdAt?: string | null;
  totalMatches?: number;
  status?: string;
}

export interface ResultDetail {
  processId: string;
  createdAt: string;
  columns: string[];
  rows: Record<string, string>[];
  crmData?: CrmRow[];
  manualFields?: string[];
  usernames?: string[];
  ynFields?: string[];
  statusFields?: Record<string, string[]>;
  isInputFilePreview?: boolean;
  inputFileName?: string;
  filtersApplied?: FvAppliedFilters | Record<string, unknown>;
  /** Original uploads used for this run (target/strategic). */
  filesUploaded?: UploadedFile[];
  title?: string;
  resultFilename?: string;
  status?: string;
  sourceType?: string;
  totalMatches?: number;
  totalRows?: number;
  version?: number;
  versionGroup?: string;
  versions?: ResultVersionSibling[];
  knowledgeUsed?: string[];
  knowledgeWarning?: string;
}

export interface SummaryStats {
  fitsCount: number;
  partialFitsCount: number;
  totalInputRecords: number;
  totalMatches: number;
  topLocations: { name: string; count: number }[];
  stateDistribution: { name: string; count: number; percentage: number }[];
  employeeDistribution: { range: string; companies: number; percentage: number }[];
  revenueDistribution: { range: string; companies: number; percentage: number }[];
  topCountryName: string;
  companiesWithPhone: number;
  companiesWithEmail: number;
  companiesWithAddress: number;
  companiesWithExecutive: number;
}

// ---- Per-row comments (Phase 29) ----
// Two positioned comment slots per company row: position 1 = internal note,
// position 2 = external talking point. One comment per (resultId, companyName, position).

export interface Comment {
  id: string;
  resultId: string;
  companyName: string;
  position: 1 | 2;
  text: string;
  createdBy: string; // user id — gates edit/delete client-side (server re-enforces)
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentStats {
  total: number;
  perUser: { userId: string; name: string; count: number }[];
  lastUpdatedAt: string | null;
}

export interface SaveCommentPayload {
  resultId: string;
  companyName: string;
  position: 1 | 2;
  /** Empty/whitespace text deletes the slot (legacy semantic). */
  text: string;
}
