// Non-component utilities + label maps for the PE Talent Flow surface (F33.2). Kept in a plain .ts
// module (separate from the .tsx presentational helpers) so react-refresh's component-only-export rule
// stays happy. The confidence label/order maps drive the floor select + the tier chips.
import type { BadgeTone } from '@/components/ui';
import type { PEMoveConfidence } from '@/types';

export const CONFIDENCE_LABELS: Record<PEMoveConfidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Ascending rank order (low first) — floors are "≥ this tier". */
export const CONFIDENCE_ORDER: PEMoveConfidence[] = ['low', 'medium', 'high'];

/** Confidence → Badge tone (high=success, medium=info, low=secondary — mirrors the repo palette). */
export const CONFIDENCE_TONE: Record<PEMoveConfidence, BadgeTone> = {
  high: 'success',
  medium: 'info',
  low: 'secondary',
};

/** ISO datetime → compact "Jul 12, 2026"-style date. Null/blank/unparseable → em dash / raw string. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Number → locale string; null/undefined → em dash. */
export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

/** Signed net → "+3" / "−2" / "0" with an explicit sign for non-zero (minus sign, not hyphen). */
export function fmtNet(n: number): string {
  if (n > 0) return `+${n.toLocaleString()}`;
  if (n < 0) return `−${Math.abs(n).toLocaleString()}`;
  return '0';
}
