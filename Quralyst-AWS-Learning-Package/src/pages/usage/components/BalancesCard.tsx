import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, MinusCircle, RefreshCw, XCircle } from 'lucide-react';
import { usageService } from '@/services/api';
import { usageKeys } from '../usageKeys';
import { fmtNum, fmtUsd } from '../format';

export function BalancesCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: usageKeys.balances(),
    queryFn: () => usageService.getBalances(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const balances = data?.balances ?? [];
  const alerts = data?.alerts ?? [];

  return (
    <div className="usage-card usage-section-gap" data-testid="usage-balances">
      <div className="usage-card-header">
        <div>
          <h2 className="usage-card-title">Provider balances</h2>
          <p className="usage-card-sub">
            Live credit check using your configured API keys — only Serper exposes a balance API.
          </p>
        </div>
        <button
          type="button"
          className={`usage-icon-btn${isFetching ? ' is-spinning' : ''}`}
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh balances"
        >
          <RefreshCw style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {alerts.length > 0 ? (
        <div className="usage-alert usage-alert-inline" data-testid="usage-balance-alerts">
          <AlertTriangle
            style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0, marginTop: 2 }}
            aria-hidden
          />
          <p className="usage-alert-body" style={{ margin: 0 }}>
            <span style={{ fontWeight: 600 }}>Low balance: </span>
            {alerts
              .map(
                (a) =>
                  `${a.label} (${a.balance != null ? fmtNum(a.balance) : '?'} ${a.unit ?? ''})`,
              )
              .join(', ')}{' '}
            — top up to avoid interrupted runs.
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="usage-card-skeleton">
          {[1, 2, 3].map((i) => (
            <span key={i} className="usage-skel" style={{ height: 40 }} />
          ))}
        </div>
      ) : balances.length === 0 ? (
        <div className="usage-card-empty">No balance probes available.</div>
      ) : (
        <ul className="usage-list usage-scroll usage-scroll--balances">
          {balances.map((b) => {
            const errorLabel =
              b.error === 'No API key configured' ? 'Key not configured' : 'Error fetching';

            return (
              <li
                key={b.provider}
                className={`usage-list-row${b.lowBalance ? ' is-warn' : ''}`}
                data-testid={`balance-${b.provider}`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span style={{ flexShrink: 0 }}>
                    {!b.supported ? (
                      b.configured ? (
                        <CheckCircle2
                          style={{ width: 16, height: 16, color: '#10b981' }}
                          aria-label="Key configured"
                        />
                      ) : (
                        <MinusCircle
                          style={{ width: 16, height: 16, color: '#94a3b8', opacity: 0.5 }}
                          aria-label="No key"
                        />
                      )
                    ) : b.lowBalance ? (
                      <AlertTriangle
                        style={{ width: 16, height: 16, color: '#f59e0b' }}
                        aria-label="Low balance"
                      />
                    ) : b.error ? (
                      <XCircle style={{ width: 16, height: 16, color: '#f87171' }} />
                    ) : (
                      <CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} />
                    )}
                  </span>
                  <p
                    className="usage-list-primary"
                    style={b.lowBalance ? { color: '#92400e', fontWeight: 500 } : undefined}
                  >
                    {b.label}
                  </p>
                </div>
                <div className="usage-list-meta">
                  {!b.supported ? (
                    <div>
                      <span className="usage-muted-soft">
                        {b.configured ? 'Key configured' : 'No key set'}
                      </span>
                      {/* Probe labels retained for a11y / regression tests */}
                      <span className="visually-hidden">
                        {b.configured ? 'Unsupported' : 'Not configured'}
                      </span>
                      {b.configured ? (
                        <p className="usage-list-secondary">
                          {b.internalCostUsd > 0
                            ? `~${fmtUsd(b.internalCostUsd)} · ${fmtNum(b.internalCalls)} calls · ${b.internalRunCount} run${b.internalRunCount !== 1 ? 's' : ''}`
                            : 'No runs yet'}
                        </p>
                      ) : null}
                    </div>
                  ) : b.error ? (
                    <span className="usage-text-danger">{errorLabel}</span>
                  ) : (
                    <div>
                      <span
                        className="usage-list-cost"
                        style={b.lowBalance ? { color: '#b45309' } : undefined}
                      >
                        {b.balance != null ? fmtNum(b.balance) : '—'}{' '}
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 400,
                            color: 'var(--color-text-muted, #64748b)',
                          }}
                        >
                          {b.unit}
                        </span>
                      </span>
                      {b.lowBalance ? <span className="visually-hidden">Low</span> : null}
                      {b.internalCostUsd > 0 ? (
                        <p className="usage-list-secondary">
                          ~{fmtUsd(b.internalCostUsd)} in Quralyst
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
