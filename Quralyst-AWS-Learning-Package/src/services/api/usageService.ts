// Usage + provider budgets service (F35.3). Typed seam over /api/usage/* and
// /api/admin/provider-budgets + /api/admin/usage/overview.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  AdminUsageOverview,
  ProviderBudgetsList,
  SetProviderBudgetResult,
  SetUsagePricingPayload,
  UsageBalances,
  UsageBudgetStatus,
  UsageMembersResponse,
  UsagePricing,
  UsageQueryParams,
  UsageRunsPage,
  UsageSummary,
  UsageTimeseries,
} from '@/types';

function usageQs(params?: UsageQueryParams): string {
  const qs = new URLSearchParams();
  if (!params) return '';
  if (params.range) qs.set('range', params.range);
  if (params.days != null) qs.set('days', String(params.days));
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.userId) qs.set('user_id', params.userId);
  if (params.page != null) qs.set('page', String(params.page));
  if (params.perPage != null) qs.set('per_page', String(params.perPage));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

function daysQs(days?: number, extra?: Record<string, string | number | undefined>): string {
  return usageQs({ days, ...(extra as UsageQueryParams) });
}

export interface UsageService {
  getSummary: (params?: UsageQueryParams | number) => Promise<UsageSummary>;
  getRuns: (
    params?: UsageQueryParams | number,
    page?: number,
    perPage?: number,
  ) => Promise<UsageRunsPage>;
  getTimeseries: (params?: UsageQueryParams | number) => Promise<UsageTimeseries>;
  getMembers: () => Promise<UsageMembersResponse>;
  getBalances: () => Promise<UsageBalances>;
  getBudgetStatus: () => Promise<UsageBudgetStatus>;
  getPricing: () => Promise<UsagePricing>;
  setPricing: (payload: SetUsagePricingPayload) => Promise<UsagePricing>;
  getProviderBudgets: () => Promise<ProviderBudgetsList>;
  setProviderBudget: (
    providerKey: string,
    limitUsd: number | null,
  ) => Promise<SetProviderBudgetResult>;
  getAdminOverview: (days?: number) => Promise<AdminUsageOverview>;
}

function normalizeParams(
  params?: UsageQueryParams | number,
  page?: number,
  perPage?: number,
): UsageQueryParams {
  if (typeof params === 'number') {
    return { days: params, page: page ?? 1, perPage: perPage ?? 20 };
  }
  // Prefer explicit positional page/perPage only when provided; otherwise keep
  // values from the params object (RunsList passes `{ page, perPage }` as arg 1).
  return {
    ...(params || {}),
    page: page ?? params?.page,
    perPage: perPage ?? params?.perPage,
  };
}

export const usageService: UsageService = {
  getSummary: (params) =>
    http<UsageSummary>(`${endpoints.usage.summary}${usageQs(normalizeParams(params))}`),

  // Do NOT default page/perPage here — defaults would override values nested in `params`
  // via `page ?? params.page` (1 is never nullish).
  getRuns: (params, page, perPage) =>
    http<UsageRunsPage>(
      `${endpoints.usage.runs}${usageQs(normalizeParams(params, page, perPage))}`,
    ),

  getTimeseries: (params) =>
    http<UsageTimeseries>(`${endpoints.usage.timeseries}${usageQs(normalizeParams(params))}`),

  getMembers: () => http<UsageMembersResponse>(endpoints.usage.members),

  getBalances: () => http<UsageBalances>(endpoints.usage.balances),

  getBudgetStatus: () => http<UsageBudgetStatus>(endpoints.usage.budgetStatus),

  getPricing: () => http<UsagePricing>(endpoints.usage.pricing),

  setPricing: (payload) =>
    http<UsagePricing>(endpoints.usage.pricing, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getProviderBudgets: () => http<ProviderBudgetsList>(endpoints.admin.providerBudgets),

  setProviderBudget: (providerKey, limitUsd) =>
    http<SetProviderBudgetResult>(endpoints.admin.providerBudgets, {
      method: 'POST',
      body: JSON.stringify({ providerKey, limitUsd }),
    }),

  getAdminOverview: (days) =>
    http<AdminUsageOverview>(`${endpoints.admin.usageOverview}${daysQs(days)}`),
};
