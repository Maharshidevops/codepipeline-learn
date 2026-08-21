import { describe, it, expect, vi, beforeEach } from 'vitest';
import { peNewsService } from '@/services/api/peNewsService';
import { http } from '@/services/http';

vi.mock('@/services/http', () => ({
  http: vi.fn(),
}));

describe('peNewsService', () => {
  beforeEach(() => {
    vi.mocked(http).mockReset();
  });

  it('requests default weekly page 1', async () => {
    vi.mocked(http).mockResolvedValue({ items: [], cachedAt: null });
    await peNewsService.getMarketNews();
    expect(http).toHaveBeenCalledWith('/api/pe/news?distribution=weekly&page=1&pageSize=15');
  });

  it('passes distribution, pagination, custom dates, and refresh', async () => {
    vi.mocked(http).mockResolvedValue({ items: [], cachedAt: null });
    await peNewsService.getMarketNews({
      distribution: 'custom',
      page: 2,
      pageSize: 20,
      from: '2026-01-01',
      to: '2026-01-31',
      refresh: true,
    });
    expect(http).toHaveBeenCalledWith(
      '/api/pe/news?distribution=custom&page=2&pageSize=20&from=2026-01-01&to=2026-01-31&refresh=1',
    );
  });
});
