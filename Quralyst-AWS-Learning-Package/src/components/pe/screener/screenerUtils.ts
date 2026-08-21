// Non-component utilities for the PE Screener tabs (F29.2). Kept in a plain .ts module (separate
// from the .tsx presentational helpers) so react-refresh's component-only-export rule stays happy.
import { useEffect, useState } from 'react';

/** Debounce a value by `ms` (default 350) — used for free-text filters so we don't refetch per keystroke. */
export function useDebounce<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Format a $M magnitude, rolling into $B above 1000. */
export function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '—';
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${v}M`;
}

/** Format an inclusive [min,max] $M range; unbounded sides read as ≥/≤; both null ⇒ em dash. */
export function fmtRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${fmtMoney(min)} – ${fmtMoney(max)}`;
  if (min != null) return `≥ ${fmtMoney(min)}`;
  return `≤ ${fmtMoney(max)}`;
}

/** Trigger a client-side CSV download (BOM-prefixed for Excel). No-ops in a non-browser (test) env. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const escape = (v: string | number | null | undefined) =>
    `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
