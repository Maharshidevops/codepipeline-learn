// MSW fixtures for PE News Feed (F41.2).
import type { MarketNewsResponse } from '@/types';

export const mockMarketNews: MarketNewsResponse = {
  cachedAt: Date.now() - 5 * 60_000,
  distribution: 'weekly',
  page: 1,
  pageSize: 15,
  hasMore: false,
  items: [
    {
      title: 'PE firm buys Midwest HVAC roll-up',
      url: 'https://example.com/hvac-deal',
      source: 'example.com',
      snippet: 'A lower-middle-market sponsor closed on a platform acquisition…',
      age: '3 hours ago',
    },
    {
      title: 'SMB software buyout announced',
      url: 'https://news.example.org/smb-buyout',
      source: 'news.example.org',
      snippet: 'Deal terms were not disclosed.',
      age: null,
    },
  ],
};

export const mockMarketNewsPage2: MarketNewsResponse = {
  cachedAt: Date.now(),
  distribution: 'weekly',
  page: 2,
  pageSize: 15,
  hasMore: false,
  items: [
    {
      title: 'Page two headline',
      url: 'https://example.com/page-two',
      source: 'example.com',
      snippet: 'Second page of results.',
      age: '1 day ago',
    },
  ],
};

export const mockMarketNewsMissingKey: MarketNewsResponse = {
  items: [],
  cachedAt: null,
  status: 'missingKey',
  distribution: 'weekly',
  page: 1,
  pageSize: 15,
  hasMore: false,
};

export const mockMarketNewsUpstreamError: MarketNewsResponse = {
  items: [],
  cachedAt: null,
  status: 'upstreamError',
  error: 'News API error 429',
  distribution: 'weekly',
  page: 1,
  pageSize: 15,
  hasMore: false,
};

export const mockMarketNewsEmpty: MarketNewsResponse = {
  items: [],
  cachedAt: Date.now(),
  distribution: 'weekly',
  page: 1,
  pageSize: 15,
  hasMore: false,
};
