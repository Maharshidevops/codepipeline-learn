// Change-type metadata for the Activity feed (F31.2) — mirrors Replit Changes.tsx
// (QURALYST-20/artifacts/pe-scraper/src/pages/Changes.tsx). Labels/icons/descriptions drive the
// Market Pulse pills and ChangeItem rows. Wire vocabulary stays locked to PEChangeType
// (`added|removed|status_change|field_change`); Replit's `date_found` / `field_update` aliases are
// not in our contract — `field_change` covers field updates.
import type { PEChangeRow, PEChangeType, PEChangeTypeFilter } from '@/types';

export interface ChangeTypeMeta {
  label: string;
  /** Short filter-chip / select label. */
  filterLabel: string;
  icon: string;
  /** CSS modifier for badge/icon tones (added|removed|status|field). */
  tone: 'added' | 'removed' | 'status' | 'field';
  description: (c: PEChangeRow) => string;
}

export const CHANGE_META: Record<PEChangeType, ChangeTypeMeta> = {
  added: {
    label: 'New Addition',
    filterLabel: 'New additions',
    icon: 'bi-plus-circle',
    tone: 'added',
    description: (c) => `${c.companyName} was newly discovered in ${c.firmName}'s portfolio`,
  },
  removed: {
    label: 'No Longer Seen',
    filterLabel: 'No longer seen',
    icon: 'bi-dash-circle',
    tone: 'removed',
    description: (c) => `${c.companyName} was not found in ${c.firmName}'s latest scrape`,
  },
  status_change: {
    label: 'Status Change',
    filterLabel: 'Status changes',
    icon: 'bi-arrow-left-right',
    tone: 'status',
    description: (c) =>
      `${c.companyName} status changed from "${c.oldValue ?? '—'}" to "${c.newValue ?? '—'}"`,
  },
  field_change: {
    label: 'Field Updated',
    filterLabel: 'Field updates',
    icon: 'bi-arrow-repeat',
    tone: 'field',
    description: (c) =>
      `${c.companyName} ${c.fieldName ?? 'field'} changed from "${c.oldValue ?? '—'}" to "${c.newValue ?? '—'}"`,
  },
};

/** Type-filter select options (Replit CHANGE_TYPE_OPTIONS, contract vocabulary). */
export const CHANGE_TYPE_OPTIONS: { value: PEChangeTypeFilter; label: string }[] = [
  { value: 'all', label: 'All changes' },
  { value: 'added', label: CHANGE_META.added.filterLabel },
  { value: 'removed', label: CHANGE_META.removed.filterLabel },
  { value: 'status_change', label: CHANGE_META.status_change.filterLabel },
  { value: 'field_change', label: CHANGE_META.field_change.filterLabel },
];

/** Summary / Market Pulse label for a byType entry. */
export function summaryLabel(changeType: string): string {
  if (changeType in CHANGE_META) {
    return CHANGE_META[changeType as PEChangeType].label;
  }
  return changeType;
}

/** Group rows by calendar day (newest groups first — input is already reverse-chron). */
export function groupByDate(changes: PEChangeRow[]): [string, PEChangeRow[]][] {
  const groups: Record<string, PEChangeRow[]> = {};
  const order: string[] = [];
  for (const c of changes) {
    const d = new Date(c.detectedAt);
    const key = Number.isNaN(d.getTime())
      ? c.detectedAt
      : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(c);
  }
  return order.map((k) => [k, groups[k]]);
}

/** ISO datetime → relative phrase ("3 days ago"). Falls back to the raw string if unparseable. */
export function formatRelativeDetectedAt(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diffSec = Math.round((t - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
  return rtf.format(Math.round(diffSec / 31536000), 'year');
}

/** Absolute tooltip for the relative timestamp. */
export function formatAbsoluteDetectedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
