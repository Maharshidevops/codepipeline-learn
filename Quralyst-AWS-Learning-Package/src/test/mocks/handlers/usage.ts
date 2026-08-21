// MSW handlers for usage dashboard + provider budgets (F35.3).
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { err, ok } from '@/test/mocks/envelope';
import type { SetUsagePricingPayload, UsagePricing } from '@/types';
import {
  mockAdminUsageOverview,
  mockProviderBudgets,
  mockUsageBalances,
  mockUsageBudgetStatus,
  mockUsageMembers,
  mockUsagePricing,
  mockUsageRuns,
  mockUsageSummary,
  mockUsageTimeseries,
} from '@/test/mocks/fixtures/usage';

function parseDays(request: Request): number {
  const url = new URL(request.url);
  const range = url.searchParams.get('range');
  if (range === 'today') return 1;
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  const raw = url.searchParams.get('days');
  if (raw == null || raw === '') return 30;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(Math.trunc(n), 365));
}

// In-memory budget caps so POST save/clear round-trips in page tests.
const budgetLimits = new Map<string, number | null>(
  mockProviderBudgets.providers.map((p) => [p.key, p.limitUsd]),
);

// In-memory Advance Pricing overrides for GET/POST round-trips.
let pricingState: UsagePricing = structuredClone(mockUsagePricing);

function applyPricingPayload(body: SetUsagePricingPayload): UsagePricing {
  const llmTokenRates = body.llmTokenRates ?? {};
  const providerCostUsd = body.providerCostUsd ?? {};

  const llmProviders = pricingState.llmProviders.map((row) => {
    if (!(row.key in llmTokenRates)) return row;
    const slot = llmTokenRates[row.key];
    if (slot == null) {
      return {
        ...row,
        input: row.defaultInput,
        output: row.defaultOutput,
        isCustom: false,
      };
    }
    const input =
      slot.input === null || slot.input === undefined ? row.defaultInput : Number(slot.input);
    const output =
      slot.output === null || slot.output === undefined ? row.defaultOutput : Number(slot.output);
    const isCustom =
      (slot.input !== null && slot.input !== undefined) ||
      (slot.output !== null && slot.output !== undefined);
    return { ...row, input, output, isCustom };
  });

  const providers = pricingState.providers.map((row) => {
    if (!(row.key in providerCostUsd)) return row;
    const raw = providerCostUsd[row.key];
    if (raw === null || raw === undefined) {
      return { ...row, costUsd: row.defaultCostUsd, isCustom: false };
    }
    return { ...row, costUsd: Number(raw), isCustom: true };
  });

  pricingState = { ...pricingState, llmProviders, providers };
  return pricingState;
}

export function resetUsagePricingMock() {
  pricingState = structuredClone(mockUsagePricing);
}

export const usageHandlers = [
  http.get(endpoints.usage.summary, ({ request }) => {
    const days = parseDays(request);
    return ok({ ...mockUsageSummary, days });
  }),

  http.get(endpoints.usage.runs, ({ request }) => {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
    const perPage = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('per_page') || 20) || 20),
    );
    const all = mockUsageRuns.runs;
    const total = all.length;
    const pages = Math.max(1, Math.ceil(total / perPage) || 1);
    const start = (page - 1) * perPage;
    const runs = all.slice(start, start + perPage);
    return ok({
      runs,
      pagination: { page, perPage, total, pages },
      days: 30,
    });
  }),

  http.get(endpoints.usage.timeseries, ({ request }) => {
    const days = parseDays(request);
    return ok({ ...mockUsageTimeseries, days });
  }),

  http.get(endpoints.usage.members, () => ok(mockUsageMembers)),

  http.get(endpoints.usage.balances, () => ok(mockUsageBalances)),

  http.get(endpoints.usage.budgetStatus, () => ok(mockUsageBudgetStatus)),

  http.get(endpoints.usage.pricing, () => ok(pricingState)),

  http.post(endpoints.usage.pricing, async ({ request }) => {
    if (!pricingState.canEdit) return err(403, 'Org admin required');
    const body = (await request.json()) as SetUsagePricingPayload;
    return ok(applyPricingPayload(body));
  }),

  http.get(endpoints.admin.providerBudgets, () => {
    const providers = mockProviderBudgets.providers.map((p) => {
      const limitUsd = budgetLimits.has(p.key) ? budgetLimits.get(p.key)! : p.limitUsd;
      const pctUsed =
        limitUsd != null && limitUsd > 0
          ? Math.round((p.monthSpendUsd / limitUsd) * 1000) / 10
          : null;
      return {
        ...p,
        limitUsd,
        pctUsed,
        isSuppressed: Boolean(limitUsd && p.monthSpendUsd >= limitUsd),
      };
    });
    return ok({ providers });
  }),

  http.post(endpoints.admin.providerBudgets, async ({ request }) => {
    const body = (await request.json()) as {
      providerKey?: string;
      provider_key?: string;
      limitUsd?: number | null;
      limit_usd?: number | null;
    };
    const providerKey = (body.providerKey || body.provider_key || '').trim();
    if (!providerKey) return err(400, 'provider_key is required');

    const raw = body.limitUsd !== undefined ? body.limitUsd : body.limit_usd;
    let limitUsd = 0;
    if (raw !== null && raw !== undefined) {
      const n = Number(raw);
      if (!Number.isFinite(n)) return err(400, 'limit_usd must be a number');
      if (n < 0) return err(400, 'limit_usd must be >= 0');
      limitUsd = n;
    }

    const action = limitUsd === 0 ? 'cleared' : 'saved';
    const limitOut = limitUsd > 0 ? limitUsd : null;
    budgetLimits.set(providerKey, limitOut);
    return ok({ action, providerKey, limitUsd: limitOut });
  }),

  http.get(endpoints.admin.usageOverview, ({ request }) => {
    const days = parseDays(request);
    return ok({ ...mockAdminUsageOverview, days });
  }),
];
