// Analyst Memory (Tier A / A2) — typed facade over http(). Per-user scoring preferences that the
// backend injects into business-fit prompts after the Knowledge Bank block. Explicit fields are
// user-editable; behavioral/calibration lists are system-managed (read-only here).
import { http } from '../http';
import { endpoints } from '../endpoints';

export interface UserMemory {
  liked_sectors: string[];
  disliked_sectors: string[];
  deal_type_preferences: string[];
  size_floor_notes: string;
  freeform_notes: string;
  // System-managed (read-only for the user):
  frequent_sectors: string[];
  frequent_deal_types: string[];
  frequent_custom_insights: string[];
  fit_corrections: string[];
  outcome_signals: string[];
  updated_at: string | null;
}

export interface UserMemoryUpdateInput {
  liked_sectors?: string[];
  disliked_sectors?: string[];
  deal_type_preferences?: string[];
  size_floor_notes?: string;
  freeform_notes?: string;
}

/** The system-learned lists a user may prune from the UI. */
export type LearnedKind = 'fit_corrections' | 'outcome_signals';

/** Behavioral-signal payloads (Tier A) — passive writes; the caller ignores failures. */
export interface FirmDismissalInput {
  firmName: string;
  firmWebsite?: string;
  reason?: string;
}
export interface MandateExamplesInput {
  intent: 'example-buyer-profile' | 'example-target-profile' | string;
  industry?: string;
  subIndustry?: string;
  idealBuyerTypes?: string[];
  examples?: { name?: string; website?: string }[];
}

export interface MemoryService {
  get(): Promise<UserMemory>;
  update(input: UserMemoryUpdateInput): Promise<{ memory: UserMemory; message: string }>;
  /** Remove one system-learned signal by its position; returns the refreshed memory. */
  deleteLearnedItem(kind: LearnedKind, index: number): Promise<UserMemory>;
  /** Clear all items from one system-learned list; returns the refreshed memory. */
  clearLearned(kind: LearnedKind): Promise<UserMemory>;
  /** Behavioral signal: analyst removed a buyer firm from the universe. Best-effort, never throws. */
  recordFirmDismissal(input: FirmDismissalInput): Promise<void>;
  /** Behavioral signal: example companies were profiled from a mandate. Best-effort, never throws. */
  recordMandateExamples(input: MandateExamplesInput): Promise<void>;
}

export const memoryService: MemoryService = {
  get: async () => {
    const data = await http<{ memory: UserMemory }>(endpoints.memory.get);
    return data.memory;
  },
  update: async (input) => {
    const env = await http.full<{ memory: UserMemory }>(endpoints.memory.update, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return { memory: env.data.memory, message: env.message ?? '' };
  },
  deleteLearnedItem: async (kind, index) => {
    const data = await http<{ memory: UserMemory }>(
      endpoints.memory.deleteLearnedItem(kind, index),
      { method: 'DELETE' },
    );
    return data.memory;
  },
  clearLearned: async (kind) => {
    const data = await http<{ memory: UserMemory }>(endpoints.memory.clearLearned(kind), {
      method: 'DELETE',
    });
    return data.memory;
  },
  recordFirmDismissal: async (input) => {
    // Best-effort behavioral signal — a failure must never surface to the user or block the removal.
    try {
      await http(endpoints.memory.firmDismissal, { method: 'POST', body: JSON.stringify(input) });
    } catch {
      /* swallow — the signal is passive */
    }
  },
  recordMandateExamples: async (input) => {
    try {
      await http(endpoints.memory.mandateExamples, { method: 'POST', body: JSON.stringify(input) });
    } catch {
      /* swallow — the signal is passive */
    }
  },
};
