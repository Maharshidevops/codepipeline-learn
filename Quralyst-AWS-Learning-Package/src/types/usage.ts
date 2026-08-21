// Usage dashboard + provider budgets (F35.3) — camelCase DTOs matching
// backend REF-API-CONTRACT.md §Usage & Provider Budgets (F35.2).
// Free-form provider-key maps (apiCalls, providers call counts) stay literal.

export type UsageRange = 'today' | '7d' | '30d' | 'custom';
/** @deprecated Prefer UsageRange; kept for admin overview days selector. */
export type UsageDays = 7 | 30 | 90;

export interface UsageQueryParams {
  range?: UsageRange;
  days?: number;
  from?: string;
  to?: string;
  userId?: string;
  page?: number;
  perPage?: number;
}

export interface UsageProviderRow {
  key: string;
  label: string;
  calls: number;
  costUsd: number;
  /** Vendor credits / request units (Apollo, Brave, Coresignal). Apify uses exact USD. */
  credits?: number;
}

export interface UsageLlmProviderRow {
  key: string;
  label: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface UsageSummary {
  days: number;
  range?: string;
  orgVisible?: boolean;
  totalCostUsd: number;
  totalRuns: number;
  providers: UsageProviderRow[];
  llmProviders?: UsageLlmProviderRow[];
}

export interface UsageRunRow {
  jobId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  estimatedCostUsd: number;
  apiCalls: Record<string, number>;
  llmTokens?: Record<string, { input?: number; output?: number; calls?: number }>;
  totalCalls: number;
  depletionProviders: string[];
  hasDepletion: boolean;
  budgetSuppressed: string[];
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  runKind?: string | null;
  title?: string | null;
}

export interface UsageRunsPage {
  runs: UsageRunRow[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    pages: number;
  };
  days?: number;
}

export interface UsageLlmTokenDay {
  input?: number;
  output?: number;
  calls?: number;
}

export interface UsageTimeseriesPoint {
  date: string;
  calls: number;
  costUsd: number;
  companies: number;
  files: number;
  providers: Record<string, number>;
  /** Per-day LLM token maps keyed by provider (openai_api_key, …). */
  llmTokens?: Record<string, UsageLlmTokenDay>;
}

export interface UsageTimeseries {
  days: number;
  series: UsageTimeseriesPoint[];
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    pages: number;
  };
}

export interface UsageMember {
  userId: string;
  email: string | null;
  name: string | null;
}

export interface UsageMembersResponse {
  members: UsageMember[];
  orgVisible: boolean;
}

export interface UsageBalanceRow {
  provider: string;
  label: string;
  supported: boolean;
  configured: boolean;
  balance: number | null;
  unit: string | null;
  error: string | null;
  lowBalance: boolean;
  lowBalanceThreshold: number | null;
  internalCalls: number;
  internalCostUsd: number;
  internalRunCount: number;
}

export interface UsageBalanceAlert {
  provider: string;
  label: string;
  balance: number | null;
  unit: string | null;
  threshold: number | null;
}

export interface UsageBalances {
  balances: UsageBalanceRow[];
  alerts: UsageBalanceAlert[];
}

export interface UsageBudgetStatusRow {
  key: string;
  label: string;
  monthSpendUsd: number;
  limitUsd: number | null;
  pctUsed: number | null;
  isSuppressed: boolean;
}

export interface UsageBudgetStatus {
  providers: UsageBudgetStatusRow[];
}

export interface ProviderBudgetsList {
  providers: UsageBudgetStatusRow[];
}

export interface SetProviderBudgetResult {
  action: 'cleared' | 'saved';
  providerKey: string;
  limitUsd: number | null;
}

export interface AdminUsageOverviewUser {
  userId: string | null;
  email: string | null;
  totalCostUsd: number;
  totalRuns: number;
  totalCalls: number;
  providers: Record<string, number>;
}

export interface AdminUsageOverview {
  days: number;
  totalCostUsd: number;
  totalRuns: number;
  providers: UsageProviderRow[];
  byUser: AdminUsageOverviewUser[];
}

/** Advance Pricing — org cost rate overrides (estimated usage costs). */
export interface UsagePricingLlmRow {
  key: string;
  label: string;
  defaultInput: number;
  defaultOutput: number;
  input: number;
  output: number;
  isCustom: boolean;
}

export interface UsagePricingProviderRow {
  key: string;
  label: string;
  defaultCostUsd: number;
  costUsd: number;
  isCustom: boolean;
  unit: string;
}

export interface UsagePricing {
  canEdit: boolean;
  llmProviders: UsagePricingLlmRow[];
  providers: UsagePricingProviderRow[];
}

export interface SetUsagePricingPayload {
  llmTokenRates?: Record<string, { input?: number | null; output?: number | null } | null>;
  providerCostUsd?: Record<string, number | null>;
}
