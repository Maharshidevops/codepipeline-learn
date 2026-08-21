import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, DollarSign, Zap } from 'lucide-react';
import { usageService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { UsageDays, UsageQueryParams } from '@/types';
import { usageKeys } from './usageKeys';
import { MetricCards } from './components/MetricCards';
import { CostChart } from './components/CostChart';
import { ProviderBreakdown } from './components/ProviderBreakdown';
import { RunsList } from './components/RunsList';
import { BalancesCard } from './components/BalancesCard';
import { BudgetStatusCard } from './components/BudgetStatusCard';
import { AdminOverviewPanel, ProviderBudgetsPanel } from './components/AdminBudgetPanels';
import { AdvancePricingPanel } from './components/AdvancePricingPanel';
import { fmtNum, fmtUsdPrecise } from './format';
import '@/styles/pages/usage.css';

const STALE = 60_000;
const PERIOD_OPTIONS: { value: UsageDays; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

export default function UsagePage() {
  const { isAdmin } = useAuth();
  const [days, setDays] = useState<UsageDays>(30);
  const [userId, setUserId] = useState('');

  const filterParams: UsageQueryParams = useMemo(() => {
    const base: UsageQueryParams = { days };
    if (userId) base.userId = userId;
    return base;
  }, [days, userId]);

  const timeseriesParams: UsageQueryParams = useMemo(
    () => ({ ...filterParams, perPage: Math.min(Math.max(days, 1), 100) }),
    [filterParams, days],
  );

  const members = useQuery({
    queryKey: usageKeys.members(),
    queryFn: () => usageService.getMembers(),
    staleTime: STALE,
  });

  const orgVisible = members.data?.orgVisible ?? false;

  const summary = useQuery({
    queryKey: usageKeys.summary(filterParams),
    queryFn: () => usageService.getSummary(filterParams),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const timeseries = useQuery({
    queryKey: usageKeys.timeseries(timeseriesParams),
    queryFn: () => usageService.getTimeseries(timeseriesParams),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const balances = useQuery({
    queryKey: usageKeys.balances(),
    queryFn: () => usageService.getBalances(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const s = summary.data;
  const series = timeseries.data?.series ?? [];
  const alerts = balances.data?.alerts ?? [];
  const llmProviders = s?.llmProviders ?? [];
  const providers = s?.providers ?? [];
  const totalCalls = providers.reduce((acc, p) => acc + p.calls, 0);
  const topProvider = providers.find((p) => p.calls > 0);
  const summaryLoading = summary.isLoading && !s;
  const timeseriesLoading = timeseries.isLoading && series.length === 0;
  const summaryFetching = summary.isFetching && !!s;
  const timeseriesFetching = timeseries.isFetching && series.length > 0;
  const pageFetching = summaryFetching || timeseriesFetching;

  const metrics = useMemo(
    () => [
      {
        label: 'Estimated cost',
        value: summaryLoading ? '…' : fmtUsdPrecise(s?.totalCostUsd ?? 0),
        sub: `Last ${days} days`,
        icon: DollarSign,
        testId: 'stat-total-cost',
      },
      {
        label: 'Runs',
        value: summaryLoading ? '…' : fmtNum(s?.totalRuns ?? 0),
        sub: 'Processing jobs',
        icon: Activity,
        testId: 'stat-total-runs',
      },
      {
        label: 'API calls',
        value: summaryLoading ? '…' : fmtNum(totalCalls),
        sub: 'Across all providers',
        icon: Zap,
        testId: 'stat-total-calls',
      },
      {
        label: 'Top provider',
        value: summaryLoading ? '…' : (topProvider?.label ?? '—'),
        sub: topProvider != null ? `${fmtNum(topProvider.calls)} calls` : 'No usage',
        icon: Activity,
        testId: 'stat-top-provider',
      },
    ],
    [summaryLoading, s?.totalCostUsd, s?.totalRuns, days, totalCalls, topProvider],
  );

  useEffect(() => {
    if (!orgVisible && userId) setUserId('');
  }, [orgVisible, userId]);

  return (
    <div
      className={`container usage-page${pageFetching ? ' is-page-fetching' : ''}`}
      data-testid="usage-page"
      aria-busy={pageFetching || undefined}
    >
      {pageFetching ? (
        <div className="usage-page-banner" role="status" aria-live="polite">
          <span className="usage-fetch-spinner" />
          Updating usage for selected filters…
        </div>
      ) : null}

      <div className="usage-header">
        <div>
          <p className="usage-eyebrow">Quralyst Research</p>
          <h1 className="usage-title">API Usage</h1>
          <p className="usage-subtitle">
            Track API call volumes, estimated costs, and provider balances for your runs.
          </p>
        </div>

        <div className="usage-header-actions" data-testid="usage-filters">
          {orgVisible ? (
            <div className="usage-user-filter">
              <label className="visually-hidden" htmlFor="usage-user">
                User
              </label>
              <select
                id="usage-user"
                className="form-select form-select-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                data-testid="usage-user"
              >
                <option value="">All members</option>
                {(members.data?.members ?? []).map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name || m.email || m.userId}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div
            className="usage-period-pills"
            role="group"
            aria-label="Time range"
            data-testid="usage-days"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`usage-period-pill${days === opt.value ? ' is-active' : ''}`}
                onClick={() => setDays(opt.value)}
                aria-pressed={days === opt.value}
                data-testid={`usage-days-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={summaryFetching ? 'usage-metrics-wrap is-fetching' : 'usage-metrics-wrap'}>
        {summaryFetching ? (
          <div className="usage-fetch-overlay usage-fetch-overlay--soft" aria-hidden>
            <span className="usage-fetch-spinner" />
          </div>
        ) : null}
        <MetricCards metrics={metrics} loading={summaryLoading} />
      </div>

      <div className="usage-grid-main">
        <CostChart
          series={series}
          llmProviders={llmProviders}
          loading={timeseriesLoading}
          fetching={timeseriesFetching}
        />
        <ProviderBreakdown
          providers={providers}
          loading={summaryLoading}
          fetching={summaryFetching}
        />
      </div>

      {alerts.length > 0 ? (
        <div className="usage-alert" role="status">
          <AlertTriangle
            style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0, marginTop: 2 }}
            aria-hidden
          />
          <div>
            <p className="usage-alert-title">Low provider balance</p>
            <p className="usage-alert-body">
              {alerts
                .map(
                  (a) =>
                    `${a.label} has ${a.balance != null ? fmtNum(a.balance) : '?'} ${a.unit ?? ''} remaining (threshold: ${a.threshold != null ? fmtNum(a.threshold) : '?'}${a.unit ? ` ${a.unit}` : ''})`,
                )
                .join(' · ')}{' '}
              — top up to prevent interrupted runs.
            </p>
          </div>
        </div>
      ) : null}

      <RunsList queryParams={filterParams} orgVisible={orgVisible} />

      <BalancesCard />

      <BudgetStatusCard />

      {isAdmin ? (
        <>
          <ProviderBudgetsPanel />
          <AdminOverviewPanel days={days} />
        </>
      ) : null}

      <AdvancePricingPanel />
    </div>
  );
}
