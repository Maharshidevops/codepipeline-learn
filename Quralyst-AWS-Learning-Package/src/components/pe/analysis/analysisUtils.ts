// Non-component utilities + label maps for the PE Analysis Dashboard (F32.2). Kept in a plain .ts
// module (separate from the .tsx presentational helpers) so react-refresh's component-only-export rule
// stays happy. The window/segment label maps drive both the header selects and each card's one-line
// description echoing the active filters (reference Analysis.tsx pattern).
import type {
  PEAnalyticsSegment,
  PEAnalyticsWindow,
  PEMostActiveFirmRow,
  PERecentBySectorRow,
} from '@/types';

export const WINDOW_LABELS: Record<PEAnalyticsWindow, string> = {
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
  '24m': 'Last 24 months',
  all: 'All time',
};

export const SEGMENT_LABELS: Record<PEAnalyticsSegment, string> = {
  all: 'All firms',
  'lower-middle-market': 'Lower middle market',
  'middle-market': 'Middle market',
  'upper-middle-market': 'Upper middle market',
};

export const WINDOW_ORDER: PEAnalyticsWindow[] = ['3m', '6m', '12m', '24m', 'all'];
export const SEGMENT_ORDER: PEAnalyticsSegment[] = [
  'all',
  'lower-middle-market',
  'middle-market',
  'upper-middle-market',
];

/** A card's one-line description suffix echoing the active filters, e.g. "middle market, last 12 months". */
export function filterBlurb(window: PEAnalyticsWindow, segment: PEAnalyticsSegment): string {
  return `${SEGMENT_LABELS[segment].toLowerCase()}, ${WINDOW_LABELS[window].toLowerCase()}`;
}

/** Number → locale string; null/undefined → em dash. */
export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

/** A "size focus" blurb from a firm's revenue/EBITDA criteria ($M). Empty when nothing is stated. */
export function sizeBlurb(r: PEMostActiveFirmRow): string {
  const parts: string[] = [];
  if (r.ebitdaMin != null || r.ebitdaMax != null) {
    parts.push(`EBITDA $${r.ebitdaMin ?? '?'}–${r.ebitdaMax ?? '?'}M`);
  }
  if (r.revMin != null || r.revMax != null) {
    parts.push(`Rev $${r.revMin ?? '?'}–${r.revMax ?? '?'}M`);
  }
  return parts.join(' · ') || '—';
}

/** ISO datetime → compact "Jul 12, 2026"-style date. Falls back to the raw string when unparseable. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Group recent-by-sector rows into [sector, rows][] preserving the backend's sector ordering. */
export function groupBySector(rows: PERecentBySectorRow[]): [string, PERecentBySectorRow[]][] {
  const map = new Map<string, PERecentBySectorRow[]>();
  for (const r of rows) {
    const list = map.get(r.sector);
    if (list) list.push(r);
    else map.set(r.sector, [r]);
  }
  return Array.from(map.entries());
}
