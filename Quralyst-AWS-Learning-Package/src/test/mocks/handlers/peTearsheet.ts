// MSW handlers for PE Tearsheets (F40.2).
import { http, HttpResponse } from 'msw';
import { endpoints } from '@/services/endpoints';
import { err, ok } from '@/test/mocks/envelope';
import {
  mockTearsheetComplete,
  mockTearsheetFailed,
  mockTearsheetInflight,
  mockTearsheetPending,
  mockTearsheetSynthesizing,
} from '@/test/mocks/fixtures/peTearsheet';
import type { CreateTearsheetBody, Tearsheet } from '@/types';

const pollCounts = new Map<string, number>();

function nextPoll(id: string): number {
  const n = (pollCounts.get(id) ?? 0) + 1;
  pollCounts.set(id, n);
  return n;
}

function resolveCreate(companyName: string, website?: string): Tearsheet {
  const lower = companyName.toLowerCase();
  if (lower.includes('bad')) return { ...mockTearsheetFailed, companyName, website };
  if (lower.includes('widget')) return { ...mockTearsheetInflight, companyName, website };
  if (lower.includes('synth')) return { ...mockTearsheetSynthesizing, companyName, website };
  if (lower.includes('pending')) return { ...mockTearsheetPending, companyName, website };
  return { ...mockTearsheetComplete, companyName, website };
}

function resolveGet(row: Tearsheet): Tearsheet {
  if (row.status === 'complete' || row.status === 'failed') return row;
  const polls = nextPoll(row.id);
  if (row.id === 'ts-inflight' || row.companyName.toLowerCase().includes('widget')) {
    if (polls < 2) return { ...mockTearsheetInflight, ...row, status: 'researching' };
    if (polls < 3) return { ...mockTearsheetSynthesizing, ...row, status: 'synthesizing' };
    return { ...mockTearsheetComplete, ...row, status: 'complete' };
  }
  if (polls >= 2) return { ...mockTearsheetComplete, ...row, status: 'complete' };
  return row;
}

const store = new Map<string, Tearsheet>();

export const peTearsheetHandlers = [
  http.post(endpoints.pe.tearsheets, async ({ request }) => {
    const body = (await request.json()) as CreateTearsheetBody;
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
    if (!companyName) return err(400, 'companyName is required');
    const row = resolveCreate(companyName, body.website?.trim() || undefined);
    store.set(row.id, row);
    pollCounts.set(row.id, 0);
    return ok(row);
  }),

  // Static collection paths before `/tearsheets/:id` so "recent"/"stats" are not captured as ids.
  http.get(endpoints.pe.tearsheets, () => ok([])),
  http.get(endpoints.pe.tearsheetsStats, () =>
    ok({
      totalTearsheets: 1,
      completedTearsheets: 1,
      inProgressTearsheets: 0,
      failedTearsheets: 0,
      uniqueCompanies: 1,
      totalSources: 1,
    }),
  ),
  http.get(endpoints.pe.tearsheetsRecent, () =>
    ok([
      {
        id: mockTearsheetComplete.id,
        companyName: mockTearsheetComplete.companyName,
        website: mockTearsheetComplete.website,
        oneLiner: mockTearsheetComplete.content?.overview?.oneLiner,
        status: mockTearsheetComplete.status,
        createdAt: mockTearsheetComplete.createdAt,
        updatedAt: mockTearsheetComplete.updatedAt,
      },
    ]),
  ),

  http.get(endpoints.pe.tearsheet(':id'), ({ params }) => {
    const id = String(params.id);
    const existing = store.get(id);
    if (!existing) return err(404, 'Tearsheet not found');
    const row = resolveGet(existing);
    store.set(id, row);
    return ok(row);
  }),

  http.post(endpoints.pe.tearsheetRerun(':id'), ({ params }) => {
    const id = String(params.id);
    const existing = store.get(id) ?? { ...mockTearsheetComplete, id };
    const row: Tearsheet = {
      ...existing,
      status: 'pending',
      content: undefined,
      cost: undefined,
      errorMessage: undefined,
      gammaStatus: undefined,
      gammaUrl: undefined,
      gammaError: undefined,
      gammaPdfReady: false,
      sources: [],
      stages: (existing.stages ?? []).map((s) => ({
        ...s,
        status: 'pending',
        message: undefined,
      })),
    };
    store.set(id, row);
    pollCounts.set(id, 0);
    return ok(row);
  }),

  http.post(endpoints.pe.tearsheetCancel(':id'), ({ params }) => {
    const id = String(params.id);
    const existing = store.get(id) ?? { ...mockTearsheetInflight, id };
    const row: Tearsheet = {
      ...existing,
      status: 'cancelled',
      errorMessage: 'Cancelled by user',
      content: undefined,
      cost: undefined,
      stages: (existing.stages ?? []).map((s) =>
        s.status === 'pending' || s.status === 'running'
          ? { ...s, status: 'failed' as const, message: 'Cancelled' }
          : s,
      ),
    };
    store.set(id, row);
    return ok(row);
  }),

  // Polished export proxy. These stream bytes on success but fall back to the JSON error
  // envelope; an id containing "expired" reproduces the 410 the backend sends once the
  // upstream Gamma link dies.
  ...(['pdf', 'pptx'] as const).map((kind) =>
    http.get(
      kind === 'pdf'
        ? endpoints.pe.tearsheetGammaPdf(':id')
        : endpoints.pe.tearsheetGammaPptx(':id'),
      ({ params }) => {
        if (String(params.id).includes('expired')) {
          return err(
            410,
            `The Gamma ${kind === 'pdf' ? 'PDF' : 'PPTX'} link has expired. Rerun the tearsheet to regenerate it.`,
          );
        }
        return new HttpResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
          headers: {
            'Content-Type':
              kind === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          },
        });
      },
    ),
  ),

  http.post(endpoints.pe.tearsheetGammaRerun(':id'), ({ params }) => {
    const id = String(params.id);
    const existing = store.get(id) ?? { ...mockTearsheetComplete, id };
    const row: Tearsheet = {
      ...existing,
      gammaStatus: 'generating',
      gammaPdfReady: false,
      gammaUrl: undefined,
      gammaError: undefined,
    };
    store.set(id, row);
    return ok({ ok: true, gammaStatus: 'generating', tearsheet: row });
  }),
];
