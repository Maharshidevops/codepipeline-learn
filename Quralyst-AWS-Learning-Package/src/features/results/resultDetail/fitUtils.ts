import type { FitBucket, RowData } from './types';

export function cell(row: RowData, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

export function numCell(row: RowData, ...keys: string[]): number | null {
  const raw = cell(row, ...keys);
  if (!raw) return null;
  const n = parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Bucket a row into Fit / Partial / No Fit using Fit/No Fit + Score fallbacks. */
export function fitBucket(row: RowData): FitBucket {
  const v = cell(row, 'Fit/No Fit', 'fit_no_fit').toLowerCase();
  // Order matters: check partial before bare "fit", and "no" before "fit"
  // so "No Fit" / "Partial Fit" never collapse into Fit.
  if (v.includes('partial') || v.includes('maybe')) return 'partial';
  if (v.includes('no') || v.includes('insufficient')) return 'no';
  if (v.includes('fit') || v.includes('yes')) return 'fit';
  const s = numCell(row, 'Total Score', 'Score', 'score') ?? 0;
  if (s >= 7) return 'fit';
  if (s >= 4) return 'partial';
  return 'no';
}

export const FIT_META: Record<FitBucket, { label: string; className: string }> = {
  fit: {
    label: 'Fit',
    className: 'bg-success-subtle text-success-emphasis border border-success-subtle',
  },
  partial: {
    label: 'Partial',
    className: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
  },
  no: {
    label: 'No fit',
    className: 'bg-danger-subtle text-danger-emphasis border border-danger-subtle',
  },
};

const NO_INFO_RE =
  /^(?:not\s+disclosed(?:\s+in\s+source)?|undisclosed|not\s+available|not\s+provided|not\s+specified|not\s+found|not\s+reported|none(?:\s+found)?|no\s+information(?:\s+available)?|n\/?a|unknown|tbd)\b\.?$/i;

function isNoInfoClause(clause: string): boolean {
  const idx = clause.indexOf(':');
  const value = (idx >= 0 ? clause.slice(idx + 1) : clause)
    .trim()
    .replace(/^[-\u2013\u2014•]\s*/, '')
    .replace(/[.;,\s]+$/, '');
  return value === '' || NO_INFO_RE.test(value);
}

export function cleanInsightAnswer(raw: string): string {
  const text = (raw || '').trim();
  if (!text) return '';
  const numbered = /^\s*1\.\s+/.test(text);
  const items = numbered
    ? text.split(/\s*\d+\.\s+/)
    : text.replace(/^[-•]\s*/, '').split(/\s+[-•]\s+/);
  const cleanedItems = items
    .map((it) => it.trim())
    .filter(Boolean)
    .map((it) =>
      it
        .split(/;\s+/)
        .map((c) => c.trim())
        .filter(Boolean)
        .filter((c) => !isNoInfoClause(c))
        .join('; '),
    )
    .filter(Boolean);
  if (cleanedItems.length === 0) return '';
  return numbered
    ? cleanedItems.map((s, i) => `${i + 1}. ${s}`).join(' ')
    : cleanedItems.join(' • ');
}

export const CRM_STATUSES = [
  '',
  'Not contacted',
  'Contacted',
  'In discussion',
  'Qualified',
  'Passed',
  'Won',
];
