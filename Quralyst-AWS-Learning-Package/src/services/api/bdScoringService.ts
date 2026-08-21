// BD Scoring service (F36.3). Typed seam over /api/bd-scoring/*.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  BdBenchmark,
  BdBulkResult,
  BdCompanyContext,
  BdCompanyCreateInput,
  BdCompanyUpdateInput,
  BdImportResult,
  BdScoredCompany,
  BdScoringTemplate,
  BdTemplateDraft,
  BdTemplateGenerateInput,
  BdTemplateWriteInput,
} from '@/types';

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export interface BdScoringService {
  listTemplates: (opts?: {
    targetUserType?: string;
    scoringDirection?: string;
  }) => Promise<{ templates: BdScoringTemplate[] }>;
  getTemplate: (id: string) => Promise<{ template: BdScoringTemplate }>;
  createTemplate: (body: BdTemplateWriteInput) => Promise<{ template: BdScoringTemplate }>;
  generateTemplate: (body: BdTemplateGenerateInput) => Promise<{ draft: BdTemplateDraft }>;
  updateTemplate: (
    id: string,
    body: BdTemplateWriteInput,
  ) => Promise<{ template: BdScoringTemplate }>;
  deleteTemplate: (id: string) => Promise<void>;
  listCompanies: (opts: {
    templateId: string;
    tier?: string;
    search?: string;
    listContext?: string;
  }) => Promise<{ companies: BdScoredCompany[] }>;
  getCompany: (id: string) => Promise<{ company: BdScoredCompany }>;
  createCompany: (body: BdCompanyCreateInput) => Promise<{ company: BdScoredCompany }>;
  updateCompany: (id: string, body: BdCompanyUpdateInput) => Promise<{ company: BdScoredCompany }>;
  deleteCompany: (id: string) => Promise<void>;
  importCsv: (templateId: string, file: File) => Promise<BdImportResult>;
  bulkFromRows: (templateId: string, rows: Record<string, unknown>[]) => Promise<BdBulkResult>;
  listContexts: (templateId: string) => Promise<{ contexts: BdCompanyContext[] }>;
  listBenchmarks: () => Promise<{ benchmarks: BdBenchmark[] }>;
}

export const bdScoringService: BdScoringService = {
  listTemplates: (opts = {}) =>
    http(
      `${endpoints.bdScoring.templates}${qs({
        target_user_type: opts.targetUserType,
        scoring_direction: opts.scoringDirection,
      })}`,
    ),

  getTemplate: (id) => http(endpoints.bdScoring.template(id)),

  createTemplate: (body) =>
    http(endpoints.bdScoring.templates, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  generateTemplate: (body) =>
    http(endpoints.bdScoring.generateTemplate, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateTemplate: (id, body) =>
    http(endpoints.bdScoring.template(id), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteTemplate: async (id) => {
    await http.full(endpoints.bdScoring.template(id), { method: 'DELETE' });
  },

  listCompanies: (opts) =>
    http(
      `${endpoints.bdScoring.companies}${qs({
        template_id: opts.templateId,
        tier: opts.tier,
        search: opts.search,
        list_context: opts.listContext,
      })}`,
    ),

  getCompany: (id) => http(endpoints.bdScoring.company(id)),

  createCompany: (body) =>
    http(endpoints.bdScoring.companies, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCompany: (id, body) =>
    http(endpoints.bdScoring.company(id), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteCompany: async (id) => {
    await http.full(endpoints.bdScoring.company(id), { method: 'DELETE' });
  },

  importCsv: (templateId, file) => {
    const form = new FormData();
    form.append('template_id', templateId);
    form.append('file', file);
    return http(endpoints.bdScoring.importCsv, { method: 'POST', body: form });
  },

  bulkFromRows: (templateId, rows) =>
    http(endpoints.bdScoring.bulkFromRows, {
      method: 'POST',
      body: JSON.stringify({ templateId, rows }),
    }),

  listContexts: (templateId) =>
    http(`${endpoints.bdScoring.contexts}${qs({ template_id: templateId })}`),

  listBenchmarks: () => http(endpoints.bdScoring.benchmarks),
};
