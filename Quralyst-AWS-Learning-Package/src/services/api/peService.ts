// PE Dataset service (F23.4) — the typed seam for the /api/pe/* surface.
// Contract: backend Phases/Migration/REF-API-CONTRACT.md §PE Dataset. All routes
// require the `pe:dataset` permission server-side; the UI additionally gates via can().
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  PEBulkImportResult,
  PEEnrichmentStatus,
  PEFirm,
  PEFirmListMeta,
  PEHolding,
  PEHoldingEnrichResult,
  PEHoldingListMeta,
  PEHoldingEnrichment,
  PEHoldingTeam,
  PEPeopleBatchAccepted,
  PEPeopleDryRun,
  PEPeopleListMeta,
  PEPeopleResolveResult,
  PEPeopleSummary,
  PEPersonRow,
  PEScrapeJob,
} from '@/types';

/** TanStack Query keys for firm detail + enrichment (F60 Step 7). */
export const peFirmKeys = {
  all: ['pe', 'firms'] as const,
  firm: (id: string) => ['pe', 'firm', id] as const,
  enrichmentStatus: (id: string) => ['pe', 'firm', id, 'enrichment-status'] as const,
};

export type PEHoldingSortBy =
  | 'companyName'
  | 'firmName'
  | 'sector'
  | 'investmentStatus'
  | 'investmentDate'
  | 'estimatedInvestment'
  | 'lastSeenAt';

export type PEHoldingSortDir = 'asc' | 'desc';

export interface PEHoldingsQuery {
  search?: string;
  status?: string;
  firmId?: string;
  sortBy?: PEHoldingSortBy;
  sortDir?: PEHoldingSortDir;
  /** `'suspect'` restricts to rows with a present-but-bad field. */
  quality?: 'suspect';
  /** 0-based page index (contract). */
  page?: number;
  pageSize?: number;
  /** When true, fetch up to 50k rows for CSV (meta.export). */
  export?: boolean;
}

export interface PEHoldingsList {
  holdings: PEHolding[];
  meta: PEHoldingListMeta;
}

/** The operator-editable field set (contract: exactly these four). */
export interface PEHoldingPatch {
  companyName?: string;
  sector?: string | null;
  geography?: string | null;
  investmentDate?: string | null;
}

