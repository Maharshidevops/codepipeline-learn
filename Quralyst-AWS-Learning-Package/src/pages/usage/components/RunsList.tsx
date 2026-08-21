import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { usageService } from '@/services/api';
import type { UsageQueryParams, UsageRunRow } from '@/types';
import { usageKeys } from '../usageKeys';
import { fmtUsd, providerShort, timeAgo } from '../format';

const PER_PAGE = 5;

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'completed') return 'is-completed';
  if (s === 'processing' || s === 'running')
    return s === 'running' ? 'is-running' : 'is-processing';
  if (s === 'failed' || s === 'error') return s === 'failed' ? 'is-failed' : 'is-error';
  return '';
}

function topProviders(run: UsageRunRow): string {
  const entries = Object.entries(run.apiCalls).sort((a, b) => b[1] - a[1]);
  return entries
    .slice(0, 2)
    .map(([k, v]) => `${providerShort(k)} ×${v}`)
    .join(', ');
}

export function RunsList({
  queryParams,
  orgVisible,
}: {
  queryParams: UsageQueryParams;
  orgVisible: boolean;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [queryParams.days, queryParams.userId]);

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: usageKeys.runs({ ...queryParams, page, perPage: PER_PAGE }),
    queryFn: () => usageService.getRuns({ ...queryParams, page, perPage: PER_PAGE }),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const runs = data?.runs ?? [];
  const pag = data?.pagination;
  const showFetch = isFetching && (isPlaceholderData || !!data);

  return (
    <div
      className={`usage-card usage-section-gap${showFetch ? ' is-fetching' : ''}`}
      data-testid="usage-runs"
    >
      {showFetch ? (
        <div className="usage-fetch-overlay" aria-live="polite" aria-busy="true">
          <span className="usage-fetch-spinner" />
          Loading runs…
        </div>
      ) : null}
      <div className="usage-card-header">
        <div>
          <h2 className="usage-card-title">Recent runs</h2>
          <p className="usage-card-sub">{pag ? `${pag.total} total runs` : 'Loading…'}</p>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="usage-card-skeleton">
          {[1, 2, 3].map((i) => (
            <span key={i} className="usage-skel" style={{ height: 48 }} />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="usage-card-empty">No runs recorded yet.</div>
      ) : (
        <>
          <div className="usage-scroll usage-scroll--runs">
            {runs.map((run) => (
              <div key={run.jobId} className="usage-run-row" data-testid={`run-${run.jobId}`}>
                <span
                  className={`usage-status-dot ${statusClass(run.status)}`}
                  title={run.status}
                  aria-label={run.status}
                />
                <div className="usage-run-body">
                  <p className="usage-run-id">
                    {run.jobId.length > 16 ? `${run.jobId.slice(0, 16)}…` : run.jobId}
                    {orgVisible && (run.userName || run.userEmail)
                      ? ` · ${run.userName || run.userEmail}`
                      : ''}
                  </p>
                  <p className="usage-list-secondary">
                    {topProviders(run) || 'No providers recorded'}
                  </p>
                  {run.budgetSuppressed.length > 0 ? (
                    <p className="usage-text-danger">
                      Budget cap: {run.budgetSuppressed.map(providerShort).join(', ')} skipped
                    </p>
                  ) : null}
                </div>
                <div className="usage-list-meta">
                  <p className="usage-list-cost">{fmtUsd(run.estimatedCostUsd)}</p>
                  <p className="usage-list-time">{timeAgo(run.createdAt)}</p>
                </div>
                {run.budgetSuppressed.length > 0 ? (
                  <span data-testid={`suppression-${run.jobId}`} title="Budget suppressed">
                    <ShieldAlert
                      style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0 }}
                      aria-label="Budget cap hit"
                    />
                  </span>
                ) : null}
                {run.hasDepletion && run.budgetSuppressed.length === 0 ? (
                  <span
                    data-testid={`depletion-${run.jobId}`}
                    title={`Depleted: ${run.depletionProviders.join(', ')}`}
                  >
                    <AlertTriangle
                      style={{ width: 14, height: 14, color: '#f59e0b', flexShrink: 0 }}
                      aria-label="Depletion event"
                    />
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          {pag && pag.pages > 1 ? (
            <div className="usage-pagination">
              <button
                type="button"
                className="usage-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} /> Prev
              </button>
              <span data-testid="usage-runs-page-label">
                Page {page} of {pag.pages}
              </span>
              <button
                type="button"
                className="usage-page-btn"
                onClick={() => setPage((p) => Math.min(pag.pages, p + 1))}
                disabled={page >= pag.pages || isFetching}
              >
                Next <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
