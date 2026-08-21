// PE Digest types (F37.2) — mirrors backend REF-API-CONTRACT.md §PE Dataset — Digest.
// Access gated by `pe:dataset`. CamelCase shapes inside the standard `{data}` envelope.
export type DigestWindow = '7d' | '30d' | '90d' | 'all';

export type DigestCategory =
  | 'new_investment'
  | 'rollup_addon'
  | 'exit'
  | 'talent_move'
  | 'portfolio_update';

/** Enrichment tags locked to F37 / ported digest.test.ts. */
export type DigestTag = 'Roll-up' | 'Thesis shift' | 'Exit-ready' | 'Watch' | 'Talent' | string;

export interface DigestEvent {
  id: string;
  headline: string;
  whyItMatters: string;
  tags: DigestTag[];
  category: DigestCategory;
  importance: number;
  /** ISO 8601 datetime (nullable when source timestamp missing). */
  occurredAt: string | null;
  firmId?: string | null;
  firmName?: string | null;
  holdingId?: string | null;
  /** Present on talent_move events only. */
  personId?: string | number | null;
}

export interface DigestGroup {
  category: DigestCategory;
  /** Human-readable section title (from backend; mirrors Replit DigestGroup.label). */
  label: string;
  count: number;
  events: DigestEvent[];
}

export interface DigestResponse {
  window?: DigestWindow;
  /** ISO 8601 when the digest was assembled. */
  generatedAt?: string;
  asOfYear?: number;
  groups: DigestGroup[];
  topEvents: DigestEvent[];
  totalEvents: number;
}
