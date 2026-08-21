// NewsFeedWidget (F41.2) — curated SMB/M&A headlines for Digest + /pe/news.
import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Spinner } from '@/components/ui';
import { peNewsKeys } from '@/components/pe/news/peNewsKeys';
import { peNewsService } from '@/services/api';
import { paths } from '@/routes/paths';
import type { MarketNewsDistribution, MarketNewsQueryParams } from '@/types';
import { DEFAULT_MARKET_NEWS_QUERY, marketNewsDistributionLabel } from '@/types/peNews';
import '@/styles/pages/market-news.css';

const STALE_MS = 15 * 60 * 1000; // ≤30 min backend TTL

const DISTRIBUTIONS: { value: MarketNewsDistribution; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'custom', label: 'Custom' },
];

function cachedHint(cachedAt: number | null | undefined): string | null {
  if (cachedAt == null || !Number.isFinite(cachedAt)) return null;
  const mins = Math.max(0, Math.floor((Date.now() - cachedAt) / 60_000));
  if (mins <= 0) return 'cached just now';
  return `cached ${mins} min ago`;
}

export interface NewsFeedWidgetProps {
  /** Compact chrome when embedded on Digest. */
  compact?: boolean;
  /** Hide the inner title/refresh when the page already provides them. */
  hideChrome?: boolean;
  /** Filter + pagination params (full page). Digest uses defaults. */
  query?: MarketNewsQueryParams;
  onQueryChange?: (next: MarketNewsQueryParams) => void;
  /** Expose force-refresh for page-level toolbar. */
  onRefreshReady?: (refresh: () => Promise<void>, isFetching: boolean) => void;
}

