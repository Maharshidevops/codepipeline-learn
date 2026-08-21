import type { UsageProviderRow } from '@/types';
import { fmtNum, fmtUsd } from '../format';

export function ProviderBreakdown({
  providers,
  loading,
  fetching = false,
}: {
  providers: UsageProviderRow[];
  loading: boolean;
  fetching?: boolean;
}) {
  const visible = providers.filter((p) => p.calls > 0);
  const empty = visible.length === 0;

  return (
    <div className={`usage-card${fetching ? ' is-fetching' : ''}`} data-testid="usage-providers">
      {fetching ? (
        <div className="usage-fetch-overlay" aria-live="polite" aria-busy="true">
          <span className="usage-fetch-spinner" />
          Updating…
        </div>
      ) : null}
      <div className="usage-card-header">
        <div>
          <h2 className="usage-card-title">Provider breakdown</h2>
          <p className="usage-card-sub">Estimated costs are indicative, not billing-grade.</p>
        </div>
      </div>
      {loading ? (
        <div className="usage-card-skeleton">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="usage-skel" />
          ))}
        </div>
      ) : empty ? (
        <div className="usage-card-empty">No API calls recorded in this period.</div>
      ) : (
        <ul className="usage-list usage-scroll usage-scroll--providers">
          {visible.map((row) => (
            <li key={row.key} className="usage-list-row">
              <div>
                <p className="usage-list-primary">{row.label}</p>
                <p className="usage-list-secondary">{fmtNum(row.calls)} calls</p>
              </div>
              <span className="usage-list-cost">{fmtUsd(row.costUsd)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
