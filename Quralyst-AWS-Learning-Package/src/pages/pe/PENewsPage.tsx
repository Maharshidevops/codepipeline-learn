// Standalone market news page (F41.2) — curated SMB/mid-market M&A headlines.
import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Spinner } from '@/components/ui';
import NewsFeedWidget from '@/components/pe/news/NewsFeedWidget';
import type { MarketNewsQueryParams } from '@/types';
import {
  marketNewsDistributionLabel,
  parseMarketNewsSearchParams,
  serializeMarketNewsSearchParams,
} from '@/types/peNews';
import '@/styles/pages/market-news.css';

export default function PENewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseMarketNewsSearchParams(searchParams);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setQuery = useCallback(
    (next: MarketNewsQueryParams) => {
      setSearchParams(serializeMarketNewsSearchParams(next), { replace: true });
    },
    [setSearchParams],
  );

  const handleRefreshReady = useCallback((refresh: () => Promise<void>, isFetching: boolean) => {
    refreshRef.current = refresh;
    setIsRefreshing(isFetching);
  }, []);

  const distribution = query.distribution ?? 'weekly';

  return (
    <div className="container py-4 market-news-page">
      <div className="market-news-header">
        <div>
          <h1 className="h3 mb-1">Market News</h1>
          <p className="text-muted mb-0">
            Curated SMB and mid-market M&A headlines (
            {marketNewsDistributionLabel(distribution, query.from, query.to)}, US focus).
          </p>
        </div>
        <Button
          variant="popup-secondary"
          onClick={() => void refreshRef.current?.()}
          disabled={isRefreshing}
          aria-label="Refresh market news"
          data-testid="news-page-refresh"
        >
          {isRefreshing ? (
            <Spinner size="sm" />
          ) : (
            <i className="bi bi-arrow-clockwise me-1" aria-hidden />
          )}
          Refresh
        </Button>
      </div>
      <NewsFeedWidget
        hideChrome
        query={query}
        onQueryChange={setQuery}
        onRefreshReady={handleRefreshReady}
      />
    </div>
  );
}
