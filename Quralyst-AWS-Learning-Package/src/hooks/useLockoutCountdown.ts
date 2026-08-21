// Login-lockout countdown (Phase 32). Given a `lockedUntil` ISO timestamp, ticks once a second
// and reports the remaining time as mm:ss. Always recomputed from `lockedUntil - now` — never a
// decremented duration snapshot — so client clock skew or a backgrounded tab can't drift it.
import { useEffect, useState } from 'react';

function remainingMs(lockedUntil: string | null): number {
  if (!lockedUntil) return 0;
  return Math.max(0, new Date(lockedUntil).getTime() - Date.now());
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function useLockoutCountdown(lockedUntil: string | null) {
  const [msLeft, setMsLeft] = useState(() => remainingMs(lockedUntil));

  useEffect(() => {
    setMsLeft(remainingMs(lockedUntil));
    if (!lockedUntil) return;
    const timer = setInterval(() => {
      const ms = remainingMs(lockedUntil);
      setMsLeft(ms);
      if (ms <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  return {
    isLocked: msLeft > 0,
    countdown: formatCountdown(msLeft),
  };
}
