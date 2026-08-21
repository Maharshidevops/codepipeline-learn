// PE Market Map service (F38.2) — typed seam over /api/pe/market-map/*.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  MarketMapBuyersResponse,
  MarketMapOptions,
  MarketMapSegment,
  MarketMapWhitespaceResponse,
} from '@/types';

export interface MarketMapBuyersQuery {
  sector: string;
  geo?: string;
  segment?: MarketMapSegment | '';
}

export interface MarketMapWhitespaceQuery {
  segment?: MarketMapSegment | '';
  sector?: string;
  minActivity?: number;
  limit?: number;
}

export interface PEMarketMapService {
  getOptions(): Promise<MarketMapOptions>;
  getBuyers(query: MarketMapBuyersQuery): Promise<MarketMapBuyersResponse>;
  getWhitespace(query?: MarketMapWhitespaceQuery): Promise<MarketMapWhitespaceResponse>;
}

export const peMarketMapService: PEMarketMapService = {
  getOptions: () => http<MarketMapOptions>(endpoints.pe.marketMapOptions),

  getBuyers: (query) => {
    const qs = new URLSearchParams();
    qs.set('sector', query.sector);
    if (query.geo) qs.set('geo', query.geo);
    if (query.segment) qs.set('segment', query.segment);
    return http<MarketMapBuyersResponse>(`${endpoints.pe.marketMapBuyers}?${qs}`);
  },

  getWhitespace: (query = {}) => {
    const qs = new URLSearchParams();
    if (query.segment) qs.set('segment', query.segment);
    if (query.sector) qs.set('sector', query.sector);
    if (query.minActivity != null) qs.set('minActivity', String(query.minActivity));
    if (query.limit != null) qs.set('limit', String(query.limit));
    const suffix = qs.toString() ? `?${qs}` : '';
    return http<MarketMapWhitespaceResponse>(`${endpoints.pe.marketMapWhitespace}${suffix}`);
  },
};
