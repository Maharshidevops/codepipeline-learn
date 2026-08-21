// Non-component utilities + label maps for the IB Vertical surface (F34.4). Kept in a plain .ts module
// (separate from the .tsx presentational helpers) so react-refresh's component-only-export rule stays
// happy. Mirrors talentFlowUtils / screenerUtils formatting conventions.
import type { BadgeTone } from '@/components/ui';
import type { IBBankStatus, IBTransaction } from '@/types';

/** Bank status → Badge tone. */
export const BANK_STATUS_TONE: Record<IBBankStatus, BadgeTone> = {
  active: 'success',
  paused: 'secondary',
};

/** Freshness derived from `lastScrapedAt` (client-side; the IB bank shape carries no freshness field).
 *  never = never scraped, stale = >7 days, fresh = ≤7 days. */
export type IBFreshness = 'fresh' | 'stale' | 'never';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function freshnessOf(lastScrapedAt: string | null | undefined): IBFreshness {
  if (!lastScrapedAt) return 'never';
  const t = new Date(lastScrapedAt).getTime();
  if (Number.isNaN(t)) return 'never';
  return Date.now() - t > SEVEN_DAYS_MS ? 'stale' : 'fresh';
}

export const FRESHNESS_LABEL: Record<IBFreshness, string> = {
  fresh: 'Fresh',
  stale: 'Stale',
  never: 'Never',
};

export const FRESHNESS_TONE: Record<IBFreshness, BadgeTone> = {
  fresh: 'success',
  stale: 'warning',
  never: 'secondary',
};

/** ISO datetime → relative phrase ("3 days ago"). Empty when absent/unparseable. */
export function fmtRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.round((t - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(Math.round(diffSec), 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
  return rtf.format(Math.round(diffSec / 31536000), 'year');
}

/** ISO datetime → compact "Jul 12, 2026". Null/blank/unparseable → em dash / raw string. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** `dealDate` is ISO-PREFIXED TEXT (YYYY / YYYY-MM / YYYY-MM-DD), NOT a datetime — show it verbatim. */
export function fmtDealDate(deal: string | null | undefined): string {
  return deal && deal.trim() ? deal : '—';
}

/** Number → locale string; null/undefined → em dash. */
export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

/** Deal size: prefer the raw provenance string; else format the structured USD ints as a range. */
export function fmtDealSize(
  tx: Pick<IBTransaction, 'dealSize' | 'dealSizeMin' | 'dealSizeMax' | 'dealSizeExact'>,
): string {
  if (tx.dealSize && tx.dealSize.trim()) return tx.dealSize;
  if (tx.dealSizeExact != null) return fmtUsd(tx.dealSizeExact);
  if (tx.dealSizeMin != null && tx.dealSizeMax != null)
    return `${fmtUsd(tx.dealSizeMin)} – ${fmtUsd(tx.dealSizeMax)}`;
  if (tx.dealSizeMin != null) return `≥ ${fmtUsd(tx.dealSizeMin)}`;
  if (tx.dealSizeMax != null) return `≤ ${fmtUsd(tx.dealSizeMax)}`;
  return '—';
}

/** Absolute USD int → compact "$1.2B" / "$50M" / "$500K". */
export function fmtUsd(v: number | null | undefined): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

/** Time-window options for the league table (months, incl. "all"). */
export const LEAGUE_MONTHS_OPTIONS: { value: string; label: string }[] = [
  { value: '12', label: 'Last 12 months' },
  { value: '24', label: 'Last 24 months' },
  { value: '36', label: 'Last 36 months' },
  { value: 'all', label: 'All time' },
];
