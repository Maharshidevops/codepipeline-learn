// Research / location / progress types. See REF-DATA-MODEL.md + PHASE-7.

export interface LocationGroup {
  continent?: string;
  country?: string;
  state?: string;
  city?: string;
}

export interface LocationData {
  continents: string[];
  continentCountries: Record<string, { code: string; name: string; isSuggested: boolean }[]>;
}

export type ProcessType = 'target_list' | 'financial_verticals' | 'strategic_buyer_list';

// ---------- wizard form models (the RHF state for each process page) ----------

/** Shared Size + enrichment + additional-search fields used by Target & Strategic wizards. */
export interface SizeCriteria {
  minRevenue?: string;
  maxRevenue?: string;
  minEmployees?: string;
  maxEmployees?: string;
  sizeCriteriaLogic: 'AND' | 'OR';
}

export interface EnrichmentOptions {
  useNews: boolean;
  /** In-pipeline Apollo contact enrichment used by the strategic composer. */
  useApollo: boolean;
  /** Post-generation Apollo enrichment. `none` disables it; other modes call /api/enrich-list. */
  apolloEnrichMode?: 'none' | 'contacts' | 'company_data' | 'all';
  enableLinkedinEnrichment: boolean;
  ownershipEnrichment: boolean; // → ownership_enrichment (replaces the retired use_gemini_ownership)
  acquisitionEnrichment: boolean; // → acquisition_enrichment
  /** Step 11.5: web-search blank Parent / Owner Type / Active Investors (target + strategic). */
  blankFieldBackfill: boolean; // → blank_field_backfill
  acquisitionTargetReadiness: boolean;
  sellSideMandateReadiness: boolean;
}

/** Modular-LLM model selection. Default = let the backend use all providers with
 *  auto-failover (send no `llm_providers[]`); else the picked subset + fallback flag. */
export interface LlmModelOptions {
  useDefault: boolean;
  providers: { openai: boolean; anthropic: boolean; google: boolean };
  enableFallback: boolean;
}

export interface AdditionalSearchOptions {
  enableApolloSearch: boolean;
  apolloMaxResults?: string;
  enableGmapsSearch: boolean;
  gmapsMaxResults?: string; // ≤ 500
  enableCoresignalSearch: boolean;
  coresignalMaxResults?: string; // ≤ 500
  enableLinkedinSearch: boolean;
  linkedinMaxResults?: string; // ≤ 200
  enableFindallSearch: boolean;
  findallMaxResults?: string; // ≤ 200
}

export interface CustomInsightsState {
  scrapingPath: 'strategic';
  questions: { value: string }[];
  useCompanySizeInsight: boolean;
}

/** Target List wizard (`/quralyst_research`). */
export interface TargetListForm {
  businessQuery: { value: string }[];
  industry: string;
  subIndustry: string;
  primaryActivity: 'Product' | 'Service' | 'Both' | '';
  secondaryActivity: 'Manufacturer' | 'Distributor' | 'Retailer' | 'Not Applicable' | '';
  primaryBusinessOnly: boolean;
  skipWebsiteScraping: boolean;
  excludeTerms: string[];
  size: SizeCriteria;
  geography: LocationGroup[];
  customInsights: CustomInsightsState;
  enrichment: EnrichmentOptions;
  llm: LlmModelOptions;
  additionalSearch: AdditionalSearchOptions;
}

/** Strategic / Buyer List wizard (`/strategic_research`). */
export interface StrategicForm {
  businessQuery: { value: string }[];
  industry: string;
  subIndustry: string;
  primaryActivity: 'Product' | 'Service' | 'Both' | '';
  secondaryActivity: 'Manufacturer' | 'Distributor' | 'Retailer' | 'Not Applicable' | '';
  buyerHorizontal: boolean;
  buyerVertical: boolean;
  buyerAdjacent: boolean;
  useRecommendedBuyer: boolean;
  targetDescription: string; // filled by the Ai Prompt → Enrich flow
  excludeTerms: string[];
  size: SizeCriteria;
  geography: LocationGroup[];
  customInsights: CustomInsightsState;
  enrichment: EnrichmentOptions;
  llm: LlmModelOptions;
  additionalSearch: AdditionalSearchOptions;
}

/** Financial Verticals wizard (`/financial-verticals`) — single HQ location, PE-exposure step. */
export interface FinancialVerticalsForm {
  targetDescription: string;
  businessType: string;
  continent: string;
  country: string;
  state: string;
  industry: string;
  subIndustry: string;
  /** When true, dropdowns are hidden and `industryCustom` / `subIndustryCustom` are submitted. */
  useCustomIndustry: boolean;
  industryCustom: string;
  subIndustryCustom: string;
  revenueMin?: string;
  revenueMax?: string;
  ebitdaMin?: string;
  ebitdaMax?: string;
  equityCheckMin?: string;
  equityCheckMax?: string;
  enterpriseValueMin?: string;
  enterpriseValueMax?: string;
  platformEbitdaFloor?: string;
  platformRevenueFloor?: string;
  currentPortfolio: boolean;
  pastPortfolio: boolean;
  listedInterest: boolean;
  requestPeContact: boolean;
  autoEnrich: boolean;
}

// ---------- SSE progress events (REF-API-CONTRACTS payload) ----------

export interface ProgressUpdateEvent {
  overall_percentage: number;
  current_stage: string;
  current_file_name?: string;
  current_file_index?: number;
  current_sub_stage?: string;
  activity_message?: string;
  status: string;
  result_id?: string;
  stopped_by_user?: boolean;
  error?: string;
  file_states?: Record<string, string>;
  file_names?: string[];
  per_file_progress?: Record<string, number>;
  file_completed?: boolean;
  total_batches?: number;
  current_batch?: number;
}

export type ProgressEventName = 'connected' | 'progress' | 'complete' | 'error';

/** Transport-agnostic progress source — mock (setInterval) now, native EventSource for FastAPI later. */
export interface ProgressSource {
  start(): void;
  on(ev: ProgressEventName, cb: (data: ProgressUpdateEvent) => void): void;
  stop(): void;
}

export interface AiAutofillResult {
  businessQuery?: string;
  industry?: string;
  subIndustry?: string;
  primaryActivity?: string;
}

export interface ProgressState {
  processId: string | null;
  processType: ProcessType;
  overallPercentage: number;
  currentStage: string;
  status: string;
  heading: string;
  summary: string;
  imageIndex: number;
  fileNames: string[];
  perFileProgress: Record<string, number>;
  fileStatsText: string;
  minimized: boolean;
  finished: boolean;
  resultId?: string;
}
