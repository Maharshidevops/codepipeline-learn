import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Settings2, Users } from 'lucide-react';
import { usageService } from '@/services/api';
import { isApiError } from '@/lib/authErrors';
import type { UsageBudgetStatusRow } from '@/types';
import { usageKeys } from '../usageKeys';
import { fmtNum, fmtPct, fmtUsd } from '../format';

function BudgetBar({ pct, suppressed }: { pct: number; suppressed: boolean }) {
  const clamped = Math.min(pct, 100);
  const tone = suppressed || pct >= 100 ? 'is-danger' : pct >= 80 ? 'is-warn' : '';
  return (
    <div className="usage-budget-bar" aria-hidden>
      <div className={`usage-budget-bar-fill ${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function ProviderBudgetsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: usageKeys.providerBudgets(),
    queryFn: () => usageService.getProviderBudgets(),
    enabled: open,
    staleTime: 60_000,
  });

  const providers: UsageBudgetStatusRow[] = data?.providers ?? [];

  const saveMut = useMutation({
    mutationFn: ({ key, limit }: { key: string; limit: number | null }) =>
      usageService.setProviderBudget(key, limit),
    onSuccess: async (res) => {
      setEditing((e) => {
        const n = { ...e };
        delete n[res.providerKey];
        return n;
      });
      setFeedback((f) => ({
        ...f,
        [res.providerKey]: res.action === 'cleared' ? 'Cap removed.' : 'Saved.',
      }));
      await qc.invalidateQueries({ queryKey: usageKeys.providerBudgets() });
      await qc.invalidateQueries({ queryKey: usageKeys.budgetStatus() });
      setTimeout(() => setFeedback((f) => ({ ...f, [res.providerKey]: '' })), 2500);
    },
    onError: (err: unknown, vars) => {
      const msg = isApiError(err) ? err.message : 'Save failed. Try again.';
      setFeedback((f) => ({ ...f, [vars.key]: msg }));
    },
    onSettled: (_d, _e, vars) => {
      setSaving((s) => ({ ...s, [vars.key]: false }));
    },
  });

  const handleSave = (providerKey: string) => {
    const raw = (editing[providerKey] ?? '').trim();
    const clearing = raw === '' || raw === '0';
    if (!clearing) {
      const limit = parseFloat(raw);
      if (Number.isNaN(limit) || limit < 0) {
        setFeedback((f) => ({
          ...f,
          [providerKey]: 'Enter a positive number or leave blank to remove.',
        }));
        return;
      }
    }
    if (clearing) {
      const ok = window.confirm('Clear the budget cap for this provider?');
      if (!ok) return;
    }
    setSaving((s) => ({ ...s, [providerKey]: true }));
    setFeedback((f) => ({ ...f, [providerKey]: '' }));
    const limit = clearing ? 0 : parseFloat(raw);
    saveMut.mutate({ key: providerKey, limit: clearing ? 0 : limit });
  };

  const handleKeyDown = (e: React.KeyboardEvent, pk: string) => {
    if (e.key === 'Enter') handleSave(pk);
    if (e.key === 'Escape') {
      setEditing((ed) => {
        const n = { ...ed };
        delete n[pk];
        return n;
      });
    }
  };

  return (
    <div className="usage-card usage-section-gap" data-testid="usage-admin-budgets">
      <button
        type="button"
        className="usage-collapse-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="usage-collapse-left">
          <Settings2 />
          <span className="usage-collapse-label">Provider budget settings (admin)</span>
        </div>
        {open ? (
          <ChevronUp className="usage-collapse-chevron" style={{ width: 16, height: 16 }} />
        ) : (
          <ChevronDown className="usage-collapse-chevron" style={{ width: 16, height: 16 }} />
        )}
      </button>

      {open ? (
        <div className="usage-collapse-body">
          <p className="usage-collapse-hint">
            Set a monthly USD spending cap per provider. Once the cap is reached, that provider is
            skipped for the remainder of the calendar month. Caps reset automatically at the start
            of each new month. Leave a field blank (or enter 0) to remove a cap.
          </p>

          {isLoading ? (
            <div className="usage-card-skeleton">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="usage-skel" style={{ height: 40 }} />
              ))}
            </div>
          ) : (
            <>
              <div className="usage-grid-head">
                <span className="usage-col-3">Provider</span>
                <span className="usage-col-3">This month</span>
                <span className="usage-col-4">Monthly cap (USD)</span>
                <span className="usage-col-2" />
              </div>
              <div className="usage-scroll usage-scroll--budget">
                {providers.map((row) => {
                  const isEditing = row.key in editing;
                  const val = isEditing
                    ? editing[row.key]
                    : row.limitUsd != null
                      ? String(row.limitUsd)
                      : '';
                  const fb = feedback[row.key];
                  return (
                    <div
                      key={row.key}
                      className={`usage-grid-row${row.isSuppressed ? ' is-suppressed' : ''}`}
                      data-testid={`admin-budget-${row.key}`}
                    >
                      <div className="usage-col-3">
                        <p
                          className="usage-list-primary"
                          style={row.isSuppressed ? { color: '#b91c1c' } : undefined}
                        >
                          {row.label}
                        </p>
                        {row.isSuppressed ? <p className="usage-text-danger">Cap reached</p> : null}
                      </div>
                      <div className="usage-col-3">
                        <span className="usage-list-cost" style={{ fontWeight: 400 }}>
                          {fmtUsd(row.monthSpendUsd)}
                        </span>
                        {row.pctUsed != null ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              marginTop: 2,
                            }}
                          >
                            <BudgetBar pct={row.pctUsed} suppressed={row.isSuppressed} />
                            <span
                              className={`usage-pct${
                                row.isSuppressed || row.pctUsed >= 100
                                  ? ' is-danger'
                                  : row.pctUsed >= 80
                                    ? ' is-warn'
                                    : ''
                              }`}
                            >
                              {fmtPct(row.pctUsed, 0)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="usage-col-4">
                        <div className="usage-cap-input-wrap">
                          <span className="usage-dollar">$</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="No cap"
                            value={val}
                            onChange={(e) =>
                              setEditing((ed) => ({ ...ed, [row.key]: e.target.value }))
                            }
                            onKeyDown={(e) => handleKeyDown(e, row.key)}
                            onFocus={() => {
                              if (!isEditing) {
                                setEditing((ed) => ({
                                  ...ed,
                                  [row.key]: row.limitUsd != null ? String(row.limitUsd) : '',
                                }));
                              }
                            }}
                            className="usage-cap-input"
                            data-testid={`limit-input-${row.key}`}
                            aria-label={`Monthly cap for ${row.label}`}
                          />
                        </div>
                        {fb ? (
                          <p
                            className={
                              fb === 'Saved.' || fb === 'Cap removed.'
                                ? 'usage-feedback-ok'
                                : 'usage-feedback-err'
                            }
                          >
                            {fb}
                          </p>
                        ) : null}
                      </div>
                      <div className="usage-col-2 usage-admin-actions">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="usage-save-btn"
                              onClick={() => handleSave(row.key)}
                              disabled={!!saving[row.key]}
                              data-testid={`save-budget-${row.key}`}
                            >
                              {saving[row.key] ? '…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="usage-cancel-btn"
                              onClick={() =>
                                setEditing((ed) => {
                                  const n = { ...ed };
                                  delete n[row.key];
                                  return n;
                                })
                              }
                            >
                              ✕
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AdminOverviewPanel({ days }: { days: number }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: usageKeys.adminOverview(days),
    queryFn: () => usageService.getAdminOverview(days),
    enabled: open,
    staleTime: 60_000,
  });

  const byUser = data?.byUser ?? [];

  return (
    <div className="usage-card usage-section-gap" data-testid="usage-admin-overview">
      <button
        type="button"
        className="usage-collapse-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="usage-collapse-left">
          <Users />
          <span className="usage-collapse-label">Platform overview (admin)</span>
        </div>
        {open ? (
          <ChevronUp className="usage-collapse-chevron" style={{ width: 16, height: 16 }} />
        ) : (
          <ChevronDown className="usage-collapse-chevron" style={{ width: 16, height: 16 }} />
        )}
      </button>

      {open ? (
        <div className="usage-collapse-body">
          {isLoading ? (
            <div className="usage-card-skeleton">
              {[1, 2, 3].map((i) => (
                <span key={i} className="usage-skel" style={{ height: 40 }} />
              ))}
            </div>
          ) : byUser.length === 0 ? (
            <div className="usage-card-empty">No usage data for this period.</div>
          ) : (
            <>
              <div className="usage-grid-head" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <span style={{ gridColumn: 'span 2' }}>User</span>
                <span className="usage-col-right">Runs</span>
                <span className="usage-col-right">Est. cost</span>
              </div>
              <div className="usage-scroll usage-scroll--budget">
                {byUser.map((u, idx) => (
                  <div
                    key={u.userId ?? idx}
                    className="usage-grid-row"
                    style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
                  >
                    <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
                      <p
                        className="usage-list-primary"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {u.email ?? 'Unknown user'}
                      </p>
                      <p className="usage-list-secondary">{fmtNum(u.totalCalls)} calls</p>
                    </div>
                    <p className="usage-list-cost usage-col-right" style={{ fontWeight: 400 }}>
                      {u.totalRuns}
                    </p>
                    <p className="usage-list-cost usage-col-right">{fmtUsd(u.totalCostUsd)}</p>
                  </div>
                ))}
              </div>
              {data ? (
                <div className="usage-pagination">
                  <span>Platform total ({data.days}d)</span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {fmtUsd(data.totalCostUsd)}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
