// Org Memory (Tier A / A3) — typed facade over http(). The firm-wide investment thesis, edited by
// org admins, injected into every member's scoring (before the personal Analyst Memory block).
// Plus system-aggregated deal-outcome signals (read-only). See REF-API-CONTRACTS.md.
import { http } from '../http';
import { endpoints } from '../endpoints';

export interface OrgAutoSignals {
  won_count?: number;
  lost_count?: number;
  dead_count?: number;
  top_won_sectors?: string[];
  summary_lines?: string[];
}

export interface OrgMemory {
  explicit_thesis: string;
  liked_sectors: string[];
  excluded_sectors: string[];
  liked_deal_types: string[];
  excluded_deal_types: string[];
  geo_focus: string[];
  size_notes: string;
  hard_exclusion_notes: string;
  auto_signals: OrgAutoSignals;
  auto_signals_updated_at: string | null;
  updated_at: string | null;
}

export interface OrgMemoryUpdateInput {
  explicit_thesis?: string;
  liked_sectors?: string[];
  excluded_sectors?: string[];
  liked_deal_types?: string[];
  excluded_deal_types?: string[];
  geo_focus?: string[];
  size_notes?: string;
  hard_exclusion_notes?: string;
}

export interface OrgMemoryResult {
  orgMemory: OrgMemory;
  canEdit: boolean;
}

export interface OrgMemoryService {
  get(): Promise<OrgMemoryResult>;
  update(input: OrgMemoryUpdateInput): Promise<{ orgMemory: OrgMemory; message: string }>;
  recalculate(): Promise<{ autoSignals: OrgAutoSignals; message: string }>;
}

export const orgMemoryService: OrgMemoryService = {
  get: async () => {
    const data = await http<{ orgMemory: OrgMemory; canEdit: boolean }>(endpoints.orgMemory.get);
    return { orgMemory: data.orgMemory, canEdit: data.canEdit };
  },
  update: async (input) => {
    const env = await http.full<{ orgMemory: OrgMemory }>(endpoints.orgMemory.update, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return { orgMemory: env.data.orgMemory, message: env.message ?? '' };
  },
  recalculate: async () => {
    const env = await http.full<{ autoSignals: OrgAutoSignals }>(endpoints.orgMemory.recalculate, {
      method: 'POST',
    });
    return { autoSignals: env.data.autoSignals, message: env.message ?? '' };
  },
};
