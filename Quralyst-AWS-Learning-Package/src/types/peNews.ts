// PE News Feed types (F41.2) — mirrors REF-API-CONTRACT.md §PE Dataset — News Feed.
export interface MarketNewsItem {
  title: string;
  url: string;
  source: string;
  snippet: string;
  age: string | null;
}

export type MarketNewsStatus = 'missingKey' | 'upstreamError' | 'fetchError';

export type MarketNewsDistribution = 'daily' | 'weekly' | 'monthly' | 'quarter' | 'custom';

export interface MarketNewsQueryParams {
  distribution?: MarketNewsDistribution;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  refresh?: boolean;
}

export interface MarketNewsResponse {
  items: MarketNewsItem[];
  /** Epoch milliseconds when the platform cache was written; null when uncached/empty status. */
  cachedAt: number | null;
  distribution?: MarketNewsDistribution;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  from?: string;
  to?: string;
  provider?: 'brave' | 'serper';
  status?: MarketNewsStatus;
  error?: string;
}

export const DEFAULT_MARKET_NEWS_QUERY: Required<
  Pick<MarketNewsQueryParams, 'distribution' | 'page' | 'pageSize'>
> = {
  distribution: 'weekly',
  page: 1,
  pageSize: 15,
};

export function marketNewsDistributionLabel(
  distribution: MarketNewsDistribution,
  from?: string,
  to?: string,
): string {
  switch (distribution) {
    case 'daily':
      return 'past day';
    case 'weekly':
      return 'past week';
    case 'monthly':
      return 'past month';
    case 'quarter':
      return 'past quarter';
    case 'custom':
      return from && to ? `${from} – ${to}` : 'custom range';
    default:
      return 'past week';
  }
}

export function parseMarketNewsSearchParams(params: URLSearchParams): MarketNewsQueryParams {
  const distribution = (params.get('distribution') ?? 'weekly') as MarketNewsDistribution;
  const page = Math.max(1, Number(params.get('page') || 1) || 1);
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;
  return {
    distribution,
    page,
    pageSize: DEFAULT_MARKET_NEWS_QUERY.pageSize,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function serializeMarketNewsSearchParams(query: MarketNewsQueryParams): URLSearchParams {
  const qs = new URLSearchParams();
  const distribution = query.distribution ?? DEFAULT_MARKET_NEWS_QUERY.distribution;
  const page = query.page ?? DEFAULT_MARKET_NEWS_QUERY.page;
  if (distribution !== 'weekly') qs.set('distribution', distribution);
  if (page > 1) qs.set('page', String(page));
  if (query.from) qs.set('from', query.from);
  if (query.to) qs.set('to', query.to);
  return qs;
}
