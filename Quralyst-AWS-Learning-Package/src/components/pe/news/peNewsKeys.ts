// Market news query keys (F41.2).
import type { MarketNewsQueryParams } from '@/types';

export const peNewsKeys = {
  all: ['pe', 'news'] as const,
  feed: (params?: MarketNewsQueryParams) => [...peNewsKeys.all, 'feed', params ?? {}] as const,
};
