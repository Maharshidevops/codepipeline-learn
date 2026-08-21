// Adapter: a stored result's `filters_applied` (the snake_case dict returned by
// GET /api/research/reuse-filters) → the RHF wizard form models. This is the data-only
// port of the legacy `prefillFromFilters()` (Backup/templates/quralyst_research/
// quralyst_research.html): same field mapping, minus the DOM/timing hacks (RHF + the
// page's loadDraft restore the values, so dependent dropdowns hydrate from the values).
//
// Output is a Partial — the wizard pages deep-merge it over their DEFAULTS in loadDraft(),
// so anything we omit falls back to the form default.
import type {
  AdditionalSearchOptions,
  CustomInsightsState,
  EnrichmentOptions,
  FinancialVerticalsForm,
  LlmModelOptions,
  LocationGroup,
  SizeCriteria,
  StrategicForm,
  TargetListForm,
} from '@/types';
import { industryList, subIndustryMap } from '@/data/subIndustryMap';

export type RawFilters = Record<string, unknown>;

// The custom-insights list smuggles the "company size" toggle in as a sentinel question
// (mirrors the legacy COMPANY_SIZE_QUESTION_TOKEN); strip it back out into the boolean.
const COMPANY_SIZE_TOKEN = 'Alternate company size insights';

const PRIMARY_ACTIVITIES = ['Product', 'Service', 'Both'] as const;
const SECONDARY_ACTIVITIES = ['Manufacturer', 'Distributor', 'Retailer', 'Not Applicable'] as const;

// ── coercion helpers ──────────────────────────────────────────────────────────
const asStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const asBool = (v: unknown): boolean => v === true || v === 'true' || v === 1 || v === '1';
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);

// Reject strings that look like injected MongoDB query operators (legacy `isCleanQuery`).
const isCleanQuery = (q: unknown): q is string => {
  if (typeof q !== 'string') return false;
  const s = q.trim();
  return s.length > 0 && !s.startsWith('{') && !s.includes('$') && !s.includes('ObjectId(');
};

function mapSize(f: RawFilters): SizeCriteria {
  const logic = asStr(f.size_criteria_logic).toUpperCase();
  return {
    minEmployees: asStr(f.min_employees),
    maxEmployees: asStr(f.max_employees),
    minRevenue: asStr(f.min_revenue),
    maxRevenue: asStr(f.max_revenue),
    sizeCriteriaLogic: logic === 'OR' ? 'OR' : 'AND',
  };
}

// Prefer the row-level location_groups (preserves the exact hierarchy as originally
// selected); fall back to the flat parallel arrays the legacy form also accepted.
function mapGeography(f: RawFilters): LocationGroup[] {
  const groups = asArr(f.location_groups)
    .map((g) => (g && typeof g === 'object' ? (g as Record<string, unknown>) : {}))
    .map((g) => ({
      continent: asStr(g.continent),
      country: asStr(g.country),
      state: asStr(g.state),
      city: asStr(g.city),
    }))
    .filter((g) => g.continent || g.country || g.state || g.city);
  if (groups.length > 0) return groups;

  const continents = asArr(f.continent ?? f.continent_criteria);
  const countries = asArr(f.country ?? f.country_criteria);
  const states = asArr(f.state ?? f.state_criteria);
  const cities = asArr(f.city ?? f.city_criteria);
  const len = Math.max(continents.length, countries.length, states.length, cities.length);
  if (len === 0) return [];
  return Array.from({ length: len }, (_, i) => ({
    continent: asStr(continents[i]),
    country: asStr(countries[i]),
    state: asStr(states[i]),
    city: asStr(cities[i]),
  }));
}

function mapEnrichment(f: RawFilters): EnrichmentOptions {
  return {
    useNews: asBool(f.use_news),
    useApollo: asBool(f.use_apollo),
    // Older results only persisted the in-run boolean, so restore a sensible
    // post-generation mode while new drafts keep the explicit composer choice.
    apolloEnrichMode: asBool(f.use_apollo) ? 'contacts' : 'none',
    enableLinkedinEnrichment: asBool(f.enable_linkedin_enrichment),
    ownershipEnrichment: asBool(f.ownership_enrichment),
    acquisitionEnrichment: asBool(f.acquisition_enrichment),
    blankFieldBackfill: asBool(f.blank_field_backfill),
    acquisitionTargetReadiness: asBool(f.acquisition_target_readiness),
    sellSideMandateReadiness: asBool(f.sell_side_mandate_readiness),
  };
}

function mapLlm(f: RawFilters): LlmModelOptions {
  const providers = asArr(f.llm_providers).map(asStr);
  // No saved providers → keep the "default" (all providers + auto-failover) behaviour.
  if (providers.length === 0) {
    return {
      useDefault: true,
      providers: { openai: true, anthropic: true, google: true },
      enableFallback: true,
    };
  }
  return {
    useDefault: false,
    providers: {
      openai: providers.includes('openai'),
      anthropic: providers.includes('anthropic'),
      google: providers.includes('google'),
    },
    enableFallback: asBool(f.llm_fallback_enabled),
  };
}

function mapAdditionalSearch(f: RawFilters): AdditionalSearchOptions {
  return {
    enableApolloSearch: asBool(f.enable_apollo_search),
    apolloMaxResults: asStr(f.apollo_max_results),
    enableGmapsSearch: asBool(f.enable_gmaps_search),
    gmapsMaxResults: asStr(f.gmaps_max_results),
    enableCoresignalSearch: asBool(f.enable_coresignal_search),
    coresignalMaxResults: asStr(f.coresignal_max_results),
    enableLinkedinSearch: asBool(f.enable_linkedin_search),
    linkedinMaxResults: asStr(f.linkedin_max_results),
    enableFindallSearch: asBool(f.enable_findall_search),
    findallMaxResults: asStr(f.findall_max_results),
  };
}

