// Idle-timeout decision logic (Phase 34): timestamps, not timers — the same check that handles
// a background-throttled tab also handles a laptop waking past the deadline (straight to logout,
// never a stale countdown).
import { describe, it, expect } from 'vitest';
import { computeIdleAction } from './useIdleTimeout';

const IDLE = 45 * 60_000;
const WARN = 60_000;
const T0 = 1_000_000_000;

describe('computeIdleAction', () => {
  it('does nothing while active', () => {
    expect(computeIdleAction(T0 + 1_000, T0, IDLE, WARN)).toBe('none');
    expect(computeIdleAction(T0 + IDLE - 1, T0, IDLE, WARN)).toBe('none');
  });

  it('warns at the idle threshold', () => {
    expect(computeIdleAction(T0 + IDLE, T0, IDLE, WARN)).toBe('warn');
    expect(computeIdleAction(T0 + IDLE + WARN - 1, T0, IDLE, WARN)).toBe('warn');
  });

  it('logs out once the grace period lapses', () => {
    expect(computeIdleAction(T0 + IDLE + WARN, T0, IDLE, WARN)).toBe('logout');
  });

  it('wake-from-sleep far past the deadline goes straight to logout', () => {
    const eightHours = 8 * 60 * 60_000;
    expect(computeIdleAction(T0 + eightHours, T0, IDLE, WARN)).toBe('logout');
  });
});
