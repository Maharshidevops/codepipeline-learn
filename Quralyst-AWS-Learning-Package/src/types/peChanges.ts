// PE Activity Feed / Changes types (F31.2) — mirrors the backend contract exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Changes).
// Access is gated by the `pe:dataset` permission (staff or explicit per-user grant). These are the
// read-only DTOs served by /api/pe/changes + /api/pe/changes/summary — a reverse-chronological feed of
// detected portfolio activity on PE firm websites. All shapes are camelCase inside the standard
// `{data}` envelope.

// ---------------------------------------------------------------------------
// Change type vocabulary (locked to the F31 backend / reference route).
// `field_change` exists in the contract but no writer emits it yet — the UI hides the chip until F24/F26
// start emitting scrape-sourced field changes (see PHASE-F31.2).
// ---------------------------------------------------------------------------
export type PEChangeType = 'added' | 'removed' | 'status_change' | 'field_change';

/** The wire values the type filter forwards. `all` maps to "no `type` param"; `field_change` has no chip yet. */
export type PEChangeTypeFilter = 'all' | 'added' | 'removed' | 'status_change' | 'field_change';

// ---------------------------------------------------------------------------
// Feed row — GET /api/pe/changes
// ---------------------------------------------------------------------------
export interface PEChangeRow {
  id: string;
  firmId: string;
  firmName: string;
  /** null when a removal's delete was applied → companyName renders as plain text (no holding deep link). */
  holdingId: string | null;
  companyName: string;
  changeType: PEChangeType;
  /** Present only for `field_change`. */
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  /** ISO 8601 datetime. */
  detectedAt: string;
  scrapeJobId: string | null;
}

export interface PEChangesList {
  changes: PEChangeRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface PEChangesQuery {
  firmId?: string;
  /** `all|added|removed|status_change|field_change`; `all` omits the `type` param server-side. */
  type?: PEChangeTypeFilter;
  /** Default 100, max 500 (contract). */
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Summary — GET /api/pe/changes/summary
// ---------------------------------------------------------------------------
export interface PEChangesSummaryEntry {
  changeType: string;
  count: number;
}

export interface PEChangesSummary {
  byType: PEChangesSummaryEntry[];
  total: number;
}