function mapCustomInsights(f: RawFilters): CustomInsightsState {
  const ci = (
    f.custom_insights && typeof f.custom_insights === 'object'
      ? (f.custom_insights as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;
  const all = asArr(ci.questions).map(asStr).filter(Boolean);
  return {
    scrapingPath: 'strategic',
    useCompanySizeInsight: all.includes(COMPANY_SIZE_TOKEN),
    questions: all.filter((q) => q !== COMPANY_SIZE_TOKEN).map((value) => ({ value })),
  };
}

// Shared fields common to both the Target and Strategic wizards.
function mapCommon(f: RawFilters) {
  const queries = asArr(f.business_queries).filter(isCleanQuery);
  const pairs = asArr(f.industry_pairs);
  // Legacy restores only the FIRST industry pair — the wizard has a single industry slot.
  const firstPair = (
    pairs[0] && typeof pairs[0] === 'object' ? (pairs[0] as Record<string, unknown>) : {}
  ) as Record<string, unknown>;
  const primary = asStr(f.primary_activity);
  const secondary = asStr(f.secondary_activity);

  return {
    businessQuery: queries.length ? queries.map((value) => ({ value })) : [{ value: '' }],
    industry: asStr(firstPair.industry),
    subIndustry: asStr(firstPair.sub_industry),
    primaryActivity: (PRIMARY_ACTIVITIES as readonly string[]).includes(primary)
      ? (primary as TargetListForm['primaryActivity'])
      : '',
    secondaryActivity: (SECONDARY_ACTIVITIES as readonly string[]).includes(secondary)
      ? (secondary as TargetListForm['secondaryActivity'])
      : '',
    skipWebsiteScraping: asBool(f.skip_website_scraping),
    excludeTerms: asArr(f.exclude_terms).map(asStr).filter(Boolean),
    size: mapSize(f),
    geography: mapGeography(f),
    customInsights: mapCustomInsights(f),
    enrichment: mapEnrichment(f),
    llm: mapLlm(f),
    additionalSearch: mapAdditionalSearch(f),
  };
}

/** Map a stored result's filters onto the Target List wizard draft shape. */
export function filtersToTargetForm(f: RawFilters): Partial<TargetListForm> {
  return {
    ...mapCommon(f),
    primaryBusinessOnly: asBool(f.primary_business_only),
  };
}

/** Map a stored result's filters onto the Strategic / Buyer List wizard draft shape. */
export function filtersToStrategicForm(f: RawFilters): Partial<StrategicForm> {
  return {
    ...mapCommon(f),
    targetDescription: asStr(f.target_description),
    buyerHorizontal: asBool(f.buyer_horizontal),
    buyerVertical: asBool(f.buyer_vertical),
    buyerAdjacent: asBool(f.buyer_adjacent),
    useRecommendedBuyer: asBool(f.use_recommended_buyer),
  };
}

const FV_BUSINESS_TYPES = ['Manufacturer', 'Distributor', 'Service Provider'] as const;

/** Detect whether stored industry/sub-industry values fall outside the standard dropdown catalog. */
function fvValueUsesCustomIndustry(industry: string, subIndustry: string): boolean {
  if (industry && !industryList.includes(industry as (typeof industryList)[number])) {
    return true;
  }
  if (!subIndustry) return false;
  if (!industry) return true;
  return !(subIndustryMap[industry] ?? []).includes(subIndustry);
}

/** Map a stored Financial Verticals result's filters onto the FV wizard draft shape. */
export function filtersToFvForm(f: RawFilters): Partial<FinancialVerticalsForm> {
  const location = (f.location && typeof f.location === 'object' ? f.location : {}) as Record<
    string,
    unknown
  >;
  const size = (f.size && typeof f.size === 'object' ? f.size : {}) as Record<string, unknown>;
  const exposure = (f.exposure && typeof f.exposure === 'object' ? f.exposure : {}) as Record<
    string,
    unknown
  >;
  const businessType = asStr(f.business_type);
  const industry = asStr(f.industry);
  const subIndustry = asStr(f.sub_industry);
  const useCustomIndustry = fvValueUsesCustomIndustry(industry, subIndustry);

  return {
    targetDescription: asStr(f.target_description),
    businessType: (FV_BUSINESS_TYPES as readonly string[]).includes(businessType)
      ? (businessType as FinancialVerticalsForm['businessType'])
      : '',
    continent: asStr(location.continent),
    country: asStr(location.country),
    state: asStr(location.state),
    useCustomIndustry,
    industryCustom: useCustomIndustry ? industry : '',
    subIndustryCustom: useCustomIndustry ? subIndustry : '',
    industry: useCustomIndustry ? '' : industry,
    subIndustry: useCustomIndustry ? '' : subIndustry,
    revenueMin: asStr(size.revenue_min),
    revenueMax: asStr(size.revenue_max),
    ebitdaMin: asStr(size.ebitda_min),
    ebitdaMax: asStr(size.ebitda_max),
    equityCheckMin: asStr(size.equity_check_min),
    equityCheckMax: asStr(size.equity_check_max),
    enterpriseValueMin: asStr(size.enterprise_value_min),
    enterpriseValueMax: asStr(size.enterprise_value_max),
    currentPortfolio: asBool(exposure.current_portfolio),
    pastPortfolio: asBool(exposure.past_portfolio),
    listedInterest: asBool(exposure.listed_interest),
    requestPeContact: asBool(exposure.request_contact),
  };
}
