// MSW handlers for Search Templates (Tier A / A7 / F7) — in-memory store, mode-filtered list.
// Mirrors the FastAPI contract (see REF-API-CONTRACTS.md).
import { http } from 'msw';
import { ok, err } from '@/test/mocks/envelope';

interface StoredTemplate {
  id: string;
  name: string;
  mode: string;
  criteria: Record<string, unknown>;
  criteria_version: number;
  shared: boolean;
  owner_id: string;
  updated_at: string | null;
}

let store: StoredTemplate[] = [];
let nextId = 1;

export function resetSearchTemplatesStore() {
  store = [];
  nextId = 1;
}

export const searchTemplatesHandlers = [
  http.get('/api/search-templates', ({ request }) => {
    const mode = new URL(request.url).searchParams.get('mode');
    const list = mode ? store.filter((t) => t.mode === mode) : store;
    return ok({ templates: list });
  }),

  http.get('/api/search-templates/:id', ({ params }) => {
    const found = store.find((t) => t.id === String(params.id));
    if (!found) return err(404, 'Template not found.');
    return ok({ template: found });
  }),

  http.post('/api/search-templates', async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      mode: string;
      criteria?: Record<string, unknown>;
      shared?: boolean;
    };
    const key = (body.name ?? '').trim().toLowerCase();
    if (store.some((t) => t.mode === body.mode && t.name.trim().toLowerCase() === key)) {
      return err(409, `You already have a '${body.mode}' template named '${body.name}'`);
    }
    const rec: StoredTemplate = {
      id: `st_${nextId++}`,
      name: body.name,
      mode: body.mode,
      criteria: body.criteria ?? {},
      criteria_version: 1,
      shared: !!body.shared,
      owner_id: 'me',
      updated_at: null,
    };
    store.push(rec);
    return ok({ template: rec }, { message: 'Template saved.' });
  }),

  http.put('/api/search-templates/:id', async ({ params, request }) => {
    const rec = store.find((t) => t.id === String(params.id));
    if (!rec) return err(404, 'Template not found.');
    const body = (await request.json()) as {
      name?: string;
      criteria?: Record<string, unknown>;
      shared?: boolean;
    };
    if (body.name !== undefined) rec.name = body.name;
    if (body.criteria !== undefined) rec.criteria = body.criteria;
    if (body.shared !== undefined) rec.shared = body.shared;
    return ok({ template: rec }, { message: 'Template updated.' });
  }),

  http.delete('/api/search-templates/:id', ({ params }) => {
    const had = store.some((t) => t.id === String(params.id));
    store = store.filter((t) => t.id !== String(params.id));
    if (!had) return err(404, 'Template not found.');
    return ok(null, { message: 'Template deleted.' });
  }),
];
