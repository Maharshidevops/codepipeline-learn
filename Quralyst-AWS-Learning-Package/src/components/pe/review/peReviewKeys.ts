// Stable, typed TanStack Query keys for the PE Review-Queue + Corrections surfaces (F27.3).
// Mutations that resolve items / apply corrections / toggle rules invalidate the relevant key
// so the tables + stats refetch. Parallels peAdminKeys (F28.2).
import type { PEReviewStatus } from '@/types';

export const peReviewKeys = {
  all: ['pe', 'review'] as const,
  /** List is keyed by its server-side filters (status + optional recordType). */
  list: (status: PEReviewStatus, recordType: string | null) =>
    ['pe', 'review', 'list', status, recordType ?? null] as const,
  stats: ['pe', 'review', 'stats'] as const,
};

export const peCorrectionsKeys = {
  all: ['pe', 'corrections'] as const,
  store: ['pe', 'corrections', 'store'] as const,
};
