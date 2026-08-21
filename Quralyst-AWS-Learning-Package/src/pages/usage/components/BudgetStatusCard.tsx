import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { usageService } from '@/services/api';
import type { UsageBudgetStatusRow } from '@/types';
import { usageKeys } from '../usageKeys';
import { fmtPct, fmtUsd } from '../format';

function BudgetBar({ pct, suppressed }: { pct: number; suppressed: boolean }) {
  const clamped = Math.min(pct, 100);
  const tone = suppressed || pct >= 100 ? 'is-danger' : pct >= 80 ? 'is-warn' : '';
  return (
    <div className="usage-budget-bar" aria-hidden>
      <div className={`usage-budget-bar-fill ${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function BudgetStatusCard() {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: usageKeys.budgetStatus(),
    queryFn: () => usageService.getBudgetStatus(),
    enabled: open,
    staleTime: 60_000,
  });

  const providers: UsageBudgetStatusRow[] = data?.providers ?? [];
  const withCap = providers.filter((p) => p.limitUsd !== null);
  const suppressedCount = withCap.filter((p) => p.isSuppressed).length;

  return (
    <div
      className={`usage-card usage-section-gap${suppressedCount > 0 ? ' is-danger' : ''}`}
      data-testid="usage-budget-status"
    >
      <button
        type="button"
        className="usage-collapse-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="usage-budget-toggle"
      >
        <div className={`usage-collapse-left${suppressedCount > 0 ? ' is-danger' : ''}`}>
          <ShieldAlert />
          <span className="usage-collapse-label">Monthly provider budgets</span>
          {suppressedCount > 0 ? (
            <span className="usage-badge-capped">{suppressedCount} capped</span>
          ) : null}
        </div>
        {open ? (
          <ChevronUp className="usage-collapse-chevron" style={{ width: 16, height: 16 }} />
        ) : (
          <ChevronDown className="usage-collapse-chevron" style={{ width: 16, height: 16 }} />
        )}
      </button>

      {open ? (
        <div className="usage-collapse-body">
          {isLoading && !data ? (
            <div className="usage-card-skeleton">
              {[1, 2, 3].map((i) => (
                <span key={i} className="usage-skel" style={{ height: 32 }} />
              ))}
            </div>
          ) : isError ? (
            <div className="usage-card-empty text-danger">Unable to load budget status.</div>
          ) : withCap.length === 0 ? (
            <div className="usage-card-empty">
              No monthly budget caps configured. Admins can set caps in Provider Budgets settings.
            </div>
          ) : (
            <>
              <div className="usage-grid-head">
                <span className="usage-col-3">Provider</span>
                <span className="usage-col-3">This month</span>
                <span className="usage-col-4">Usage</span>
                <span className="usage-col-2 usage-col-right">Cap</span>
              </div>
              <div className="usage-scroll usage-scroll--budget">
                {withCap.map((row) => (
                  <div
                    key={row.key}
                    className={`usage-grid-row${row.isSuppressed ? ' is-suppressed' : ''}`}
                    data-testid={`budget-row-${row.key}`}
                  >
                    <div className="usage-col-3">
                      <p
                        className="usage-list-primary"
                        style={row.isSuppressed ? { color: '#b91c1c' } : undefined}
                      >
                        {row.label}
                      </p>
                      {row.isSuppressed ? (
                        <p className="usage-text-danger">Capped — skipped</p>
                      ) : null}
                    </div>
                    <div className="usage-col-3">
                      <span className="usage-list-cost" style={{ fontWeight: 400 }}>
                        {fmtUsd(row.monthSpendUsd)}
                      </span>
                    </div>
                    <div
                      className="usage-col-4"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {row.pctUsed != null ? (
                        <>
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
                            {fmtPct(row.pctUsed)}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <div className="usage-col-2 usage-col-right">
                      <span className="usage-muted-soft">
                        {row.limitUsd != null ? fmtUsd(row.limitUsd) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
