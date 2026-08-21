// Admin provider budgets (F35.3) — staff-only caps + platform usage overview.
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, BaseTable } from '@/components/ui';
import { usageService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/lib/authErrors';
import type { UsageDays } from '@/types';
import { usageKeys } from '@/pages/usage/usageKeys';

const DAY_OPTIONS: { value: UsageDays; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

function fmtUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${n.toFixed(4)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

export default function AdminProviderBudgetsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [days, setDays] = useState<UsageDays>(30);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const budgets = useQuery({
    queryKey: usageKeys.providerBudgets(),
    queryFn: () => usageService.getProviderBudgets(),
  });

  const overview = useQuery({
    queryKey: usageKeys.adminOverview(days),
    queryFn: () => usageService.getAdminOverview(days),
  });

  const providers = useMemo(() => budgets.data?.providers ?? [], [budgets.data?.providers]);

  const draftFor = useMemo(() => {
    const out: Record<string, string> = {};
    for (const p of providers) {
      out[p.key] = drafts[p.key] ?? (p.limitUsd == null ? '' : String(p.limitUsd));
    }
    return out;
  }, [providers, drafts]);

  const saveMut = useMutation({
    mutationFn: ({ key, limit }: { key: string; limit: number | null }) =>
      usageService.setProviderBudget(key, limit),
    onSuccess: async (res) => {
      toast.success(
        res.action === 'cleared'
          ? `Cleared budget for ${res.providerKey}`
          : `Saved budget for ${res.providerKey}: ${fmtUsd(res.limitUsd)}`,
      );
      setDrafts((d) => {
        const next = { ...d };
        delete next[res.providerKey];
        return next;
      });
      await qc.invalidateQueries({ queryKey: usageKeys.providerBudgets() });
      await qc.invalidateQueries({ queryKey: usageKeys.budgetStatus() });
    },
    onError: (err: unknown) => {
      const msg = isApiError(err) ? err.message : 'Unable to save budget.';
      toast.error(msg);
    },
    onSettled: () => setSavingKey(null),
  });

  const onSave = (key: string) => {
    const raw = (draftFor[key] ?? '').trim();
    const clearing = raw === '' || raw === '0';
    if (clearing) {
      const ok = window.confirm('Clear the budget cap for this provider?');
      if (!ok) return;
    }
    let limit: number | null = null;
    if (!clearing) {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        toast.error('limit_usd must be a number');
        return;
      }
      if (n < 0) {
        toast.error('limit_usd must be >= 0');
        return;
      }
      limit = n;
    } else {
      limit = null; // service posts 0 / null → backend clears
    }
    setSavingKey(key);
    saveMut.mutate({ key, limit: clearing ? 0 : limit });
  };

  return (
    <div className="container" data-testid="admin-provider-budgets">
      <div className="mb-4">
        <h1 className="mb-1">Provider budgets</h1>
        <p className="text-muted mb-0">
          Set monthly estimated-cost caps per provider. Optional providers are suppressed when over
          cap; costs remain estimates.
        </p>
      </div>

      <section className="mb-5" data-testid="admin-budget-form">
        <h2 className="h5 mb-2">Caps</h2>
        {budgets.isError ? (
          <p className="text-danger">Unable to load provider budgets.</p>
        ) : providers.length === 0 ? (
          <p className="text-muted">No providers found.</p>
        ) : (
          <BaseTable
            columns={[
              { key: 'label', header: 'Provider', render: (p) => p.label },
              {
                key: 'spend',
                header: 'Month spend (est.)',
                render: (p) => fmtUsd(p.monthSpendUsd),
              },
              { key: 'used', header: 'Used', render: (p) => fmtPct(p.pctUsed) },
              {
                key: 'limit',
                header: 'Limit (USD)',
                width: 140,
                render: (p) => (
                  <>
                    <label className="visually-hidden" htmlFor={`limit-${p.key}`}>
                      Limit for {p.label}
                    </label>
                    <input
                      id={`limit-${p.key}`}
                      className="form-control form-control-sm"
                      inputMode="decimal"
                      placeholder="No cap"
                      value={draftFor[p.key] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
                      data-testid={`limit-input-${p.key}`}
                    />
                  </>
                ),
              },
              {
                key: 'state',
                header: 'State',
                render: (p) =>
                  p.isSuppressed ? (
                    <Badge tone="warning">Suppressed</Badge>
                  ) : p.limitUsd == null ? (
                    <span className="text-muted">No cap</span>
                  ) : (
                    <span className="text-muted">OK</span>
                  ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (p) => (
                  <Button
                    type="button"
                    variant="standard"
                    className="btn-sm"
                    disabled={savingKey === p.key}
                    loading={savingKey === p.key}
                    onClick={() => onSave(p.key)}
                    data-testid={`save-budget-${p.key}`}
                  >
                    Save
                  </Button>
                ),
              },
            ]}
            rows={providers}
            getRowKey={(p) => p.key}
            rowTestId={(p) => `admin-budget-${p.key}`}
          />
        )}
      </section>

      <section data-testid="admin-usage-overview">
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-2">
          <h2 className="h5 mb-0">Platform usage overview</h2>
          <div>
            <label className="form-label d-block mb-1" htmlFor="admin-usage-days">
              Window
            </label>
            <select
              id="admin-usage-days"
              className="form-select form-select-sm"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as UsageDays)}
              data-testid="admin-usage-days"
            >
              {DAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {overview.isError ? (
          <p className="text-danger">Unable to load usage overview.</p>
        ) : (
          <>
            <p className="text-muted">
              Estimated total {fmtUsd(overview.data?.totalCostUsd)} across{' '}
              {overview.data?.totalRuns ?? 0} runs.
            </p>
            <BaseTable
              columns={[
                { key: 'user', header: 'User', render: (u) => u.email ?? u.userId ?? '—' },
                { key: 'runs', header: 'Runs', render: (u) => u.totalRuns },
                { key: 'calls', header: 'Calls', render: (u) => u.totalCalls },
                { key: 'cost', header: 'Estimated cost', render: (u) => fmtUsd(u.totalCostUsd) },
              ]}
              rows={overview.data?.byUser ?? []}
              getRowKey={(u, i) => u.userId ?? u.email ?? i}
              emptyMessage="No users with usage in this window."
            />
          </>
        )}
      </section>
    </div>
  );
}
