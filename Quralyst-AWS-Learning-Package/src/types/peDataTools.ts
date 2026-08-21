/** PE Data Tools types (F42.3) — camelCase wire shapes. */

export type ToolResultStatus = 'found' | 'not_found' | 'error' | 'skipped_budget';
export type ToolConfidence = 'high' | 'medium' | 'low' | 'not_found';
export type PeLookupType = 'investment' | 'exit' | 'status' | 'profile' | 'combined';
export type DataToolJobType = 'url_lookup' | 'pe_lookup' | 'location' | 'gics_classify';
export type DataToolJobStatus = 'processing' | 'completed' | 'failed';

export interface UrlLookupResult {
  id?: string;
  companyName: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  confidence?: ToolConfidence | null;
  status: ToolResultStatus;
  errorMessage?: string | null;
  jobId?: string | null;
  createdAt?: string | null;
}

export interface PeLookupResult {
  id?: string;
  portfolioCompany: string;
  peFirm: string;
  lookupType: PeLookupType | string;
  investmentYear?: number | null;
  estimatedInvestmentYear?: number | null;
  investmentYearEvidence?: string | null;
  holdingStatusScore?: number | null;
  exitYear?: number | null;
  exitYearEvidence?: string | null;
  currentStatus?: string | null;
  confidenceScore?: number | null;
  dealType?: string | null;
  website?: string | null;
  description?: string | null;
  locationText?: string | null;
  productsServices?: string | null;
  keywords?: string[] | null;
  source?: string | null;
  confidence?: ToolConfidence | null;
  status: ToolResultStatus;
  errorMessage?: string | null;
  jobId?: string | null;
  createdAt?: string | null;
}

export interface LocationLookupResult {
  id?: string;
  companyName: string;
  website?: string | null;
  city?: string | null;
  stateRegion?: string | null;
  country?: string | null;
  productsServices?: string | null;
  keywords?: string[] | null;
  source?: string | null;
  confidence?: ToolConfidence | null;
  status: ToolResultStatus;
  errorMessage?: string | null;
  jobId?: string | null;
  createdAt?: string | null;
}

export interface GicsClassifyResult {
  id?: string;
  companyName: string;
  peFirm?: string | null;
  sectorCode?: string | null;
  sectorName?: string | null;
  industryGroupCode?: string | null;
  industryGroupName?: string | null;
  industryCode?: string | null;
  industryName?: string | null;
  subIndustryCode?: string | null;
  subIndustryName?: string | null;
  confidence?: ToolConfidence | null;
  reasoning?: string | null;
  status: ToolResultStatus;
  errorMessage?: string | null;
  jobId?: string | null;
  createdAt?: string | null;
}

export interface DataToolJob {
  id: string;
  jobType: DataToolJobType;
  status: DataToolJobStatus;
  total: number;
  processed: number;
  found: number;
  notFoundCount: number;
  errorCount: number;
  inputData?: unknown[];
  sourceLabel?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
}

export interface DataToolJobsList {
  jobs: DataToolJob[];
  total: number;
  limit: number;
  offset: number;
}

export interface DataToolJobResults {
  results: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
}

export interface HoldingsClassifyResponse {
  message?: string;
  count?: number;
  id?: string;
  jobType?: DataToolJobType;
  status?: DataToolJobStatus;
  total?: number;
}

export interface ResumeJobResponse {
  jobId: string;
  resumed: boolean;
  message?: string;
  alreadyProcessed?: number;
  remaining?: number;
  total?: number;
}
