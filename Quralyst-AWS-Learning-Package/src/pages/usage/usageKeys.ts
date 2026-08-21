import type { UsageQueryParams, UsageRange } from '@/types';

export const usageKeys = {
  all: ['usage'] as const,
  summary: (q: UsageQueryParams) => [...usageKeys.all, 'summary', q] as const,
  runs: (q: UsageQueryParams) => [...usageKeys.all, 'runs', q] as const,
  timeseries: (q: UsageQueryParams) => [...usageKeys.all, 'timeseries', q] as const,
  members: () => [...usageKeys.all, 'members'] as const,
  balances: () => [...usageKeys.all, 'balances'] as const,
  budgetStatus: () => [...usageKeys.all, 'budget-status'] as const,
  providerBudgets: () => [...usageKeys.all, 'provider-budgets'] as const,
  adminOverview: (days: number) => [...usageKeys.all, 'admin-overview', days] as const,
  pricing: () => [...usageKeys.all, 'pricing'] as const,
};

export function rangeToDays(range: UsageRange): number {
  if (range === 'today') return 1;
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  return 30;
}
