// PE Screener service (F29.2) — the typed seam over the /api/pe/screener/* surface. Four search
// tabs (holdings/firms/people) fed by an options + holdings-stats endpoint, plus the find-similar
// pipeline. Router access is `require_pe_access` (staff OR the pe:dataset grant); the find-similar
// POST is CSRF-protected (echoed by the shared http seam). List paths return the unified envelope
// `{data:[...rows], meta:{total,page,pageSize}}`; `export=true` returns a bare flat array (up to
// 50000) NOT wrapped in the list meta. Contract: backend REF-API-CONTRACT.md §PE Dataset — Screener.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  PEScreenerFindSimilarBody,
  PEScreenerFirmRow,
  PEScreenerFirmsList,
  PEScreenerFirmsQuery,
  PEScreenerHoldingRow,
  PEScreenerHoldingsList,
  PEScreenerHoldingsQuery,
  PEScreenerHoldingsStats,
  PEScreenerListMeta,
  PEScreenerOptions,
  PEScreenerPeopleList,
  PEScreenerPeopleQuery,
  PEScreenerPersonRow,
  PEScreenerSimilarResult,
} from '@/types';

// --- query-string builders -------------------------------------------------

function holdingsParams(query: PEScreenerHoldingsQuery, exportAll = false): URLSearchParams {
  const qs = new URLSearchParams();
  if (query.search) qs.set('search', query.search);
  if (query.firmId) qs.set('firmId', query.firmId);
  if (query.status) qs.set('status', query.status);
  if (query.sector) qs.set('sector', query.sector);
  if (query.geography) qs.set('geography', query.geography);
  if (query.investYearFrom) qs.set('investYearFrom', query.investYearFrom);
  if (query.investYearTo) qs.set('investYearTo', query.investYearTo);
  if (query.hasDate) qs.set('hasDate', query.hasDate);
  if (query.hasDescription) qs.set('hasDescription', query.hasDescription);
  if (query.hasWebsite) qs.set('hasWebsite', query.hasWebsite);
  if (query.qualityFilter) qs.set('qualityFilter', query.qualityFilter);
  if (query.includeSuspect) qs.set('includeSuspect', 'true');
  if (query.sortBy) qs.set('sortBy', query.sortBy);
  if (query.sortDir) qs.set('sortDir', query.sortDir);
  if (exportAll) {
    qs.set('export', 'true');
  } else {
    // page is 0-based per the contract.
    qs.set('page', String(query.page ?? 0));
    qs.set('pageSize', String(query.pageSize ?? 50));
  }
  return qs;
}

function firmsParams(query: PEScreenerFirmsQuery, exportAll = false): URLSearchParams {
  const qs = new URLSearchParams();
  if (query.search) qs.set('search', query.search);
  if (query.status) qs.set('status', query.status);
  if (query.revTarget != null) qs.set('revTarget', String(query.revTarget));
  if (query.ebitdaTarget != null) qs.set('ebitdaTarget', String(query.ebitdaTarget));
  if (query.evTarget != null) qs.set('evTarget', String(query.evTarget));
  if (query.equityTarget != null) qs.set('equityTarget', String(query.equityTarget));
  if (query.negativeEbitdaOk) qs.set('negativeEbitdaOk', 'true');
  if (query.sectorSearch) qs.set('sectorSearch', query.sectorSearch);
  if (query.geoSearch) qs.set('geoSearch', query.geoSearch);
  if (exportAll) {
    qs.set('export', 'true');
  } else {
    qs.set('page', String(query.page ?? 0));
    qs.set('pageSize', String(query.pageSize ?? 50));
  }
  return qs;
}

function peopleParams(query: PEScreenerPeopleQuery, exportAll = false): URLSearchParams {
  const qs = new URLSearchParams();
  if (query.search) qs.set('search', query.search);
  if (query.firmId) qs.set('firmId', query.firmId);
  if (query.title) qs.set('title', query.title);
  if (query.roleTag) qs.set('roleTag', query.roleTag);
  if (query.hasLinkedIn) qs.set('hasLinkedIn', query.hasLinkedIn);
  if (exportAll) {
    qs.set('export', 'true');
  } else {
    qs.set('page', String(query.page ?? 0));
    qs.set('pageSize', String(query.pageSize ?? 50));
  }
  return qs;
}

function meta(
  bag: unknown,
  query: { page?: number; pageSize?: number },
  len: number,
): PEScreenerListMeta {
  const m = (bag ?? {}) as Partial<PEScreenerListMeta>;
  return {
    total: m.total ?? len,
    page: m.page ?? query.page ?? 0,
    pageSize: m.pageSize ?? query.pageSize ?? 50,
  };
}

export interface PEScreenerService {
  listHoldings(query?: PEScreenerHoldingsQuery): Promise<PEScreenerHoldingsList>;
  exportHoldings(query?: PEScreenerHoldingsQuery): Promise<PEScreenerHoldingRow[]>;
  getHoldingsStats(): Promise<PEScreenerHoldingsStats>;
  listFirms(query?: PEScreenerFirmsQuery): Promise<PEScreenerFirmsList>;
  exportFirms(query?: PEScreenerFirmsQuery): Promise<PEScreenerFirmRow[]>;
  listPeople(query?: PEScreenerPeopleQuery): Promise<PEScreenerPeopleList>;
  exportPeople(query?: PEScreenerPeopleQuery): Promise<PEScreenerPersonRow[]>;
  getOptions(): Promise<PEScreenerOptions>;
  findSimilarFirms(body: PEScreenerFindSimilarBody): Promise<PEScreenerSimilarResult>;
}

export const peScreenerService: PEScreenerService = {
  listHoldings: async (query = {}) => {
    const qs = holdingsParams(query);
    const env = await http.full<PEScreenerHoldingRow[]>(
      `${endpoints.pe.screenerHoldings}?${qs.toString()}`,
    );
    return { rows: env.data, meta: meta(env.meta, query, env.data.length) };
  },

  exportHoldings: (query = {}) =>
    http<PEScreenerHoldingRow[]>(
      `${endpoints.pe.screenerHoldings}?${holdingsParams(query, true).toString()}`,
    ),

  getHoldingsStats: () => http<PEScreenerHoldingsStats>(endpoints.pe.screenerHoldingsStats),

  listFirms: async (query = {}) => {
    const qs = firmsParams(query);
    const env = await http.full<PEScreenerFirmRow[]>(
      `${endpoints.pe.screenerFirms}?${qs.toString()}`,
    );
    return { rows: env.data, meta: meta(env.meta, query, env.data.length) };
  },

  exportFirms: (query = {}) =>
    http<PEScreenerFirmRow[]>(
      `${endpoints.pe.screenerFirms}?${firmsParams(query, true).toString()}`,
    ),

  listPeople: async (query = {}) => {
    const qs = peopleParams(query);
    const env = await http.full<PEScreenerPersonRow[]>(
      `${endpoints.pe.screenerPeople}?${qs.toString()}`,
    );
    return { rows: env.data, meta: meta(env.meta, query, env.data.length) };
  },

  exportPeople: (query = {}) =>
    http<PEScreenerPersonRow[]>(
      `${endpoints.pe.screenerPeople}?${peopleParams(query, true).toString()}`,
    ),

  getOptions: () => http<PEScreenerOptions>(endpoints.pe.screenerOptions),

  findSimilarFirms: (body) =>
    http<PEScreenerSimilarResult>(endpoints.pe.screenerFindSimilar, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
