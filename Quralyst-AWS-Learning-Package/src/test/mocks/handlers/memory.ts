// MSW handlers for Analyst Memory (Tier A / A2) — in-memory store. Explicit fields are user-edited;
// the system-learned lists (fit_corrections / outcome_signals) can be pruned one item at a time or
// cleared. Mirrors the FastAPI contract (app/routers/memory.py).
import { http } from 'msw';
import { ok, err } from '@/test/mocks/envelope';

type MemState = {
  liked_sectors: string[];
  disliked_sectors: string[];
  deal_type_preferences: string[];
  size_floor_notes: string;
  freeform_notes: string;
  frequent_sectors: string[];
  frequent_deal_types: string[];
  frequent_custom_insights: string[];
  fit_corrections: string[];
  outcome_signals: string[];
  updated_at: string | null;
};

const EMPTY: MemState = {
  liked_sectors: [],
  disliked_sectors: [],
  deal_type_preferences: [],
  size_floor_notes: '',
  freeform_notes: '',
  frequent_sectors: [],
  frequent_deal_types: [],
  frequent_custom_insights: [],
  fit_corrections: [],
  outcome_signals: [],
  updated_at: null,
};

let store: MemState = { ...EMPTY };
const MANAGED = ['fit_corrections', 'outcome_signals'] as const;
type Managed = (typeof MANAGED)[number];

/** Seed the store for a test (merged over the empty shape). */
export function seedMemoryStore(partial: Partial<MemState> = {}) {
  store = { ...EMPTY, ...partial };
}
export function resetMemoryStore() {
  store = { ...EMPTY };
}

export const memoryHandlers = [
  http.get('/api/memory', () => ok({ memory: store })),

  http.put('/api/memory', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<MemState>;
    store = { ...store, ...body };
    return ok({ memory: store }, { message: 'Preferences saved.' });
  }),

  // Order matters: the two-segment (index) route must be registered before the one-segment clear.
  http.delete('/api/memory/learned/:kind/:index', ({ params }) => {
    const kind = String(params.kind) as Managed;
    if (!MANAGED.includes(kind)) return err(400, 'Unknown learned list.');
    const idx = Number(params.index);
    const list = store[kind];
    if (idx < 0 || idx >= list.length) return err(404, 'No such learned item.');
    store = { ...store, [kind]: list.filter((_, i) => i !== idx) };
    return ok({ memory: store }, { message: 'Removed.' });
  }),

  http.delete('/api/memory/learned/:kind', ({ params }) => {
    const kind = String(params.kind) as Managed;
    if (!MANAGED.includes(kind)) return err(400, 'Unknown learned list.');
    const removed = store[kind].length;
    store = { ...store, [kind]: [] };
    return ok({ memory: store, removed }, { message: `Cleared ${removed} item(s).` });
  }),
];
