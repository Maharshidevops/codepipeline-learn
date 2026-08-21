// PE market news service (F41.2) — typed seam over GET /api/pe/news.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { MarketNewsQueryParams, MarketNewsResponse } from '@/types';
import { DEFAULT_MARKET_NEWS_QUERY } from '@/types/peNews';

export interface PENewsService {
  getMarketNews(params?: MarketNewsQueryParams): Promise<MarketNewsResponse>;
}

function buildMarketNewsQuery(params: MarketNewsQueryParams = {}): string {
  const qs = new URLSearchParams();
  const distribution = params.distribution ?? DEFAULT_MARKET_NEWS_QUERY.distribution;
  const page = params.page ?? DEFAULT_MARKET_NEWS_QUERY.page;
  const pageSize = params.pageSize ?? DEFAULT_MARKET_NEWS_QUERY.pageSize;
  qs.set('distribution', distribution);
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.refresh) qs.set('refresh', '1');
  return qs.toString();
}

export const peNewsService: PENewsService = {
  getMarketNews: (params) =>
    http<MarketNewsResponse>(`${endpoints.pe.news}?${buildMarketNewsQuery(params)}`),
};
