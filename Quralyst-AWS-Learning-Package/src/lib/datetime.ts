// Timezone-aware date formatting — port of base.html's QuralystTimezone (via Intl).
// Effective timezone = the user's saved tz (if any), else the browser tz.
import { useAuthStore } from '@/store/authStore';

function effectiveTimezone(): string | undefined {
  const userTz = useAuthStore.getState().currentUser?.profile.timezone;
  if (userTz) return userTz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Parse a backend timestamp, treating an offset-less one as UTC.
 *
 * F64: the API writes every timestamp with `datetime.utcnow()` — a UTC instant with no tzinfo.
 * While those were serialised bare (`2026-08-09T11:06:26.164850`), ECMA-262 said a date-time string
 * with NO offset is LOCAL time, so a UTC+5:30 browser read every timestamp in the product 5.5h in
 * the past — the "6h ago" on the queue, firm and holdings pages. The backend now marks them, which
 * is the real fix; this is the defence, so a future endpoint that regresses to a naive timestamp
 * cannot silently skew the UI again.
 *
 * Exported because the admin queue panels need the same rule for their own relative-age maths.
 */
export function parseBackendDate(utc: string | Date): Date {
  if (typeof utc !== 'string') return utc;
  // Date-only values ("2026-08-09") are left alone: no instant, so no timezone to apply.
  const isDateTime = utc.includes('T');
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(utc);
  return new Date(isDateTime && !hasOffset ? `${utc}Z` : utc);
}

function fmt(utc: string | Date, options: Intl.DateTimeFormatOptions): string {
  const date = parseBackendDate(utc);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: effectiveTimezone(), ...options }).format(
    date,
  );
}

export function formatDateTime(utc: string | Date): string {
  return fmt(utc, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTimeLong(utc: string | Date): string {
  return fmt(utc, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTimeShort(utc: string | Date): string {
  return fmt(utc, { year: 'numeric', month: 'short', day: 'numeric' });
}
