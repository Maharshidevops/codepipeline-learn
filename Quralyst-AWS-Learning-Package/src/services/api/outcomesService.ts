// Outcome Tags & Scorecard (Tier A / A5) — typed facade over http(). Analysts tag the real-world
// outcome of a company in a run; terminal outcomes feed the AI's scoring memory. Scorecard compares
// predicted fit vs actual outcome. See REF-API-CONTRACTS.md.
import { http } from '../http';
import { endpoints } from '../endpoints';

// Reference-parity ladder (2026-07-29): nda / loi / due_diligence collapsed into `in_progress`.
// Those finer states are derived from the deal pipeline and inline CRM, so the manual ladder does not
// re-express them.
export type OutcomeValue =
  | 'not_contacted'
  | 'contacted'
  | 'responded'
  | 'in_progress'
  | 'closed_won'
  | 'closed_lost'
  | 'dead';

export type ResultKind = 'processed' | 'financial';

/** Mirror of the backend's normalize_firm_key: lowercase, alphanumerics only. */
export function normalizeFirmKey(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const OUTCOME_LABELS: Record<OutcomeValue, string> = {
  not_contacted: 'Not contacted',
  contacted: 'Contacted',
  responded: 'Responded',
  in_progress: 'In progress',
  closed_won: 'Closed — Won',
  closed_lost: 'Closed — Lost',
  dead: 'Dead',
};

export interface ResolvedOutcome {
  firm_key: string;
  company_name: string;
  resolved_outcome: OutcomeValue;
  /** Where the outcome came from. Live sources (deal, crm) outrank a manual tag. */
  source: 'deal' | 'crm' | 'manual' | 'none';
  manual_outcome: OutcomeValue | null;
  note: string;
  predicted_fit: string;
  score?: number | null;
  rank?: number | null;
  deal_id?: string;
  record_id?: string;
}

/** Settled counts per predicted-fit bucket. Only won/lost enter the matrix — open outcomes do not. */
export type SettledCounts = Record<'won' | 'lost', number>;

export interface ScorecardMatrix {
  fit: SettledCounts;
  partial: SettledCounts;
  no: SettledCounts;
}

/** One score-band cell: settled won/lost plus the total firms that fell in the band. */
export interface ScoreBandCell {
  total: number;
  won: number;
  lost: number;
}

/** Score distribution keyed by band label ("80-100", "60-79", "40-59", "0-39"), high→low.
 *  Backend-ready; the Scorecard UI that renders it is a pending frontend task. Band EDGES are
 *  provisional — reconcile with the reference when wiring that page. */
export type ScoreBands = Record<string, ScoreBandCell>;

export interface ScorecardRun {
  result_id: string;
  result_kind: ResultKind;
  /** Human title of the buyer list (blank when unavailable). */
  title: string;
  matrix: ScorecardMatrix;
  total: number;
  contacted: number;
  advanced: number;
  won: number;
  lost: number;
  /** null when nothing has settled — distinct from a real 0% */
  win_rate: number | null;
  progression_rate: number | null;
  won_ranks: number[];
  score_bands: ScoreBands;
}

export interface Scorecard {
  matrix: ScorecardMatrix;
  /** Per-bucket won/(won+lost); null when that bucket is undecided. */
  calibration: Record<'fit' | 'partial' | 'no', number | null>;
  /** Overall settled outcomes by score band. */
  score_bands: ScoreBands;
  /** Overall KPIs (aggregated across runs). Rates are null when there is nothing to divide by. */
  won: number;
  lost: number;
  win_rate: number | null;
  progression_rate: number | null;
  /** 1-based score-descending ranks of every closed-won firm across the included runs. */
  won_ranks: number[];
  runs: ScorecardRun[];
  runs_included: number;
  runs_excluded_no_signal: number;
  total_settled: number;
  limit_runs: number;
}

export interface OutcomesService {
  list(resultId: string, kind?: ResultKind): Promise<ResolvedOutcome[]>;
  set(
    resultId: string,
    firmKey: string,
    input: { outcome: OutcomeValue; companyName?: string; note?: string; resultKind?: ResultKind },
  ): Promise<void>;
  clear(resultId: string, firmKey: string): Promise<void>;
  /** Run-bounded, not time-windowed: the N most relevant runs with real outcome signal. */
  scorecard(limitRuns?: number): Promise<Scorecard>;
}

export const outcomesService: OutcomesService = {
  list: async (resultId, kind = 'processed') => {
    const data = await http<{ outcomes: ResolvedOutcome[] }>(
      `${endpoints.outcomes.list(resultId)}?kind=${kind}`,
    );
    return data.outcomes;
  },
  set: async (resultId, firmKey, input) => {
    await http(endpoints.outcomes.set(resultId, encodeURIComponent(firmKey)), {
      method: 'POST',
      body: JSON.stringify({
        outcome: input.outcome,
        company_name: input.companyName,
        note: input.note,
        result_kind: input.resultKind ?? 'processed',
      }),
    });
  },
  clear: async (resultId, firmKey) => {
    await http(endpoints.outcomes.remove(resultId, encodeURIComponent(firmKey)), {
      method: 'DELETE',
    });
  },
  scorecard: async (limitRuns = 50) => {
    return http<Scorecard>(`${endpoints.outcomes.scorecard}?limitRuns=${limitRuns}`);
  },
};
