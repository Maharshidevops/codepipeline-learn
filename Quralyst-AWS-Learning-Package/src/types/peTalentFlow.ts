// PE Talent Flow types (F33.2) — mirror the backend contract shapes exactly
// (Business-Research-Tool---Quralyst Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Talent Flow
// (Tier C, F33)). Access is gated by the `pe:dataset` permission (staff or explicit per-user grant).
// These are the read-only DTOs served by the two /api/pe/talent-flow + /api/pe/people/{id}/history
// endpoints — detected cross-firm professional moves + per-person career history over the
// platform-global PE dataset. All shapes are camelCase inside the standard `{data}` envelope.

// ---------------------------------------------------------------------------
// Shared vocabularies (locked to the backend / reference route).
// ---------------------------------------------------------------------------
/** Confidence tier for a detected move. Rank: low < medium < high. */
export type PEMoveConfidence = 'low' | 'medium' | 'high';

/** The confidence floor filtering the moves feed. Default `medium` (matches the backend;
 *  choosing `low` reveals the hidden tier). Invalid values coerce to `medium` server-side. */
export interface PETalentFlowParams {
  /** Minimum confidence tier to include (default `medium`). */
  confidence?: PEMoveConfidence;
  /** Firm id — matches EITHER side of a move (from or to). */
  firmId?: string;
  /** Case-insensitive substring on the person name. */
  search?: string;
  /** Row cap (default 200, max 1000). */
  limit?: number;
}

// ---------------------------------------------------------------------------
// moves — GET /api/pe/talent-flow/moves
// ---------------------------------------------------------------------------
/** One detected cross-firm move. PII posture: names/titles only — no emails/phones. */
export interface PETalentMove {
  id: string;
  personKey: string;
  personName: string;
  fromFirmId: string;
  fromFirmName: string | null;
  toFirmId: string;
  toFirmName: string | null;
  /** ISO 8601 datetime — origin `lastSeenAt`. Nullable. */
  departedAt: string | null;
  /** ISO 8601 datetime — destination `firstSeenAt`. Nullable. */
  arrivedAt: string | null;
  confidence: PEMoveConfidence;
  linkedinMatch: boolean;
  reasons: string[];
  detectedAt: string;
  lastDetectedAt: string;
}

/** Tier counts computed over ALL moves before the floor filter (constant across floor changes). */
export interface PETalentFlowCounts {
  high: number;
  medium: number;
  low: number;
}

/** A per-firm net-flow summary row (top gainers/losers). */
export interface PEFirmFlow {
  firmId: string;
  firmName: string | null;
  arrivals: number;
  departures: number;
  /** Signed net = arrivals − departures. */
  net: number;
}

export interface PETalentFlowMoves {
  moves: PETalentMove[];
  /** Filtered count pre-limit. */
  total: number;
  counts: PETalentFlowCounts;
  minConfidence: PEMoveConfidence;
  /** Top-8 firms by net, `net > 0`. */
  topGainers: PEFirmFlow[];
  /** Top-8 firms by net, `net < 0`. */
  topLosers: PEFirmFlow[];
}

// ---------------------------------------------------------------------------
// person history — GET /api/pe/people/{id}/history
// ---------------------------------------------------------------------------
/** One tenure at a firm (first-seen order). */
export interface PETenure {
  firmId: string;
  firmName: string | null;
  personName: string;
  title: string | null;
  roleTag: string | null;
  linkedinUrl: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

export interface PEPersonHistory {
  tenures: PETenure[];
  /** Moves between consecutive tenures — same shape as the feed. */
  moves: PETalentMove[];
  /** Whether the anchor record has a LinkedIn URL (verified identity vs. name-matched fallback). */
  linkedinAnchored: boolean;
}
