// Results service — previous-results history (tabbed/filtered/paginated), result detail (preview),
// summary stats, CRM rows + save, delete, and the download URL. Real impl hits the endpoints; MSW
// intercepts in mock mode (paginating/filtering to mirror /api/previous-results/<tab>).
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { PageMeta, ResultDetail, ResultSummary, ResultTab, SummaryStats } from '@/types';

export interface ResultsListFilters {
  page?: number;
  timeRange?: string; // all|today|yesterday|week|month|3months|6months|year
  sortBy?: string; // newest|oldest
  userFilter?: string; // all|me|<userId>
  filenameSearch?: string;
  filterType?: string[]; // has_business_query, has_industry, ...
}

export interface ResultsPagination {
  totalResults: number;
  page: number;
  totalPages: number;
  perPage: number;
  hasPrev: boolean;
  hasNext: boolean;
  prevNum?: number;
  nextNum?: number;
}

export interface ResultsListResponse {
  success: boolean;
  results: ResultSummary[];
  pagination: ResultsPagination;
  tabType: ResultTab;
}

export interface ResultUser {
  id: string;
  fullName: string;
}

export interface SummaryResponse {
  stats: SummaryStats;
  criteriaList: string[];
  processId: string;
  totalMatches: number;
  totalInputRecords: number;
}

export interface SaveCrmPayload {
  company_name: string;
  fields: Record<string, string>;
  result_id: string;
}
export interface MessageResult {
  success: boolean;
  message: string;
}

export interface SendRowEmailPayload {
  companyName: string;
  recipientEmail?: string;
  previewOnly?: boolean;
  customSubject?: string;
  customBodyPlain?: string;
  /** Must match signed-in work email (Reply-To) when sending (not needed for preview). */
  confirmSenderEmail?: string;
}

export interface SendRowEmailResult {
  success: boolean;
  message: string;
  mode?: string;
  subject?: string;
  bodyPlain?: string;
  senderEmail?: string;
  replyToEmail?: string;
  fromEmail?: string;
  recipientEmail?: string;
  warning?: string;
  requiresSenderConfirm?: boolean;
  directSendAvailable?: boolean;
  sent?: boolean;
}

// Fit Override (F6) — the four production scoring verdicts.
export type FitLabel = 'Fit' | 'Partial Fit' | 'No Fit' | 'Insufficient Info';

export interface FitOverridePayload {
  companyName: string;
  newFit: FitLabel;
  rationale?: string;
}

export interface FitOverrideResult {
  oldFit: string;
  newFit: string;
  fitOverridden: boolean;
  message: string;
}

export interface ResultsService {
  list(tab: ResultTab, filters: ResultsListFilters): Promise<ResultsListResponse>;
  listUsers(): Promise<{ success: boolean; users: ResultUser[] }>;
  get(id: string): Promise<ResultDetail>;
  getSummary(id: string): Promise<SummaryResponse>;
  getCrm(id: string): Promise<ResultDetail>;
  saveCrm(payload: SaveCrmPayload): Promise<MessageResult>;
  saveFitOverride(resultId: string, payload: FitOverridePayload): Promise<FitOverrideResult>;
  remove(id: string): Promise<MessageResult>;
  downloadUrl(id: string): string;
  getInputFilePreview(resultId: string, fileId: string): Promise<ResultDetail>;
  downloadInputFileUrl(resultId: string, fileId: string): string;
  sendRowEmail(resultId: string, payload: SendRowEmailPayload): Promise<SendRowEmailResult>;
}

export const resultsService: ResultsService = {
  // Phase 11: the list array is in `data`; pagination + tabType are in `meta`. Re-assemble the
  // existing ResultsListResponse so the page barely changes.
  list: async (tab, filters) => {
    const qs = new URLSearchParams();
    qs.set('page', String(filters.page ?? 1));
    if (filters.timeRange) qs.set('time_range', filters.timeRange);
    if (filters.sortBy) qs.set('sort_by', filters.sortBy);
    if (filters.userFilter) qs.set('user_filter', filters.userFilter);
    if (filters.filenameSearch) qs.set('filename_search', filters.filenameSearch);
    (filters.filterType ?? []).forEach((f) => qs.append('filter_type', f));
    const env = await http.full<ResultSummary[]>(`${endpoints.results.list(tab)}?${qs.toString()}`);
    const meta = (env.meta ?? {}) as { pagination?: PageMeta; tabType?: ResultTab };
    const p = meta.pagination ?? ({} as PageMeta);
    return {
      success: true,
      results: env.data,
      pagination: {
        totalResults: p.totalItems ?? 0,
        page: p.page ?? 1,
        totalPages: p.totalPages ?? 1,
        perPage: p.perPage ?? 0,
        hasPrev: Boolean(p.hasPrev),
        hasNext: Boolean(p.hasNext),
        prevNum: p.prevNum,
        nextNum: p.nextNum,
      },
      tabType: (meta.tabType ?? tab) as ResultTab,
    };
  },
  listUsers: async () => ({
    success: true,
    users: await http<ResultUser[]>(endpoints.results.users),
  }),
  get: (id) => http<ResultDetail>(endpoints.results.detail(id)),
  getSummary: (id) => http<SummaryResponse>(endpoints.results.summary(id)),
  getCrm: (id) => http<ResultDetail>(endpoints.results.crm(id)),
  saveCrm: async (payload) => {
    const env = await http.full(endpoints.results.saveManualFields, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { success: true, message: env.message ?? '' };
  },
  saveFitOverride: async (resultId, payload) => {
    const env = await http.full<{ oldFit: string; newFit: string; fitOverridden: boolean }>(
      endpoints.results.fitOverride(resultId),
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return {
      oldFit: env.data.oldFit,
      newFit: env.data.newFit,
      fitOverridden: env.data.fitOverridden,
      message: env.message ?? '',
    };
  },
  remove: async (id) => {
    const env = await http.full(endpoints.results.remove(id), { method: 'POST' });
    return { success: true, message: env.message ?? '' };
  },
  downloadUrl: (id) => endpoints.results.download(id),
  getInputFilePreview: (resultId, fileId) =>
    http<ResultDetail>(endpoints.results.inputFilePreview(resultId, fileId)),
  downloadInputFileUrl: (resultId, fileId) => endpoints.results.inputFileDownload(resultId, fileId),
  sendRowEmail: async (resultId, payload) => {
    const env = await http.full<{
      mode?: string;
      subject?: string;
      bodyPlain?: string;
      senderEmail?: string;
      replyToEmail?: string;
      fromEmail?: string;
      recipientEmail?: string;
      warning?: string;
      requiresSenderConfirm?: boolean;
      directSendAvailable?: boolean;
      sent?: boolean;
    }>(endpoints.results.sendRowEmail(resultId), {
      method: 'POST',
      body: JSON.stringify({
        company_name: payload.companyName,
        recipient_email: payload.recipientEmail,
        preview_only: payload.previewOnly ?? false,
        custom_subject: payload.customSubject,
        custom_body_plain: payload.customBodyPlain,
        confirm_sender_email: payload.confirmSenderEmail,
      }),
    });
    return {
      success: true,
      message: env.message ?? '',
      ...(env.data ?? {}),
    };
  },
};
