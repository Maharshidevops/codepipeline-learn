// Diff helper for the review-queue detail drawer (F27.3). A review item carries a proposed
// `payload` (the change approve/edit will write) but the backend does not embed the item's
// CURRENT record alongside it — so the drawer compares the proposed payload against whatever
// "current" values the payload itself pairs (a `{before, after}` bag, or a flat proposed bag).
// Every field present in the payload is what approve WILL write, so it is highlighted as changed.
import type { PEReviewItem } from '@/types';

/** camelCase payload key → human label for the operator-editable holding fields the backend
 *  applies on approve/edit (services/pe/review_service._PAYLOAD_FIELD_MAP). */
export const HOLDING_FIELD_LABELS: Record<string, string> = {
  companyName: 'Company name',
  sector: 'Sector',
  geography: 'Geography',
  investmentDate: 'Investment date',
  investmentStatus: 'Investment status',
  exitDate: 'Exit date',
};

export interface DiffRow {
  key: string;
  label: string;
  current: unknown;
  proposed: unknown;
  changed: boolean;
}

function label(key: string): string {
  return (
    HOLDING_FIELD_LABELS[key] ??
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
  );
}

/** Render a value for display; objects are JSON-stringified, null/undefined → em dash sentinel. */
export function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Build the diff rows for an item's payload. Two payload shapes are supported:
 *  - a `{ field: { before, after } }` bag → current = before, proposed = after;
 *  - a flat `{ field: value }` bag → proposed = value, current unknown (—), always "changed".
 * `itemType`/`detail` (hygiene/anomaly metadata) are surfaced separately, not as diff rows.
 */
export function buildDiff(item: PEReviewItem): DiffRow[] {
  const payload = item.payload ?? {};
  const rows: DiffRow[] = [];
  for (const [key, raw] of Object.entries(payload)) {
    if (key === 'itemType' || key === 'detail') continue;
    if (
      raw !== null &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      ('before' in (raw as object) || 'after' in (raw as object))
    ) {
      const bag = raw as { before?: unknown; after?: unknown };
      rows.push({
        key,
        label: label(key),
        current: bag.before ?? null,
        proposed: 'after' in bag ? bag.after : null,
        changed: displayValue(bag.before) !== displayValue(bag.after),
      });
    } else {
      rows.push({ key, label: label(key), current: null, proposed: raw, changed: true });
    }
  }
  return rows;
}

/** Metadata a hygiene/anomaly item carries in its payload (surfaced above the diff). */
export function payloadMeta(item: PEReviewItem): { itemType?: string; detail?: string } {
  const payload = item.payload ?? {};
  const out: { itemType?: string; detail?: string } = {};
  if (typeof payload.itemType === 'string') out.itemType = payload.itemType;
  if (typeof payload.detail === 'string') out.detail = payload.detail;
  return out;
}
