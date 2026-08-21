// Lockout countdown (Phase 32): mm:ss formatting + ticks recomputed from lockedUntil - now.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { formatCountdown, useLockoutCountdown } from './useLockoutCountdown';

describe('formatCountdown', () => {
  it('formats ms as m:ss', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(61_000)).toBe('1:01');
    expect(formatCountdown(754_000)).toBe('12:34');
  });
});

describe('useLockoutCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts down to expiry and unlocks', () => {
    const lockedUntil = new Date(Date.now() + 3_000).toISOString();
    const { result } = renderHook(() => useLockoutCountdown(lockedUntil));

    expect(result.current.isLocked).toBe(true);
    expect(result.current.countdown).toBe('0:03');

    act(() => void vi.advanceTimersByTime(2_000));
    expect(result.current.countdown).toBe('0:01');

    act(() => void vi.advanceTimersByTime(2_000));
    expect(result.current.isLocked).toBe(false);
  });

  it('is unlocked with no timestamp', () => {
    const { result } = renderHook(() => useLockoutCountdown(null));
    expect(result.current.isLocked).toBe(false);
  });

  it('recomputes from the timestamp, not a duration snapshot', () => {
    const lockedUntil = new Date(Date.now() + 10_000).toISOString();
    const { result } = renderHook(() => useLockoutCountdown(lockedUntil));
    // Simulate the tab being backgrounded: jump the clock 8s with a single tick.
    act(() => {
      vi.setSystemTime(Date.now() + 8_000);
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.countdown).toBe('0:01');
  });
});
