import { describe, it, expect } from 'vitest';
import { gmapsNeedsLocation } from './gmapsGuard';

describe('gmapsNeedsLocation', () => {
  it('is false whenever GMaps is off (location is irrelevant)', () => {
    expect(gmapsNeedsLocation(false, [{ country: 'US' }])).toBe(false);
    expect(gmapsNeedsLocation(false, [])).toBe(false);
  });

  it('is true when GMaps is on but only a country (or nothing) is set', () => {
    expect(gmapsNeedsLocation(true, [{ country: 'United States' }])).toBe(true);
    expect(gmapsNeedsLocation(true, [{}])).toBe(true);
    expect(gmapsNeedsLocation(true, [])).toBe(true);
    expect(gmapsNeedsLocation(true, undefined)).toBe(true);
  });

  it('is false when any row has a state or city', () => {
    expect(gmapsNeedsLocation(true, [{ state: 'Texas' }])).toBe(false);
    expect(gmapsNeedsLocation(true, [{ city: 'Austin' }])).toBe(false);
    expect(gmapsNeedsLocation(true, [{ country: 'US' }, { state: 'Texas' }])).toBe(false);
  });

  it('treats whitespace-only state/city as empty', () => {
    expect(gmapsNeedsLocation(true, [{ state: '   ', city: '  ' }])).toBe(true);
  });
});
