// Stable, typed TanStack Query keys for the IB Vertical surface (F34.4). Parallels peTalentFlowKeys /
// peAnalyticsKeys. Filtered reads (transactions/people/league) are keyed by the full param tuple so
// any control change refetches; per-bank reads are keyed by the bank id. Pages pair these with a
// 60 s-friendly staleTime (same convention the PE surfaces use).
import type { IBLeagueQuery, IBPeopleQuery, IBTransactionsQuery } from '@/types';

export const ibKeys = {
  all: ['ib'] as const,
  banks: () => ['ib', 'banks'] as const,
  bank: (id: string) => ['ib', 'bank', id] as const,
  bankTransactions: (id: string) => ['ib', 'bank', id, 'transactions'] as const,
  bankPeople: (id: string) => ['ib', 'bank', id, 'people'] as const,
  bankEnrichmentStatus: (id: string) => ['ib', 'bank', id, 'enrichment-status'] as const,
  coverageStats: () => ['ib', 'coverage-stats'] as const,
  scrapeStatus: () => ['ib', 'scrape-status'] as const,
  rescrapeTransactionsProgress: () => ['ib', 'rescrape-transactions-progress'] as const,
  transactions: (p: IBTransactionsQuery) => ['ib', 'transactions', p] as const,
  people: (p: IBPeopleQuery) => ['ib', 'people', p] as const,
  screenerStats: () => ['ib', 'screener', 'stats'] as const,
  leagueTable: (p: IBLeagueQuery) => ['ib', 'league-table', p] as const,
};
