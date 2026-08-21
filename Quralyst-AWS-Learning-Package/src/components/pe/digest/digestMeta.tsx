// Digest category + importance presentation (F37.2) — reusable map for icon/badge/labels.
// Thresholds locked to vendored Digest.tsx: ≥75 High, ≥50 Notable, else Low.
/* eslint-disable react-refresh/only-export-components -- meta maps + badge helpers shared with digest pages */
import type { DigestCategory } from '@/types';

export const DIGEST_WINDOWS = [
  { value: '7d' as const, label: 'Last 7 days' },
  { value: '30d' as const, label: 'Last 30 days' },
  { value: '90d' as const, label: 'Last 90 days' },
  { value: 'all' as const, label: 'All time' },
];

export const CATEGORY_META: Record<
  DigestCategory,
  { label: string; icon: string; toneClass: string }
> = {
  new_investment: {
    label: 'New investments',
    icon: 'bi-graph-up-arrow',
    toneClass: 'digest-cat--new_investment',
  },
  rollup_addon: {
    label: 'Roll-up add-ons',
    icon: 'bi-layers',
    toneClass: 'digest-cat--rollup_addon',
  },
  exit: {
    label: 'Exits',
    icon: 'bi-door-open',
    toneClass: 'digest-cat--exit',
  },
  talent_move: {
    label: 'Talent moves',
    icon: 'bi-person-gear',
    toneClass: 'digest-cat--talent_move',
  },
  portfolio_update: {
    label: 'Portfolio updates',
    icon: 'bi-arrow-repeat',
    toneClass: 'digest-cat--portfolio_update',
  },
};

export function importanceTone(importance: number): {
  label: string;
  className: string;
  tone: 'high' | 'notable' | 'low';
} {
  if (importance >= 75) {
    return { label: 'High', className: 'digest-pill digest-pill--high', tone: 'high' };
  }
  if (importance >= 50) {
    return { label: 'Notable', className: 'digest-pill digest-pill--notable', tone: 'notable' };
  }
  return { label: 'Low', className: 'digest-pill digest-pill--low', tone: 'low' };
}

export function ImportanceBadge({ importance }: { importance: number }) {
  const tone = importanceTone(importance);
  return (
    <span className={tone.className} data-testid="digest-importance" data-tone={tone.tone}>
      {tone.label}
    </span>
  );
}

export function CategoryBadge({ category }: { category: DigestCategory }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.portfolio_update;
  return (
    <span
      className={`digest-pill ${meta.toneClass}`}
      data-testid="digest-category-badge"
      data-category={category}
    >
      <i className={`bi ${meta.icon}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function CategoryIcon({ category }: { category: DigestCategory }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.portfolio_update;
  return (
    <span
      className={`digest-category-icon ${meta.toneClass}`}
      aria-hidden="true"
      data-testid="digest-category-icon"
      data-category={category}
    >
      <i className={`bi ${meta.icon}`} />
    </span>
  );
}

/** Compact relative time (e.g. "2 days ago"); falls back to locale string. */
export function formatRelativeOccurredAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(-seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 60) return rtf.format(-days, 'day');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
