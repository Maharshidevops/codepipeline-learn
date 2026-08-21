// Stable, typed TanStack Query keys for the PE Talent Flow surface (F33.2). The moves feed is keyed by
// the FULL param tuple (confidence floor + firmId + search + limit) so any control change refetches;
// person history is keyed by the anchor id. Parallels peAnalyticsKeys / peChangesKeys. The page pairs
// these with a 60 s-friendly staleTime (same convention F30/F31/F32 used) since the backend serves the
// moves feed from an indexed persisted collection.
import type { PETalentFlowParams } from '@/types';

export const peTalentFlowKeys = {
  all: ['pe', 'talent-flow'] as const,
  moves: (p: PETalentFlowParams) => ['pe', 'talent-flow', 'moves', p] as const,
  history: (id: string) => ['pe', 'talent-flow', 'history', id] as const,
};
