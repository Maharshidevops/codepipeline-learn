// Zod schema + defaults + draft helpers for the Strategic / Buyer List wizard.
// The RHF state shape is the shared StrategicForm (src/types/research.ts). Field-level validation is
// intentionally light: the legacy form requires almost nothing up-front (a business description is
// the only soft requirement), and the cross-field rules (size-match logic, GMaps state) are enforced
// at submit time in the page — matching the legacy template behaviour.
import { z } from 'zod';
import type { StrategicForm } from '@/types';

const locationGroupSchema = z.object({
  continent: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
});

export const strategicSchema = z.object({
  businessQuery: z
    .array(
      z.object({ value: z.string().max(5000, 'Description must be 5000 characters or fewer') }),
    )
    .min(1),
  industry: z.string(),
  subIndustry: z.string(),
  primaryActivity: z.enum(['Product', 'Service', 'Both', '']),
  secondaryActivity: z.enum(['Manufacturer', 'Distributor', 'Retailer', 'Not Applicable', '']),
  buyerHorizontal: z.boolean(),
  buyerVertical: z.boolean(),
  buyerAdjacent: z.boolean(),
  useRecommendedBuyer: z.boolean(),
  targetDescription: z.string(),
  size: z.object({
    minRevenue: z.string().optional(),
    maxRevenue: z.string().optional(),
    minEmployees: z.string().optional(),
    maxEmployees: z.string().optional(),
    sizeCriteriaLogic: z.enum(['AND', 'OR']),
  }),
  geography: z.array(locationGroupSchema),
  customInsights: z.object({
    scrapingPath: z.literal('strategic'),
    questions: z.array(z.object({ value: z.string() })),
    useCompanySizeInsight: z.boolean(),
  }),
  enrichment: z.object({
    useNews: z.boolean(),
    useApollo: z.boolean(),
    enableLinkedinEnrichment: z.boolean(),
    ownershipEnrichment: z.boolean(),
    acquisitionEnrichment: z.boolean(),
    blankFieldBackfill: z.boolean(),
    acquisitionTargetReadiness: z.boolean(),
    sellSideMandateReadiness: z.boolean(),
  }),
  llm: z.object({
    useDefault: z.boolean(),
    providers: z.object({
      openai: z.boolean(),
      anthropic: z.boolean(),
      google: z.boolean(),
    }),
    enableFallback: z.boolean(),
  }),
  additionalSearch: z.object({
    enableApolloSearch: z.boolean(),
    apolloMaxResults: z.string().optional(),
    enableGmapsSearch: z.boolean(),
    gmapsMaxResults: z.string().optional(),
    enableCoresignalSearch: z.boolean(),
    coresignalMaxResults: z.string().optional(),
    enableLinkedinSearch: z.boolean(),
    linkedinMaxResults: z.string().optional(),
    enableFindallSearch: z.boolean(),
    findallMaxResults: z.string().optional(),
  }),
  excludeTerms: z.array(z.string()),
});

export const DRAFT_KEY = 'quralyst:draft:strategic';

export const strategicDefaults: StrategicForm = {
  businessQuery: [{ value: '' }],
  industry: '',
  subIndustry: '',
  primaryActivity: '',
  secondaryActivity: '',
  buyerHorizontal: false,
  buyerVertical: false,
  buyerAdjacent: false,
  useRecommendedBuyer: false,
  targetDescription: '',
  excludeTerms: [],
  size: {
    minRevenue: '',
    maxRevenue: '',
    minEmployees: '',
    maxEmployees: '',
    sizeCriteriaLogic: 'AND',
  },
  geography: [{ continent: '', country: '', state: '', city: '' }],
  customInsights: {
    scrapingPath: 'strategic',
    questions: [{ value: '' }],
    useCompanySizeInsight: false,
  },
  enrichment: {
    useNews: false,
    useApollo: false,
    enableLinkedinEnrichment: false,
    ownershipEnrichment: false,
    acquisitionEnrichment: false,
    blankFieldBackfill: false,
    acquisitionTargetReadiness: false,
    sellSideMandateReadiness: false,
  },
  llm: {
    useDefault: true,
    providers: { openai: true, anthropic: true, google: true },
    enableFallback: true,
  },
  additionalSearch: {
    enableApolloSearch: true,
    apolloMaxResults: '50',
    enableGmapsSearch: false,
    gmapsMaxResults: '',
    enableCoresignalSearch: false,
    coresignalMaxResults: '',
    enableLinkedinSearch: false,
    linkedinMaxResults: '',
    enableFindallSearch: false,
    findallMaxResults: '',
  },
};

/** Merge a (possibly partial / stale) persisted draft over the defaults so missing keys never crash RHF. */
export function loadDraft(): StrategicForm {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return strategicDefaults;
    const parsed = JSON.parse(raw) as Partial<StrategicForm>;
    return {
      ...strategicDefaults,
      ...parsed,
      excludeTerms: parsed.excludeTerms ?? strategicDefaults.excludeTerms,
      size: { ...strategicDefaults.size, ...parsed.size },
      customInsights: { ...strategicDefaults.customInsights, ...parsed.customInsights },
      enrichment: { ...strategicDefaults.enrichment, ...parsed.enrichment },
      llm: {
        ...strategicDefaults.llm,
        ...parsed.llm,
        providers: { ...strategicDefaults.llm.providers, ...parsed.llm?.providers },
      },
      additionalSearch: { ...strategicDefaults.additionalSearch, ...parsed.additionalSearch },
      businessQuery:
        parsed.businessQuery && parsed.businessQuery.length
          ? parsed.businessQuery
          : strategicDefaults.businessQuery,
      geography:
        parsed.geography && parsed.geography.length
          ? parsed.geography
          : strategicDefaults.geography,
    };
  } catch {
    return strategicDefaults;
  }
}

export function saveDraft(values: StrategicForm): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {
    /* storage full / unavailable — ignore, draft is best-effort */
  }
}

/** Drop the persisted draft after a successful submit so the next visit starts clean. */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable — ignore */
  }
}
