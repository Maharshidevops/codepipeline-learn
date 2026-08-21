// IB Vertical fixtures (F34.4) — mirror the backend contract shapes exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §IB Vertical (Tier C, F34)).
// Used by the IB MSW handlers + the page tests. Three banks with differing coverage exercise the
// coverage panel, the league table (rank by dealCount), the inferred-email marking, and the
// reject-aware empty state (bank ib3 has neither transactions nor people).
import type { IBBank, IBCoverageStats, IBPerson, IBScreenerStats, IBTransaction } from '@/types';

export const bankA: IBBank = {
  id: 'ib1',
  name: 'Evercore',
  websiteUrl: 'https://evercore.com',
  description: 'Independent advisory firm.',
  dealFocus: 'Middle-market M&A',
  dealTypes: 'M&A, Restructuring',
  hqLocation: 'New York, NY',
  foundedYear: 1995,
  employeeCount: 2000,
  status: 'active',
  // Relative date — a fixed ISO date rots past freshnessOf's 7-day window and the
  // "fresh" badge assertion starts failing (it did on 2026-07-17; CU.5 fixed it).
  lastScrapedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: '2026-06-01T00:00:00Z',
  criteriaAutoFilled: { dealFocus: 'scrape' },
  transactionsCount: 2,
  peopleCount: 2,
};

export const bankB: IBBank = {
  id: 'ib2',
  name: 'Moelis & Company',
  websiteUrl: 'https://moelis.com',
  description: null,
  dealFocus: 'Restructuring & M&A',
  dealTypes: 'M&A',
  hqLocation: 'Los Angeles, CA',
  foundedYear: 2007,
  employeeCount: 1000,
  status: 'active',
  // Older than 7 days → "stale" freshness (relative to any recent test run).
  lastScrapedAt: '2024-01-01T00:00:00Z',
  createdAt: '2026-05-15T00:00:00Z',
  criteriaAutoFilled: null,
  transactionsCount: 1,
  peopleCount: 0,
};

export const bankC: IBBank = {
  id: 'ib3',
  name: 'Newco Advisors',
  websiteUrl: 'https://newco-advisors.com',
  description: null,
  dealFocus: null,
  dealTypes: null,
  hqLocation: null,
  foundedYear: null,
  employeeCount: null,
  status: 'paused',
  lastScrapedAt: null, // never scraped → "never" freshness
  createdAt: '2026-07-01T00:00:00Z',
  criteriaAutoFilled: null,
  transactionsCount: 0,
  peopleCount: 0,
};

// Newest-created first (contract ordering): ib3 (Jul 1) → ib1 (Jun 1) → ib2 (May 15).
export const allBanks: IBBank[] = [bankC, bankA, bankB];

export const txA1: IBTransaction = {
  id: 'tx1',
  bankId: 'ib1',
  bankName: 'Evercore',
  bankWebsite: 'https://evercore.com',
  dealName: 'Acme acquires Beta Corp',
  dealType: 'M&A',
  dealSize: '$500MM',
  dealSizeMin: null,
  dealSizeMax: null,
  dealSizeExact: 500_000_000,
  dealDate: '2026-05',
  datePrecision: 'month',
  targetCompany: 'Beta Corp',
  acquirerCompany: 'Acme Inc',
  role: 'Sell-side advisor',
  sector: 'Technology',
  sectorTags: ['Technology', 'Software'],
  description: 'Advised Beta on its sale.',
  sourceUrl: 'https://evercore.com/deals/1',
  scrapedAt: '2026-07-10T00:00:00Z',
};

export const txA2: IBTransaction = {
  id: 'tx2',
  bankId: 'ib1',
  bankName: 'Evercore',
  bankWebsite: 'https://evercore.com',
  dealName: 'Gamma restructuring',
  dealType: 'Restructuring',
  dealSize: '$1.2B',
  dealSizeMin: null,
  dealSizeMax: null,
  dealSizeExact: 1_200_000_000,
  dealDate: '2026-03',
  datePrecision: 'month',
  targetCompany: 'Gamma Holdings',
  acquirerCompany: null,
  role: 'Financial advisor',
  sector: 'Industrials',
  sectorTags: ['Industrials'],
  description: null,
  sourceUrl: null,
  scrapedAt: '2026-07-09T00:00:00Z',
};

export const txB1: IBTransaction = {
  id: 'tx3',
  bankId: 'ib2',
  bankName: 'Moelis & Company',
  bankWebsite: 'https://moelis.com',
  dealName: 'Delta merges with Epsilon',
  dealType: 'M&A',
  dealSize: '$50MM+',
  dealSizeMin: 50_000_000,
  dealSizeMax: null,
  dealSizeExact: null,
  dealDate: '2026-06',
  datePrecision: 'month',
  targetCompany: 'Epsilon LLC',
  acquirerCompany: 'Delta Group',
  role: 'Buy-side advisor',
  sector: 'Healthcare',
  sectorTags: ['Healthcare'],
  description: null,
  sourceUrl: 'https://moelis.com/deals/1',
  scrapedAt: '2026-07-08T00:00:00Z',
};

// Newest-scraped first: tx1 (Jul 10) → tx2 (Jul 9) → tx3 (Jul 8).
export const allTransactions: IBTransaction[] = [txA1, txA2, txB1];

export const personA1: IBPerson = {
  id: 'p1',
  bankId: 'ib1',
  bankName: 'Evercore',
  bankWebsite: 'https://evercore.com',
  name: 'Alice Anderson',
  title: 'Managing Director',
  bio: 'Leads the technology advisory practice.',
  email: 'alice.anderson@evercore.com',
  emailInferred: false,
  linkedinUrl: 'https://linkedin.com/in/alice-anderson',
  imageUrl: null,
  location: 'New York, NY',
  scrapedAt: '2026-07-10T00:00:00Z',
};

export const personA2: IBPerson = {
  id: 'p2',
  bankId: 'ib1',
  bankName: 'Evercore',
  bankWebsite: 'https://evercore.com',
  name: 'Bob Brown',
  title: 'Vice President',
  bio: null,
  // Inferred (first.last@domain) — must be visually marked in the UI.
  email: 'bob.brown@evercore.com',
  emailInferred: true,
  linkedinUrl: null,
  imageUrl: null,
  location: null,
  scrapedAt: '2026-07-09T00:00:00Z',
};

// name-asc (contract ordering): Alice → Bob.
export const allPeople: IBPerson[] = [personA1, personA2];

export const coverageStats: IBCoverageStats = {
  total: 3,
  withTransactions: 2, // ib1, ib2
  withPeople: 1, // ib1
  withBoth: 1, // ib1
  withNeither: 1, // ib3
  withTransactionsPct: 67,
  withPeoplePct: 33,
  withBothPct: 33,
  withNeitherPct: 33,
};

export const screenerStats: IBScreenerStats = {
  totalBanks: 3,
  totalTransactions: 3,
  totalPeople: 2,
  banksWithTransactions: 2,
  dealTypes: ['M&A', 'Restructuring'],
  sectors: ['Healthcare', 'Industrials', 'Technology'],
};
