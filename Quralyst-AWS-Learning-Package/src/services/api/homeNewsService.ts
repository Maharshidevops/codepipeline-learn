// Research Home news (parity with Replit GET /api/news) — auth'd, not PE-gated.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { MarketNewsResponse } from '@/types';

export interface HomeNewsService {
  getNews(): Promise<MarketNewsResponse>;
}

export const homeNewsService: HomeNewsService = {
  getNews: () => http<MarketNewsResponse>(endpoints.research.homeNews),
};