export interface PEFirmsQuery {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface PEFirmsList {
  firms: PEFirm[];
  meta: PEFirmListMeta;
}

/** Lightweight firm option for filter dropdowns (GET /pe/firms/options — all firms, name-ordered). */
export interface PEFirmOption {
  id: string;
  name: string;
}

export interface PEScrapeTriggerResult {
  queued: boolean;
  jobId?: string;
  message: string;
}

/** POST /pe/firms returns the firm row plus the create-time gate outcome (F23.5 §4). */
export type PECreatedFirm = PEFirm & {
  scrapeQueued: boolean;
  quarantined: boolean;
  quarantineReason: string | null;
};

// --- People (F25.1/F25.2) --------------------------------------------------

export interface PEPeopleQuery {
  firmId?: string;
  search?: string;
  roleTag?: string;
  focusTag?: string;
  /** limit 1–500 (contract), default 100. */
  limit?: number;
  offset?: number;
}

export interface PEPeopleList {
  people: PEPersonRow[];
  meta: PEPeopleListMeta;
}

/** Body for the two email ops (both support a dry-run preview). */
export interface PEEmailOpBody {
  firmId?: string;
  limit?: number;
  /** verify-emails only: re-verify already-verified inferred emails. */
  reverify?: boolean;
}

export interface PEService {
  listFirms(query?: PEFirmsQuery): Promise<PEFirmsList>;
  /** All firms as {id, name} for filter dropdowns — unpaginated (see PEFirmOption). */
  listFirmOptions(): Promise<PEFirmOption[]>;
  getFirm(id: string): Promise<PEFirm>;
  createFirm(body: Partial<PEFirm> & { websiteUrl: string }): Promise<PECreatedFirm>;
  updateFirm(id: string, patch: Partial<PEFirm>): Promise<PEFirm>;
  deleteFirm(id: string): Promise<void>;
  getScrapeJobs(id: string): Promise<PEScrapeJob[]>;
  getPortfolioUrls(id: string): Promise<string[]>;
  setPortfolioUrls(id: string, urls: string[]): Promise<string[]>;
  // NOTE: POST /api/pe/firms/discover is API-only (CU.5 residual-audit decision) —
  // discovery runs server-side inside create/bulk-import; no standalone preview UI.
  bulkImport(urls: string[]): Promise<PEBulkImportResult>;
  scrapeFirm(id: string): Promise<PEScrapeTriggerResult>;
  /** POST /pe/firms/{id}/enrich — enqueue firm-scoped enrichment (F60 §4). */
  enrichFirm(id: string): Promise<PEScrapeTriggerResult>;
  /** GET /pe/firms/{id}/enrichment-status — coverage ledger aggregates (F60 §4). */
  firmEnrichmentStatus(id: string): Promise<PEEnrichmentStatus>;
  /** `force` bypasses the 12h per-firm cooldown (staff-only "Force re-scrape all"). */
  scrapeAll(opts?: { force?: boolean }): Promise<{ queued: number; skipped: number }>;
  /** Download the firm directory as CSV (honors the current search/status filters). */
  exportFirms(query?: { search?: string; status?: string }): Promise<void>;
  listHoldings(query?: PEHoldingsQuery): Promise<PEHoldingsList>;
  /** Client-side CSV of up to 50k holdings (GET /holdings?export=true). */
  exportHoldings(query?: Omit<PEHoldingsQuery, 'page' | 'pageSize' | 'export'>): Promise<void>;
  updateHolding(id: string, patch: PEHoldingPatch): Promise<PEHolding>;
  deleteHolding(id: string): Promise<void>;
  getHoldingTeam(id: string): Promise<PEHoldingTeam>;
  getHoldingEnrichment(id: string): Promise<PEHoldingEnrichment>;
  aiEnrichHolding(id: string): Promise<PEHoldingEnrichResult>;
  // People (F25.1/F25.2)
  listPeople(query?: PEPeopleQuery): Promise<PEPeopleList>;
  getPeopleSummary(): Promise<PEPeopleSummary>;
  scrapePeople(firmId: string): Promise<PEScrapeTriggerResult>;
  deletePerson(id: string): Promise<void>;
  flagPerson(id: string, reason?: string): Promise<PEPersonRow>;
  unflagPerson(id: string): Promise<PEPersonRow>;
  tagPeople(opts?: { retag?: boolean; firmId?: string }): Promise<PEPeopleBatchAccepted>;
  tagFocus(opts?: { firmId?: string }): Promise<PEPeopleBatchAccepted>;
  previewFindEmails(body?: PEEmailOpBody): Promise<PEPeopleDryRun>;
  findEmails(body?: PEEmailOpBody): Promise<PEPeopleBatchAccepted>;
  previewVerifyEmails(body?: PEEmailOpBody): Promise<PEPeopleDryRun>;
  verifyEmails(body?: PEEmailOpBody): Promise<PEPeopleBatchAccepted>;
  contactEnrich(firmIds?: string[]): Promise<PEPeopleBatchAccepted>;
  scrapeBatch(firmIds?: string[]): Promise<PEPeopleBatchAccepted>;
  scrapeByFirms(firmIds: string[]): Promise<PEPeopleBatchAccepted>;
  resolveExport(urls: string[]): Promise<PEPeopleResolveResult>;
  exportPeople(firmIds: string[]): Promise<void>;
}

export const peService: PEService = {
  listFirms: async (query = {}) => {
    const qs = new URLSearchParams();
    if (query.search) qs.set('search', query.search);
    if (query.status) qs.set('status', query.status);
    qs.set('page', String(query.page ?? 1));
    qs.set('pageSize', String(query.pageSize ?? 25));
    const env = await http.full<{ firms: PEFirm[] }>(`${endpoints.pe.firms}?${qs.toString()}`);
    // ApiMeta is a free-form envelope bag; the PE list contract pins {total, page, pageSize}.
    const meta = (env.meta ?? {}) as unknown as Partial<PEFirmListMeta>;
    return {
      firms: env.data.firms,
      meta: {
        total: meta.total ?? env.data.firms.length,
        page: meta.page ?? query.page ?? 1,
        pageSize: meta.pageSize ?? query.pageSize ?? 25,
      },
    };
  },

  listFirmOptions: async () => {
    const { firms } = await http<{ firms: PEFirmOption[] }>(endpoints.pe.firmOptions);
    return firms;
  },

  getFirm: (id) => http<PEFirm>(endpoints.pe.firm(id)),

  createFirm: (body) =>
    http<PECreatedFirm>(endpoints.pe.firms, { method: 'POST', body: JSON.stringify(body) }),

  updateFirm: (id, patch) =>
    http<PEFirm>(endpoints.pe.firm(id), { method: 'PATCH', body: JSON.stringify(patch) }),

  deleteFirm: async (id) => {
    await http.full(endpoints.pe.firm(id), { method: 'DELETE' });
  },

  getScrapeJobs: async (id) => {
    const data = await http<{ jobs: PEScrapeJob[] }>(endpoints.pe.firmScrapeJobs(id));
    return data.jobs;
  },

  getPortfolioUrls: async (id) => {
    const data = await http<{ urls: string[] }>(endpoints.pe.firmPortfolioUrls(id));
    return data.urls;
  },

  setPortfolioUrls: async (id, urls) => {
    const data = await http<{ urls: string[] }>(endpoints.pe.firmPortfolioUrls(id), {
      method: 'PUT',
      body: JSON.stringify({ urls }),
    });
    return data.urls;
  },

  bulkImport: (urls) =>
    http<PEBulkImportResult>(endpoints.pe.bulkImport, {
      method: 'POST',
      body: JSON.stringify({ urls }),
    }),

  scrapeFirm: async (id) => {
    const env = await http.full<{ queued: boolean; jobId?: string }>(endpoints.pe.firmScrape(id), {
      method: 'POST',
    });
    return { ...env.data, message: env.message ?? '' };
  },

  enrichFirm: async (id) => {
    const env = await http.full<{ queued: boolean; jobId?: string }>(endpoints.pe.firmEnrich(id), {
      method: 'POST',
    });
    return { ...env.data, message: env.message ?? '' };
  },

  firmEnrichmentStatus: (id) => http<PEEnrichmentStatus>(endpoints.pe.firmEnrichmentStatus(id)),

  scrapeAll: (opts = {}) =>
    http<{ queued: number; skipped: number }>(endpoints.pe.scrapeAll, {
      method: 'POST',
      body: JSON.stringify(opts.force ? { force: true } : {}),
    }),

  exportFirms: async (query = {}) => {
    // CSV carve-out (not the JSON envelope): stream the download through the http seam
    // (credentials echoed) and trigger a browser save. Mirrors exportPeople.
    const qs = new URLSearchParams();
    if (query.search) qs.set('search', query.search);
    if (query.status) qs.set('status', query.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await http.download(`${endpoints.pe.firmsExport}${suffix}`);
    const blob = await res.blob();
    if (typeof URL.createObjectURL !== 'function') return; // non-browser (test) env
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pe-firms-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  listHoldings: async (query = {}) => {
    const qs = new URLSearchParams();
    if (query.search) qs.set('search', query.search);
    if (query.status) qs.set('status', query.status);
    if (query.firmId) qs.set('firmId', query.firmId);
    if (query.sortBy) qs.set('sortBy', query.sortBy);
    if (query.sortDir) qs.set('sortDir', query.sortDir);
    if (query.quality) qs.set('quality', query.quality);
    if (query.export) {
      qs.set('export', 'true');
    } else {
      // page is 0-based per the contract.
      qs.set('page', String(query.page ?? 0));
      qs.set('pageSize', String(query.pageSize ?? 50));
    }
    const env = await http.full<{ holdings: PEHolding[] }>(
      `${endpoints.pe.holdings}?${qs.toString()}`,
    );
    const meta = (env.meta ?? {}) as unknown as Partial<PEHoldingListMeta> & { export?: boolean };
    return {
      holdings: env.data.holdings,
      meta: {
        total: meta.total ?? env.data.holdings.length,
        page: meta.page ?? query.page ?? 0,
        pageSize: meta.pageSize ?? query.pageSize ?? 50,
      },
    };
  },

  exportHoldings: async (query = {}) => {
    const { holdings } = await peService.listHoldings({ ...query, export: true });
    if (typeof URL.createObjectURL !== 'function') return;
    const headers = [
      'Company',
      'Firm',
      'Sector',
      'Geography',
      'Status',
      'Founded Year',
      'Investment Date',
      'Est. Inv. Date',
      'Est. Confidence',
      'Exit Date',
      'Website',
      'PE Page',
      'Description',
      'Products & Services',
      'Keywords',
      'Last Seen',
    ];
    const esc = (v: string | number | null | undefined) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...holdings.map((h) => {
        const est =
          h.estimatedInvestmentMonth && h.estimatedInvestmentYear
            ? `${h.estimatedInvestmentMonth}/${h.estimatedInvestmentYear}`
            : (h.estimatedInvestmentYear ?? '');
        const exit = h.investmentStatus === 'current' ? '' : (h.exitDate ?? '');
        return [
          h.companyName,
          h.firmName,
          h.sector,
          h.geography,
          h.investmentStatus,
          h.foundingYear,
          h.investmentDate,
          est,
          h.estimatedInvestmentConfidence,
          exit,
          h.websiteUrl,
          h.peDetailUrl,
          h.aiDescription || h.description,
          (h.keyProductsServices ?? []).join('; '),
          (h.aiKeywords ?? []).join(', '),
          h.lastSeenAt,
        ]
          .map(esc)
          .join(',');
      }),
    ];
    const blob = new Blob(['\uFEFF', lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pe-holdings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  updateHolding: (id, patch) =>
    http<PEHolding>(endpoints.pe.holding(id), {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteHolding: async (id) => {
    await http.full(endpoints.pe.holding(id), { method: 'DELETE' });
  },

  getHoldingTeam: (id) => http<PEHoldingTeam>(endpoints.pe.holdingTeam(id)),

  getHoldingEnrichment: (id) => http<PEHoldingEnrichment>(endpoints.pe.holdingEnrichment(id)),

  aiEnrichHolding: (id) =>
    http<PEHoldingEnrichResult>(endpoints.pe.holdingAiEnrich(id), { method: 'POST' }),

  // --- People (F25.1/F25.2) ------------------------------------------------

  listPeople: async (query = {}) => {
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;
    const qs = new URLSearchParams();
    if (query.firmId) qs.set('firmId', query.firmId);
    if (query.search) qs.set('search', query.search);
    if (query.roleTag) qs.set('roleTag', query.roleTag);
    if (query.focusTag) qs.set('focusTag', query.focusTag);
    qs.set('limit', String(limit));
    qs.set('offset', String(offset));
    const env = await http.full<{ people: PEPersonRow[] }>(
      `${endpoints.pe.people}?${qs.toString()}`,
    );
    const meta = (env.meta ?? {}) as unknown as Partial<PEPeopleListMeta>;
    return {
      people: env.data.people,
      meta: {
        total: meta.total ?? env.data.people.length,
        limit: meta.limit ?? limit,
        offset: meta.offset ?? offset,
      },
    };
  },

  getPeopleSummary: () => http<PEPeopleSummary>(endpoints.pe.peopleSummary),

  scrapePeople: async (firmId) => {
    const env = await http.full<{ queued: boolean; jobId?: string }>(endpoints.pe.peopleScrape, {
      method: 'POST',
      body: JSON.stringify({ firmId }),
    });
    return { ...env.data, message: env.message ?? '' };
  },

  deletePerson: async (id) => {
    await http.full(endpoints.pe.person(id), { method: 'DELETE' });
  },

  flagPerson: (id, reason) =>
    http<PEPersonRow>(endpoints.pe.personFlag(id), {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    }),

  unflagPerson: (id) => http<PEPersonRow>(endpoints.pe.personUnflag(id), { method: 'POST' }),

  tagPeople: (opts = {}) => {
    const qs = new URLSearchParams();
    if (opts.retag) qs.set('retag', 'true');
    if (opts.firmId) qs.set('firmId', opts.firmId);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return http<PEPeopleBatchAccepted>(`${endpoints.pe.peopleTag}${suffix}`, { method: 'POST' });
  },

  tagFocus: (opts = {}) => {
    const suffix = opts.firmId ? `?firmId=${encodeURIComponent(opts.firmId)}` : '';
    return http<PEPeopleBatchAccepted>(`${endpoints.pe.peopleTagFocus}${suffix}`, {
      method: 'POST',
    });
  },

  previewFindEmails: (body = {}) =>
    http<PEPeopleDryRun>(endpoints.pe.peopleFindEmails, {
      method: 'POST',
      body: JSON.stringify({ ...body, dryRun: true }),
    }),

  findEmails: (body = {}) =>
    http<PEPeopleBatchAccepted>(endpoints.pe.peopleFindEmails, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  previewVerifyEmails: (body = {}) =>
    http<PEPeopleDryRun>(endpoints.pe.peopleVerifyEmails, {
      method: 'POST',
      body: JSON.stringify({ ...body, dryRun: true }),
    }),

  verifyEmails: (body = {}) =>
    http<PEPeopleBatchAccepted>(endpoints.pe.peopleVerifyEmails, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  contactEnrich: (firmIds) =>
    http<PEPeopleBatchAccepted>(endpoints.pe.peopleContactEnrich, {
      method: 'POST',
      body: JSON.stringify(firmIds && firmIds.length ? { firmIds } : {}),
    }),

  scrapeBatch: (firmIds) =>
    http<PEPeopleBatchAccepted>(endpoints.pe.peopleScrapeBatch, {
      method: 'POST',
      body: JSON.stringify(firmIds && firmIds.length ? { firmIds } : {}),
    }),

  scrapeByFirms: (firmIds) =>
    http<PEPeopleBatchAccepted>(endpoints.pe.peopleScrapeByFirms, {
      method: 'POST',
      body: JSON.stringify({ firmIds }),
    }),

  resolveExport: (urls) =>
    http<PEPeopleResolveResult>(endpoints.pe.peopleExportResolve, {
      method: 'POST',
      body: JSON.stringify({ urls }),
    }),

  exportPeople: async (firmIds) => {
    // CSV carve-out (not the JSON envelope): download the raw response through the http seam
    // (credentials + CSRF echoed) and trigger a browser save.
    const res = await http.download(endpoints.pe.peopleExport, {
      method: 'POST',
      body: JSON.stringify({ firmIds }),
    });
    const blob = await res.blob();
    if (typeof URL.createObjectURL !== 'function') return; // non-browser (test) env
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pe-people-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
