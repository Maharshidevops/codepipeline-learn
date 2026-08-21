// PE Dataset — Review Queue + Corrections types (F27.3). Mirrors the backend F27 routers
// (Business-Research-Tool---Quralyst app/routers/pe/review_queue.py + corrections.py and their
// services review_service.serialize / corrections_engine.serialize_*). CamelCase, unified
// envelope. Router access is `require_pe_access` (staff OR the pe:dataset grant); corrections
// rule enable/disable + a REAL apply are staff-only server-side (dry-run stays open to pe access).

// --- Review queue ----------------------------------------------------------

/** Item resolution state machine (reference: pending|approved|rejected|edited). */
export type PEReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited';

/** The three resolutions an operator can PATCH an item to. */
export type PEReviewResolveStatus = Exclude<PEReviewStatus, 'pending'>;

/**
 * A review-queue row (review_service.serialize). `payload` is the proposed change — for a
 * holding-correction item it carries the operator-editable holding fields
 * (companyName/sector/geography/investmentDate/investmentStatus/exitDate) that approve/edit
 * will write; for a hygiene/anomaly item it carries `{itemType, detail}`. Left as an open bag
 * because the vocabulary is reason-dependent.
 */
export interface PEReviewItem {
  id: string;
  recordType: string;
  recordId: string | null;
  firmId: string | null;
  reason: string | null;
  itemType: string | null;
  payload: Record<string, unknown>;
  contentHash: string | null;
  status: PEReviewStatus;
  reviewerNotes: string | null;
  resolvedAt: string | null;
  createdAt: string | null;
}

/** GET /api/pe/review-queue — items (newest-first, capped 200) + count. */
export interface PEReviewList {
  items: PEReviewItem[];
  total: number;
}

/** GET /api/pe/review-queue/stats — per-status counts + total + breakdowns. */
export interface PEReviewStats {
  pending: number;
  approved: number;
  rejected: number;
  edited: number;
  total: number;
  /** reason → count across ALL statuses. */
  byReason: Record<string, number>;
  /** recordType → count across ALL statuses. */
  byType: Record<string, number>;
}

/** PATCH /api/pe/review-queue/{id} body (the locked reference shape — no payload override). */
export interface PEReviewResolveBody {
  status: PEReviewResolveStatus;
  reviewerNotes?: string | null;
}

/** POST /api/pe/review-queue/bulk-approve result. */
export interface PEReviewBulkApproveResult {
  approved: number;
}

// --- Corrections + learned rules -------------------------------------------

export type PECorrectionScope = 'firm' | 'holding';
export type PECorrectionAction = 'edit' | 'delete';

/** A recorded manual correction (corrections_engine.serialize_correction). */
export interface PECorrection {
  id: string;
  at: string | null;
  scope: PECorrectionScope | string;
  action: PECorrectionAction | string;
  firmDomain: string;
  companyName: string | null;
  label: string | null;
  field: string | null;
  before: unknown;
  after: unknown;
}

export type PECorrectionRuleKind = 'pattern' | 'substitution';

/** A learned auto-fix rule (corrections_engine.serialize_rule). Ships disabled by default. */
export interface PECorrectionRule {
  id: string;
  kind: PECorrectionRuleKind | string;
  scope: PECorrectionScope | string;
  field: string | null;
  patternId: string | null;
  before: string | null;
  after: string | null;
  description: string | null;
  correctedCount: number;
  enabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** GET /api/pe/corrections — recent corrections + total + learned rules. */
export interface PECorrectionsStore {
  corrections: PECorrection[];
  totalCorrections: number;
  rules: PECorrectionRule[];
}

/** Per-mechanism fix counts from POST /api/pe/corrections/apply. */
export interface PECorrectionsApplyCounts {
  overridesDeleted: number;
  teamUrlSet: number;
  rostersReplaced: number;
  peopleWritten: number;
  correctionsApplied: number;
  correctionsDeleted: number;
  renamed: number;
  ruleFixes: number;
}

/** A sampled correction that would/did apply (dry-run blast-radius preview). */
export interface PECorrectionSample {
  firmDomain: string;
  companyName: string | null;
  field: string | null;
  after: unknown;
}

/** A sampled enabled-rule sweep hit. */
export interface PECorrectionRuleSample {
  ruleId: string;
  field?: string;
  pattern?: string;
  fixed: number;
}

/** POST /api/pe/corrections/apply result — `dry_run` writes nothing, `ok` applied. */
export interface PECorrectionsApplySummary {
  status: 'dry_run' | 'ok' | string;
  counts: PECorrectionsApplyCounts;
  samples: {
    corrections: PECorrectionSample[];
    rules: PECorrectionRuleSample[];
    unmatched: string[];
  };
}
