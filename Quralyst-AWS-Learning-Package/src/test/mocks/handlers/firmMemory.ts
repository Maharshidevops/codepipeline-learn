// MSW handlers for Firm Memory (Tier A / A4) — in-memory store keyed by normalized firm name.
// Defines the contract the FastAPI backend honors (see REF-API-CONTRACTS.md).
//
// Reference-parity shape (2026-07-29): one freeform `team_notes` plus four system-written signal
// lists. The /learn endpoints are gone with the holdings-derived pattern.
import { http } from 'msw';
import { ok, err } from '@/test/mocks/envelope';

interface StoredFirm {
  firm_key: string;
  firm_name: string;
  team_notes: string;
  updated_at: string | null;
  pe_firm_id?: string;
  firm_website?: string;
  // Captured signals — written by the backend, read-only for the client.
  fit_corrections?: string[];
  outcome_signals?: string[];
  relationship_signals?: string[];
  commentary_signals?: string[];
}

let store: StoredFirm[] = [];

export function resetFirmMemoryStore() {
  store = [];
}

const normalizeKey = (name: string) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Mirrors the backend: the domain is stored normalized on every write.
const normalizeWebsite = (raw: string) =>
  (raw || '')
    .trim()
    .toLowerCase()
    .replace(/^\w+:\/\//, '')
    .split('/')[0]
    .replace(/^www\./, '');

export const firmMemoryHandlers = [
  http.get('/api/firm-memory', () => ok({ firmMemories: store })),

  http.get('/api/firm-memory/:firmKey', ({ params }) => {
    const found = store.find((f) => f.firm_key === String(params.firmKey));
    if (!found) return err(404, 'No memory for this firm.');
    return ok({ firmMemory: found });
  }),

  http.post('/api/firm-memory', async ({ request }) => {
    const body = (await request.json()) as {
      firmName?: string;
      teamNotes?: string;
      website?: string;
    };
    const firmName = (body.firmName ?? '').trim();
    const key = normalizeKey(firmName);
    if (!key) return err(400, 'firm_name (or firm_key) is required');
    if ((body.teamNotes ?? '').length > 4000) return err(400, 'team_notes exceeds 4000 characters');

    const existing = store.find((f) => f.firm_key === key);
    const website = body.website ? normalizeWebsite(body.website) : undefined;
    const record: StoredFirm = {
      ...existing,
      firm_key: key,
      firm_name: firmName,
      // Partial update: an omitted field must not blank the stored value.
      team_notes: body.teamNotes ?? existing?.team_notes ?? '',
      firm_website: website || existing?.firm_website,
      updated_at: null,
    };
    store = store.filter((f) => f.firm_key !== key);
    store.push(record);
    return ok({ firmMemory: record }, { message: 'Firm notes saved.' });
  }),

  http.delete('/api/firm-memory/:firmKey', ({ params }) => {
    const key = String(params.firmKey);
    const had = store.some((f) => f.firm_key === key);
    store = store.filter((f) => f.firm_key !== key);
    if (!had) return err(404, 'No memory to clear.');
    return ok(null, { message: 'Firm notes cleared.' });
  }),
];

/** Test helper: seed a firm that already carries system-captured signals. */
export function seedFirmWithSignals(firmName = 'Vista Equity Partners') {
  const key = normalizeKey(firmName);
  store = store.filter((f) => f.firm_key !== key);
  store.push({
    firm_key: key,
    firm_name: firmName,
    team_notes: 'Buys vertical SaaS.',
    updated_at: null,
    pe_firm_id: 'pe_abc123',
    firm_website: 'vistaequitypartners.com',
    fit_corrections: ['Promoted No Fit -> Fit for target: Acme HVAC (sector: HVAC)'],
    outcome_signals: [
      'Closed/Won: target Q3 mandate (predicted strong fit, confirmed by win; on 2026-07-28)',
    ],
    relationship_signals: ['Outreach: took a meeting (on 2026-07-28)'],
    commentary_signals: [],
  });
  return key;
}
