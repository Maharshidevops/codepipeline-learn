// F64 — parseBackendDate: the API writes every timestamp with `datetime.utcnow()` (a UTC instant
// with no tzinfo). While those serialised bare, ECMA-262 said a date-time string with NO offset is
// LOCAL time, so a UTC+5:30 browser read every timestamp in the product hours in the past — the
// "6h ago" on the queue, firm and holdings pages. The backend now marks them; this is the defence.
import { describe, it, expect } from 'vitest';
import { parseBackendDate } from './datetime';

describe('parseBackendDate', () => {
  it('treats an offset-less date-time as UTC', () => {
    expect(parseBackendDate('2026-08-09T11:06:26.164850').toISOString()).toBe(
      '2026-08-09T11:06:26.164Z',
    );
  });

  it('respects an explicit Z', () => {
    expect(parseBackendDate('2026-08-09T11:06:26Z').toISOString()).toBe('2026-08-09T11:06:26.000Z');
  });

  it('respects an explicit numeric offset', () => {
    // 16:36 +05:30 is the same instant as 11:06 UTC — it must not be re-stamped.
    expect(parseBackendDate('2026-08-09T16:36:26+05:30').toISOString()).toBe(
      '2026-08-09T11:06:26.000Z',
    );
  });

  it('leaves a date-only value alone', () => {
    // No instant, so no timezone to apply; JS already parses bare dates as UTC midnight.
    expect(parseBackendDate('2026-08-09').toISOString()).toBe('2026-08-09T00:00:00.000Z');
  });

  it('passes a Date through untouched', () => {
    const d = new Date('2026-08-09T11:06:26Z');
    expect(parseBackendDate(d)).toBe(d);
  });
});