export default function NewsFeedWidget({
  compact = false,
  hideChrome = false,
  query,
  onQueryChange,
  onRefreshReady,
}: NewsFeedWidgetProps = {}) {
  const queryClient = useQueryClient();
  const effectiveQuery = useMemo((): MarketNewsQueryParams => {
    if (compact) return { ...DEFAULT_MARKET_NEWS_QUERY };
    return {
      ...DEFAULT_MARKET_NEWS_QUERY,
      ...query,
    };
  }, [compact, query]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: peNewsKeys.feed(effectiveQuery),
    queryFn: () => peNewsService.getMarketNews(effectiveQuery),
    staleTime: STALE_MS,
  });

  const forceRefresh = useCallback(async () => {
    const fresh = await peNewsService.getMarketNews({ ...effectiveQuery, refresh: true });
    queryClient.setQueryData(peNewsKeys.feed(effectiveQuery), fresh);
  }, [effectiveQuery, queryClient]);

  useEffect(() => {
    onRefreshReady?.(forceRefresh, isFetching);
  }, [forceRefresh, isFetching, onRefreshReady]);

  const status = data?.status;
  const items = data?.items ?? [];
  const hint = cachedHint(data?.cachedAt);
  const distribution = effectiveQuery.distribution ?? DEFAULT_MARKET_NEWS_QUERY.distribution;
  const distributionLabel = marketNewsDistributionLabel(
    distribution,
    effectiveQuery.from,
    effectiveQuery.to,
  );
  const page = effectiveQuery.page ?? 1;
  const hasMore = Boolean(data?.hasMore);

  const setDistribution = (next: MarketNewsDistribution) => {
    onQueryChange?.({
      ...effectiveQuery,
      distribution: next,
      page: 1,
      ...(next !== 'custom' ? { from: undefined, to: undefined } : {}),
    });
  };

  const setPage = (nextPage: number) => {
    onQueryChange?.({ ...effectiveQuery, page: Math.max(1, nextPage) });
  };

  const showFilters = !compact && Boolean(onQueryChange);

  return (
    <section
      className={`news-feed${compact ? ' news-feed--compact' : ''}`}
      data-testid="news-feed-widget"
      aria-labelledby={hideChrome ? undefined : 'news-feed-heading'}
    >
      {!hideChrome ? (
        <div className="news-feed-toolbar">
          <div>
            <h2 id="news-feed-heading">Market headlines</h2>
            <p className="news-feed-meta">
              SMB / mid-market M&A · US · {distributionLabel}
              {hint ? <span> · {hint}</span> : null}
            </p>
          </div>
          <Button
            type="button"
            variant="popup-secondary"
            onClick={() => void forceRefresh()}
            disabled={isFetching}
            aria-label="Refresh news feed"
            title="Fetch latest headlines (bypasses platform cache)"
            data-testid="news-refresh"
          >
            {isFetching ? (
              <Spinner size="sm" />
            ) : (
              <>
                <i className="bi bi-arrow-clockwise me-1" aria-hidden />
                Refresh
              </>
            )}
          </Button>
        </div>
      ) : null}

      {showFilters ? (
        <div className="news-feed-filters" data-testid="news-filters">
          <div className="news-feed-distribution" role="group" aria-label="Time range">
            {DISTRIBUTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`news-feed-distribution-btn${
                  distribution === value ? ' is-active' : ''
                }`}
                aria-pressed={distribution === value}
                data-testid={`news-distribution-${value}`}
                onClick={() => setDistribution(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {distribution === 'custom' ? (
            <div className="news-feed-custom-range">
              <label className="news-feed-date-label">
                From
                <input
                  type="date"
                  value={effectiveQuery.from ?? ''}
                  data-testid="news-from"
                  onChange={(e) =>
                    onQueryChange?.({
                      ...effectiveQuery,
                      from: e.target.value || undefined,
                      page: 1,
                    })
                  }
                />
              </label>
              <label className="news-feed-date-label">
                To
                <input
                  type="date"
                  value={effectiveQuery.to ?? ''}
                  data-testid="news-to"
                  onChange={(e) =>
                    onQueryChange?.({
                      ...effectiveQuery,
                      to: e.target.value || undefined,
                      page: 1,
                    })
                  }
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="news-feed-body">
        {isLoading ? (
          <div className="news-feed-state" data-testid="news-loading" role="status">
            <Spinner size="sm" />
            <p className="small mb-0 mt-2">Loading headlines…</p>
          </div>
        ) : null}

        {!isLoading && status === 'missingKey' ? (
          <div className="news-feed-state" data-testid="news-missing-key">
            <div className="news-feed-state-icon" aria-hidden>
              <i className="bi bi-key" />
            </div>
            <p className="fw-medium mb-1">Connect a News API key</p>
            <p className="small mb-2">
              Market headlines use your News API key (preferences), or Google Serper as a fallback
              when configured.
            </p>
            <Link to={paths.settings.apiKeys} className="small">
              Open preferences
            </Link>
          </div>
        ) : null}

        {!isLoading && (status === 'upstreamError' || status === 'fetchError' || isError) ? (
          <div
            className="alert alert-warning news-feed-alert py-2 small"
            role="alert"
            data-testid="news-error"
          >
            <div className="d-flex justify-content-between align-items-start gap-2">
              <span>
                {(data?.error ||
                  (error as { message?: string })?.message ||
                  'Could not load headlines.') + ' Try again shortly.'}
              </span>
              <button
                type="button"
                className="btn btn-link btn-sm p-0"
                onClick={() => void forceRefresh()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {!isLoading && !status && items.length === 0 ? (
          <div className="news-feed-state" data-testid="news-empty">
            <div className="news-feed-state-icon" aria-hidden>
              <i className="bi bi-newspaper" />
            </div>
            <p className="fw-medium mb-1">No headlines right now</p>
            <p className="small mb-0">Check back after the feed refreshes, or try Refresh.</p>
          </div>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <ul className="news-list" data-testid="news-list">
            {items.map((item) => (
              <li key={item.url} className="news-item" data-testid="news-item">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-item-link"
                >
                  {item.title}
                  <i className="bi bi-box-arrow-up-right" aria-hidden />
                </a>
                <div className="news-item-meta">
                  <span className="news-item-source">{item.source}</span>
                  {item.age ? <span>{item.age}</span> : null}
                </div>
                {item.snippet ? <p className="news-item-snippet">{item.snippet}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}

        {showFilters && !isLoading && (items.length > 0 || page > 1) ? (
          <div className="news-feed-pagination" data-testid="news-pagination">
            <Button
              type="button"
              variant="popup-secondary"
              disabled={page <= 1 || isFetching}
              data-testid="news-prev"
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="news-feed-page-label" data-testid="news-page-label">
              Page {page}
            </span>
            <Button
              type="button"
              variant="popup-secondary"
              disabled={!hasMore || isFetching}
              data-testid="news-next"
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
