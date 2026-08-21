// Research service — submits the three process-page wizards (multipart, returns {process_id}),
// the AI-assist helpers, and the "reuse filters" prefill. Components call this; MSW intercepts in
// dev, FastAPI serves later. Wizard form models map to the legacy snake_case form fields here.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { AiAutofillResult } from '@/types';

export interface StartResult {
  process_id: string;
  status?: string;
  session_id?: string;
}

/** Result of an FV database Excel upload (mirrors the legacy /database-creation JSON shape). */
export interface FvDatabaseUploadResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: { firms_processed?: number; sectors_updated?: number };
}

// Column Mapping Preview (F9).
export type MappingConfidence = 'high' | 'suggested' | 'override' | 'unmapped';

export interface MappingColumn {
  source: string;
  target: string;
  confidence: MappingConfidence;
}

export interface FileMappingPreview {
  filename: string;
  columns: MappingColumn[];
  blocked_outputs: string[];
  mappable_fields: string[];
  needs_confirmation: boolean;
  headerless: boolean;
  header_row: number; // detected/chosen 0-based header row (F9.5)
  row_count: number; // rows available to pick a header from
  raw_sample: string[][]; // first ~12 raw rows, for the header-row picker
  error?: string;
}

/** Column overrides, keyed by filename → { sourceColumn: targetField }. */
export type ColumnOverrides = Record<string, Record<string, string>>;
/** Header-row selection, keyed by filename → 0-based row index (F9.5). */
export type HeaderOverrides = Record<string, number>;

export interface ResearchService {
  /** Submit a built FormData payload to a process endpoint → returns the process id. */
  submitTargetList(form: FormData): Promise<StartResult>;
  /** F9 — preview how each file's columns map to standard fields (no run started). */
  previewMapping(
    files: File[],
    columnOverrides?: ColumnOverrides,
    headerOverrides?: HeaderOverrides,
  ): Promise<FileMappingPreview[]>;
  submitStrategic(form: FormData): Promise<StartResult>;
  submitFinancialVerticals(form: FormData): Promise<StartResult>;
  /** Upload an Excel file of PE-firm data to (re)build the Financial Verticals database. */
  uploadFinancialVerticalsDatabase(form: FormData): Promise<FvDatabaseUploadResult>;
  /** AI-assist (mock canned data). */
  autofill(companyName: string): Promise<AiAutofillResult>;
  enhanceBusinessQuery(text: string): Promise<{ enhanced: string }>;
  buyerRecommendation(prompt: string): Promise<{ recommendation: string; buyers: string[] }>;
  // AI mandate helpers (F10) — each returns text/fields to drop into the wizard.
  enhanceTargetDescription(input: {
    description: string;
    idealBuyerTypes?: string[];
    industry?: string;
  }): Promise<{ description: string }>;
  describeFromWebsite(url: string): Promise<{ description: string; suggested_industry?: string }>;
  describeFromPdf(file: File): Promise<{ description: string }>;
  suggestIndustry(input: {
    description: string;
    industries?: string[];
    subIndustriesMap?: Record<string, string[]>;
  }): Promise<{ industry: string; subIndustry: string }>;
  /** Hydrate a wizard from a prior result's filters. */
  reuseFilters(resultId: string): Promise<Record<string, unknown>>;
}

const postForm = (path: string, form: FormData) =>
  http<StartResult>(path, { method: 'POST', body: form });

export const researchService: ResearchService = {
  submitTargetList: (form) => postForm(endpoints.research.targetList, form),
  previewMapping: async (files, columnOverrides, headerOverrides) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    if (columnOverrides && Object.keys(columnOverrides).length) {
      fd.append('column_overrides', JSON.stringify(columnOverrides));
    }
    if (headerOverrides && Object.keys(headerOverrides).length) {
      fd.append('header_overrides', JSON.stringify(headerOverrides));
    }
    const data = await http<{ files: FileMappingPreview[] }>(endpoints.research.previewMapping, {
      method: 'POST',
      body: fd,
    });
    return data.files ?? [];
  },
  submitStrategic: (form) => postForm(endpoints.research.strategic, form),
  submitFinancialVerticals: (form) => postForm(endpoints.research.financialVerticals, form),
  // Phase 11: success → data={firmsProcessed, sectorsUpdated, sessionId} + message; failures THROW
  // (the page catches them). Re-assemble the legacy FvDatabaseUploadResult shape.
  uploadFinancialVerticalsDatabase: async (form) => {
    const env = await http.full<{
      firmsProcessed?: number;
      sectorsUpdated?: number;
      sessionId?: string;
    }>(endpoints.research.financialVerticalsDatabase, { method: 'POST', body: form });
    return {
      success: true,
      message: env.message ?? undefined,
      data: {
        firms_processed: env.data?.firmsProcessed,
        sectors_updated: env.data?.sectorsUpdated,
      },
    };
  },
  autofill: (companyName) =>
    http<AiAutofillResult>(endpoints.research.extractFormCriteria, {
      method: 'POST',
      body: JSON.stringify({ text: companyName }),
    }),
  enhanceBusinessQuery: (text) =>
    http<{ enhanced: string }>(endpoints.research.enhanceBusinessQuery, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  buyerRecommendation: (prompt) =>
    http<{ recommendation: string; buyers: string[] }>(endpoints.research.buyerRecommendation, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
  reuseFilters: (resultId) =>
    http<Record<string, unknown>>(
      `${endpoints.research.reuseFilters}?result_id=${encodeURIComponent(resultId)}`,
    ),
  enhanceTargetDescription: (input) =>
    http<{ description: string }>(endpoints.research.enhanceTargetDescription, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  describeFromWebsite: (url) =>
    http<{ description: string; suggested_industry?: string }>(
      endpoints.research.describeFromWebsite,
      { method: 'POST', body: JSON.stringify({ url }) },
    ),
  describeFromPdf: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http<{ description: string }>(endpoints.research.describeFromPdf, {
      method: 'POST',
      body: fd,
    });
  },
  suggestIndustry: (input) =>
    http<{ industry: string; subIndustry: string }>(endpoints.research.suggestIndustry, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
