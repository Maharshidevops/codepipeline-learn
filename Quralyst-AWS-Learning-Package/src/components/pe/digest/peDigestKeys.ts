// TanStack Query keys for PE Digest (F37.2).
import type { DigestWindow } from '@/types';

export const peDigestKeys = {
  all: ['pe', 'digest'] as const,
  window: (window: DigestWindow) => [...peDigestKeys.all, window] as const,
};
