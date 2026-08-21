// MSW handlers for Outcome Tags & Scorecard (Tier A / A5) — in-memory store, per-result
// isolation. Defines the contract the FastAPI backend honors (see REF-API-CONTRACTS.md).
import { http } from 'msw';
import { ok } from '@/test/mocks/envelope';

interface StoredTag {
  resultId: string;
  firm_key: string;
  company_name: string;
  outcome: string;
  note: string;
}

let store: StoredTag[] = [];

export function resetOutcomesStore() {
  store = [];
}

// One populated run so the Scorecard page can exercise every section. Shape mirrors the current
// backend contract (run-bounded; SettledCounts are {won, lost}; overall aggregates + per-run title).
const scorecardFixture = () => {
  const matrix = {
    fit: { won: 3, lost: 1 },
    partial: { won: 0, lost: 0 },
    no: { won: 0, lost: 1 },
  };
  const score_bands = {
    '80-100': { total: 4, won: 3, lost: 1 },
    '60-79': { total: 1, won: 0, lost: 0 },
    '40-59': { total: 0, won: 0, lost: 0 },
    '0-39': { total: 1, won: 0, lost: 1 },
  };
  return {
    matrix,
    calibration: { fit: 0.75, partial: null, no: 0 },
    score_bands,
    won: 3,
    lost: 2,
    win_rate: 0.6,
    progression_rate: 0.5,
    won_ranks: [1, 3, 4],
    runs: [
      {
        result_id: 'run1',
        result_kind: 'processed',
        title: 'IT Services — US',
        matrix,
        total: 20,
        contacted: 6,
        advanced: 3,
        won: 3,
        lost: 2,
        win_rate: 0.6,
        progression_rate: 0.5,
        won_ranks: [1, 3, 4],
        score_bands,
      },
    ],
    runs_included: 1,
    runs_excluded_no_signal: 2,
    total_settled: 5,
    limit_runs: 50,
  };
};

export const outcomesHandlers = [
  // Scorecard MUST precede the parameterized routes so "scorecard" isn't read as a resultId.
  http.get('/api/scorecard', () => ok(scorecardFixture())),

  http.get('/api/outcomes/:resultId', ({ params }) =>
    ok({
      outcomes: store
        .filter((t) => t.resultId === params.resultId)
        .map((t) => ({
          firm_key: t.firm_key,
          company_name: t.company_name,
          resolved_outcome: t.outcome,
          source: 'manual',
          manual_outcome: t.outcome,
          note: t.note,
          predicted_fit: '',
        })),
    }),
  ),

  http.post('/api/outcomes/:resultId/:firmKey', async ({ params, request }) => {
    const body = (await request.json()) as {
      outcome: string;
      company_name?: string;
      note?: string;
    };
    const resultId = String(params.resultId);
    const firmKey = String(params.firmKey);
    store = store.filter((t) => !(t.resultId === resultId && t.firm_key === firmKey));
    store.push({
      resultId,
      firm_key: firmKey,
      company_name: body.company_name ?? '',
      outcome: body.outcome,
      note: body.note ?? '',
    });
    return ok(
      { outcome: { firm_key: firmKey, outcome: body.outcome, note: body.note ?? '' } },
      { message: 'Outcome saved.' },
    );
  }),

  http.delete('/api/outcomes/:resultId/:firmKey', ({ params }) => {
    store = store.filter(
      (t) => !(t.resultId === String(params.resultId) && t.firm_key === String(params.firmKey)),
    );
    return ok(null, { message: 'Outcome cleared.' });
  }),
];
