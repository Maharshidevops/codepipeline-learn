// IB Vertical service (F34.4) — the typed seam over the /api/ib/* surface. Investment banks, their
// advised tombstone transactions, and their professionals, capped by an advisory league table. Router
// access is `require_pe_access` (staff OR the pe:dataset grant); staff-only ops (DELETE bank,
// infer-emails, scan-contact-pages, the three re-queues) are `require_staff` server-side — the UI
// additionally hides them behind can('pe:admin'). Reads are GETs returning the unified envelope
// `{success,data,…}` (unwrapped by the shared http seam); mutations echo CSRF via the seam. Scrape
// triggers all enqueue durable `ib_scrape` jobs (202 semantics). Contract: backend
// REF-API-CONTRACT.md §IB Vertical. Types: `src/types/ib.ts`.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  IBBank,
  IBBankPatch,
  IBBulkImportResult,
  IBCoverageStats,
  IBDiscoverResult,
  IBEnrichmentStatus,
  IBInferEmailsResult,
  IBLeagueQuery,
  IBLeagueTable,
  IBPeopleQuery,
  IBPerson,
  IBQueuedResult,
  IBScrapeOneResult,
  IBScrapeStatus,
  IBScreenerStats,
  IBTransaction,
  IBTransactionRescrapeProgress,
  IBTransactionsQuery,
} from '@/types';

// --- query-string builders --------------------------------------------------

