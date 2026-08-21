/** Shared types for Target/Strategic ResultDetail (Replit parity). */

export type FitBucket = 'fit' | 'partial' | 'no';
export type FitFilter = FitBucket | 'all';
export type SortMode = 'score-desc' | 'score-asc' | 'name-asc';
export type RowData = Record<string, string>;

/** A genuinely-comparable past settled deal, attached per-row by the backend (Tier A / A5).
 * Object or null; the string values are literal (snake_case, not camelized — rows are free-form).
 * Lives under the `comparable_deal` key of a row, alongside its string display columns. */
export interface ComparableDeal {
  name: string;
  outcome: string;
  outcome_label: string;
  why: string;
}

export type FixedColKind = 'link' | 'email';

export interface FixedCol {
  label: string;
  get: (r: RowData) => string;
  kind?: FixedColKind;
  width?: string;
}

export interface EnrichJobState {
  mode: 'contacts' | 'company_data' | 'all';
  total: number;
  done: number;
  skipped: number;
  failed: number;
  running: boolean;
  byCompany: Record<string, string>;
}
