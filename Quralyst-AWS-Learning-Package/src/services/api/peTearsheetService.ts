// PE Tearsheets service (F40.2) — typed seam over /api/pe/tearsheets/*.
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Tearsheets. Types: `src/types/peTearsheet.ts`.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { CreateTearsheetBody, Tearsheet, TearsheetStats, TearsheetSummary } from '@/types';

export interface PETearsheetService {
  list(): Promise<TearsheetSummary[]>;
  get(id: string): Promise<Tearsheet>;
  create(body: CreateTearsheetBody): Promise<Tearsheet>;
  recent(): Promise<TearsheetSummary[]>;
  stats(): Promise<TearsheetStats>;
  delete(id: string): Promise<void>;
  cancel(id: string): Promise<Tearsheet>;
  rerun(id: string): Promise<Tearsheet>;
  rerunGamma(id: string): Promise<{ ok: boolean; gammaStatus: string; tearsheet?: Tearsheet }>;
  gammaPdfUrl(id: string, download?: boolean): string;
  gammaPptxUrl(id: string, download?: boolean): string;
  /**
   * Polished export bytes. These endpoints fall back to the JSON error envelope (404 no export,
   * 410 expired Gamma link, 502 proxy failure), so they must be fetched — never linked to — and
   * the caller gets an `ApiError` it can render. See `components/pe/tearsheet/openGammaPdf.ts`.
   */
  gammaPdfBlob(id: string): Promise<Blob>;
  gammaPptxBlob(id: string): Promise<Blob>;
}

export const peTearsheetService: PETearsheetService = {
  list: () => http<TearsheetSummary[]>(endpoints.pe.tearsheets),
  get: (id) => http<Tearsheet>(endpoints.pe.tearsheet(id)),
  create: (body) =>
    http<Tearsheet>(endpoints.pe.tearsheets, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  recent: () => http<TearsheetSummary[]>(endpoints.pe.tearsheetsRecent),
  stats: () => http<TearsheetStats>(endpoints.pe.tearsheetsStats),
  delete: (id) =>
    http<void>(endpoints.pe.tearsheet(id), {
      method: 'DELETE',
    }),
  cancel: (id) =>
    http<Tearsheet>(endpoints.pe.tearsheetCancel(id), {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  rerun: (id) =>
    http<Tearsheet>(endpoints.pe.tearsheetRerun(id), {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  rerunGamma: (id) =>
    http<{ ok: boolean; gammaStatus: string; tearsheet?: Tearsheet }>(
      endpoints.pe.tearsheetGammaRerun(id),
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    ),
  gammaPdfUrl: (id, download) => endpoints.pe.tearsheetGammaPdf(id, download),
  gammaPptxUrl: (id, download) => endpoints.pe.tearsheetGammaPptx(id, download),
  gammaPdfBlob: async (id) => {
    const res = await http.download(endpoints.pe.tearsheetGammaPdf(id));
    return res.blob();
  },
  gammaPptxBlob: async (id) => {
    const res = await http.download(endpoints.pe.tearsheetGammaPptx(id));
    return res.blob();
  },
};
