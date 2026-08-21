// Firm Memory (Tier A / A4) — typed facade over http(). Per-PE-firm notes an org keeps about
// external private-equity firms; injected into Financial Verticals scoring when that firm is scored.
// Org-scoped; keyed by normalized firm name. See REF-API-CONTRACTS.md.
//
// Reference-parity rewrite (2026-07-29): the five structured mandate fields collapsed into a single
// freeform `team_notes`, and the holdings-derived `learned_pattern` (plus its /learn endpoints) is
// gone. Learning is now signal capture — four rolling lists the backend writes from real analyst
// activity. They are read-only here.
import { http } from '../http';
import { endpoints } from '../endpoints';

export interface FirmMemory {
  firm_key: string;
  firm_name: string;
  /** The analyst's freeform note about this buyer. */
  team_notes: string;
  updated_at: string | null;
  /** Stable identity — empty until the firm resolves in the PE dataset. */
  pe_firm_id?: string;
  firm_website?: string;
  // ── Captured signals (system-written, newest last, capped at 30 each) ──
  fit_corrections?: string[];
  outcome_signals?: string[];
  relationship_signals?: string[];
  commentary_signals?: string[];
}

/** The four system-written signal lists, in the order the scoring prompt renders them. */
export const SIGNAL_LISTS = [
  'fit_corrections',
  'outcome_signals',
  'relationship_signals',
  'commentary_signals',
] as const;

export type SignalList = (typeof SIGNAL_LISTS)[number];

/** Human labels for the signal lists — kept beside the keys so the UI can't drift from them. */
export const SIGNAL_LABELS: Record<SignalList, string> = {
  fit_corrections: 'Fit corrections',
  outcome_signals: 'Deal outcomes',
  relationship_signals: 'Outreach history',
  commentary_signals: 'Analyst commentary',
};

export interface FirmMemoryUpsertInput {
  firmName: string;
  teamNotes?: string;
  website?: string;
}

export interface FirmMemoryService {
  list(): Promise<FirmMemory[]>;
  get(firmKey: string): Promise<FirmMemory | null>;
  upsert(input: FirmMemoryUpsertInput): Promise<{ firmMemory: FirmMemory; message: string }>;
  remove(firmKey: string): Promise<{ message: string }>;
}

/** Total captured signals across all four lists — drives the "N signals" summary in the UI. */
export function signalCount(mem: FirmMemory): number {
  return SIGNAL_LISTS.reduce((sum, key) => sum + (mem[key]?.length ?? 0), 0);
}

export const firmMemoryService: FirmMemoryService = {
  list: async () => {
    const data = await http<{ firmMemories: FirmMemory[] }>(endpoints.firmMemory.list);
    return data.firmMemories ?? [];
  },
  get: async (firmKey) => {
    const data = await http<{ firmMemory: FirmMemory }>(endpoints.firmMemory.detail(firmKey));
    return data.firmMemory ?? null;
  },
  upsert: async (input) => {
    const env = await http.full<{ firmMemory: FirmMemory }>(endpoints.firmMemory.upsert, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return { firmMemory: env.data.firmMemory, message: env.message ?? '' };
  },
  remove: async (firmKey) => {
    const env = await http.full<null>(endpoints.firmMemory.remove(firmKey), {
      method: 'DELETE',
    });
    return { message: env.message ?? '' };
  },
};
