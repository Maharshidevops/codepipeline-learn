import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import { mockMarketNews, mockMarketNewsPage2 } from '@/test/mocks/fixtures/peNews';

export const peNewsHandlers = [
  // Research Home — auth'd, not PE-gated (parity with Replit GET /api/news).
  http.get(endpoints.research.homeNews, () =>
    ok({
      ...mockMarketNews,
      distribution: 'weekly' as const,
      page: 1,
      hasMore: true,
    }),
  ),
  http.get(endpoints.pe.news, ({ request }) => {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
    const refresh = url.searchParams.get('refresh');
    const distribution = url.searchParams.get('distribution') ?? 'weekly';

    if (page === 2) {
      return ok({
        ...mockMarketNewsPage2,
        distribution: distribution as typeof mockMarketNewsPage2.distribution,
      });
    }

    return ok({
      ...mockMarketNews,
      distribution: distribution as typeof mockMarketNews.distribution,
      page,
      cachedAt: refresh ? Date.now() : mockMarketNews.cachedAt,
      hasMore: page === 1,
    });
  }),
];
