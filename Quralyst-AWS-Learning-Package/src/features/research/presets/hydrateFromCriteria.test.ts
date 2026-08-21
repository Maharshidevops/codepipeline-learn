// hydrateFromCriteria (F7) — defensive preset hydration: applies known keys, drops stale ones.
import { describe, it, expect, vi } from 'vitest';
import { hydrateFromCriteria } from './hydrateFromCriteria';

describe('hydrateFromCriteria', () => {
  it('sets known keys and reports dropped (stale) keys', () => {
    const setValue = vi.fn();
    const getValues = () => ({ industry: '', sizeMin: '', geography: [] });

    const result = hydrateFromCriteria(
      { industry: 'Software', sizeMin: '5', removedField: 'x', anotherOld: 1 },
      getValues,
      setValue,
    );

    // Known keys applied.
    expect(setValue).toHaveBeenCalledWith('industry', 'Software', { shouldDirty: true });
    expect(setValue).toHaveBeenCalledWith('sizeMin', '5', { shouldDirty: true });
    // Unknown keys never touched.
    expect(setValue).not.toHaveBeenCalledWith('removedField', expect.anything(), expect.anything());
    expect(result.applied).toBe(2);
    expect(result.dropped.sort()).toEqual(['anotherOld', 'removedField']);
  });

  it('handles null/empty criteria without crashing', () => {
    const setValue = vi.fn();
    const r = hydrateFromCriteria(null, () => ({ a: 1 }), setValue);
    expect(setValue).not.toHaveBeenCalled();
    expect(r).toEqual({ applied: 0, dropped: [] });
  });
});
