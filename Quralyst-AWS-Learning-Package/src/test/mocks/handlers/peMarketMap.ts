import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import {
  mockMarketMapBuyers,
  mockMarketMapBuyersEmpty,
  mockMarketMapOptions,
  mockMarketMapWhitespace,
} from '@/test/mocks/fixtures/peMarketMap';

export const peMarketMapHandlers = [
  http.get(endpoints.pe.marketMapOptions, () => ok(mockMarketMapOptions)),

  http.get(endpoints.pe.marketMapBuyers, ({ request }) => {
    const url = new URL(request.url);
    const sector = url.searchParams.get('sector');
    const geo = url.searchParams.get('geo');
    if (!sector) {
      return new Response(JSON.stringify({ success: false, error: 'sector is required' }), {
        status: 400,
      });
    }
    if (geo === 'Midwest US') return ok(mockMarketMapBuyersEmpty);
    return ok(mockMarketMapBuyers);
  }),

  http.get(endpoints.pe.marketMapWhitespace, () => ok(mockMarketMapWhitespace)),
];