function txParams(params: IBTransactionsQuery): string {
  const qs = new URLSearchParams();
  if (params.dealType) qs.set('dealType', params.dealType);
  if (params.sector) qs.set('sector', params.sector);
  if (params.bankId) qs.set('bankId', params.bankId);
  if (params.q) qs.set('q', params.q);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

function peopleParams(params: IBPeopleQuery): string {
  const qs = new URLSearchParams();
  if (params.bankId) qs.set('bankId', params.bankId);
  if (params.title) qs.set('title', params.title);
  if (params.q) qs.set('q', params.q);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

function leagueParams(params: IBLeagueQuery): string {
  const qs = new URLSearchParams();
  if (params.sector) qs.set('sector', params.sector);
  if (params.dealType) qs.set('dealType', params.dealType);
  // months is an int OR the literal "all" — forward either verbatim.
  if (params.months != null) qs.set('months', String(params.months));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export interface IBService {
  // Directory
  listBanks(): Promise<IBBank[]>;
  getBank(id: string): Promise<IBBank>;
  createBank(body: { name: string; websiteUrl: string; description?: string }): Promise<IBBank>;
  updateBank(id: string, patch: IBBankPatch): Promise<IBBank>;
  /** Staff-only server-side (require_staff). */
  deleteBank(id: string): Promise<void>;
  bulkImport(urls: string[]): Promise<IBBulkImportResult>;
  /** CU.5: candidate-bank discovery (GET /api/ib/discover?q=…). */
  discoverBanks(query: string): Promise<IBDiscoverResult[]>;
  scrapeAll(): Promise<IBQueuedResult>;
  scrapeStatus(): Promise<IBScrapeStatus>;
  coverageStats(): Promise<IBCoverageStats>;
  // Staff-only re-queues + PII ops
  rescrapePeople(): Promise<IBQueuedResult>;
  rescrapeTransactions(): Promise<IBQueuedResult>;
  /** Live deal re-scrape progress (QURALYST-20 Banks panel). */
  rescrapeTransactionsProgress(): Promise<IBTransactionRescrapeProgress>;
  rescrapeZeroCoverage(): Promise<IBQueuedResult>;
  inferEmails(): Promise<IBInferEmailsResult>;
  scanContactPages(): Promise<IBQueuedResult>;
  // Per-bank triggers
  scrapeBank(id: string): Promise<IBScrapeOneResult>;
  enrichBank(id: string): Promise<IBScrapeOneResult>;
  bankEnrichmentStatus(id: string): Promise<IBEnrichmentStatus>;
  bankTransactions(id: string): Promise<IBTransaction[]>;
  bankPeople(id: string): Promise<IBPerson[]>;
  // Global reads
  listTransactions(params?: IBTransactionsQuery): Promise<IBTransaction[]>;
  listPeople(params?: IBPeopleQuery): Promise<IBPerson[]>;
  screenerStats(): Promise<IBScreenerStats>;
  leagueTable(params?: IBLeagueQuery): Promise<IBLeagueTable>;
}

export const ibService: IBService = {
  listBanks: async () => (await http<{ banks: IBBank[] }>(endpoints.ib.banks)).banks,

  getBank: (id) => http<IBBank>(endpoints.ib.bank(id)),

  createBank: (body) =>
    http<IBBank>(endpoints.ib.banks, { method: 'POST', body: JSON.stringify(body) }),

  updateBank: (id, patch) =>
    http<IBBank>(endpoints.ib.bank(id), { method: 'PATCH', body: JSON.stringify(patch) }),

  deleteBank: async (id) => {
    await http.full(endpoints.ib.bank(id), { method: 'DELETE' });
  },

  bulkImport: (urls) =>
    http<IBBulkImportResult>(endpoints.ib.bulkImport, {
      method: 'POST',
      body: JSON.stringify({ urls }),
    }),

  discoverBanks: async (query) =>
    (
      await http<{ results: IBDiscoverResult[] }>(
        `${endpoints.ib.discover}?q=${encodeURIComponent(query)}`,
      )
    ).results,

  scrapeAll: () => http<IBQueuedResult>(endpoints.ib.scrapeAll, { method: 'POST' }),

  scrapeStatus: () => http<IBScrapeStatus>(endpoints.ib.scrapeStatus),

  coverageStats: () => http<IBCoverageStats>(endpoints.ib.coverageStats),

  rescrapePeople: () => http<IBQueuedResult>(endpoints.ib.rescrapePeople, { method: 'POST' }),

  rescrapeTransactions: () =>
    http<IBQueuedResult>(endpoints.ib.rescrapeTransactions, { method: 'POST' }),

  rescrapeTransactionsProgress: () =>
    http<IBTransactionRescrapeProgress>(endpoints.ib.rescrapeTransactionsProgress),

  rescrapeZeroCoverage: () =>
    http<IBQueuedResult>(endpoints.ib.rescrapeZeroCoverage, { method: 'POST' }),

  inferEmails: () => http<IBInferEmailsResult>(endpoints.ib.inferEmails, { method: 'POST' }),

  scanContactPages: () => http<IBQueuedResult>(endpoints.ib.scanContactPages, { method: 'POST' }),

  scrapeBank: (id) => http<IBScrapeOneResult>(endpoints.ib.bankScrape(id), { method: 'POST' }),

  enrichBank: (id) => http<IBScrapeOneResult>(endpoints.ib.bankEnrich(id), { method: 'POST' }),

  bankEnrichmentStatus: (id) => http<IBEnrichmentStatus>(endpoints.ib.bankEnrichmentStatus(id)),

  bankTransactions: async (id) =>
    (await http<{ transactions: IBTransaction[] }>(endpoints.ib.bankTransactions(id))).transactions,

  bankPeople: async (id) =>
    (await http<{ people: IBPerson[] }>(endpoints.ib.bankPeople(id))).people,

  listTransactions: async (params = {}) =>
    (
      await http<{ transactions: IBTransaction[] }>(
        `${endpoints.ib.transactions}${txParams(params)}`,
      )
    ).transactions,

  listPeople: async (params = {}) =>
    (await http<{ people: IBPerson[] }>(`${endpoints.ib.people}${peopleParams(params)}`)).people,

  screenerStats: () => http<IBScreenerStats>(endpoints.ib.screenerStats),

  leagueTable: (params = {}) =>
    http<IBLeagueTable>(`${endpoints.ib.leagueTable}${leagueParams(params)}`),
};
