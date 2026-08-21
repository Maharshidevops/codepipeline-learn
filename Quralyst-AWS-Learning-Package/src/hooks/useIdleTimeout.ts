// Idle-session timeout (Phase 34). Tracks activity as a TIMESTAMP compared on a coarse interval
// (long timers are throttled in background tabs; timestamps survive that and laptop sleep — a
// wake past the deadline logs out on the first check, never showing a stale countdown). Activity
// in ANY tab resets all tabs via BroadcastChannel; idle logout broadcasts so every tab drops the
// session together. While a research job is streaming progress, idle logout is suspended (a
// 30-minute pipeline run is not "idle").
//
// Defaults: 45 min idle → warning dialog, 60 s grace → logout. Dev override for testing:
//   localStorage.setItem('quralyst.idleMs', '30000'); localStorage.setItem('quralyst.warnMs', '10000')
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/hooks/useConfirm';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { authService } from '@/services/api';
import { clearClientAuthCookies } from '@/lib/authCookies';
import { paths } from '@/routes/paths';

const DEFAULT_IDLE_MS = 45 * 60_000;
const DEFAULT_WARN_MS = 60_000;
const CHECK_INTERVAL_MS = 5_000;
const BROADCAST_THROTTLE_MS = 5_000;
const CHANNEL = 'quralyst-idle';

export type IdleAction = 'none' | 'warn' | 'logout';

/** Pure decision: what should happen given how long the user has been idle. */
export function computeIdleAction(
  now: number,
  lastActivityAt: number,
  idleMs: number,
  warnMs: number,
): IdleAction {
  const idleFor = now - lastActivityAt;
  if (idleFor >= idleMs + warnMs) return 'logout';
  if (idleFor >= idleMs) return 'warn';
  return 'none';
}

function devOverride(key: string, fallback: number): number {
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

export function useIdleTimeout(): void {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const lastActivityRef = useRef(Date.now());
  const lastBroadcastRef = useRef(0);
  const warningOpenRef = useRef(false);

  useEffect(() => {
    const idleMs = devOverride('quralyst.idleMs', DEFAULT_IDLE_MS);
    const warnMs = devOverride('quralyst.warnMs', DEFAULT_WARN_MS);

    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

    const doLogout = () => {
      channel?.postMessage({ type: 'logout' });
      void authService.logout().catch(() => {});
      clearClientAuthCookies();
      useAuthStore.getState().logout();
      void navigate(paths.auth.login);
    };

    const markActivity = (broadcast: boolean) => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (broadcast && channel && now - lastBroadcastRef.current >= BROADCAST_THROTTLE_MS) {
        lastBroadcastRef.current = now;
        channel.postMessage({ type: 'activity', ts: now });
      }
    };

    const onActivity = () => {
      // Activity while the warning is open does NOT extend the session — only the explicit
      // "Stay signed in" button does (same rule as Escape).
      if (warningOpenRef.current) return;
      markActivity(true);
    };

    channel?.addEventListener('message', (e: MessageEvent) => {
      const data = e.data as { type?: string; ts?: number };
      if (data?.type === 'activity' && typeof data.ts === 'number') {
        lastActivityRef.current = Math.max(lastActivityRef.current, data.ts);
      } else if (data?.type === 'logout') {
        clearClientAuthCookies();
        useAuthStore.getState().logout();
        void navigate(paths.auth.login);
      }
    });

    const openWarning = () => {
      warningOpenRef.current = true;
      void confirm({
        title: 'Are you still there?',
        message: `You'll be signed out in ${Math.round(warnMs / 1000)} seconds — stay signed in?`,
        confirmText: 'Stay signed in',
        cancelText: 'Sign out',
      }).then((stay) => {
        warningOpenRef.current = false;
        if (!useAuthStore.getState().isAuthenticated) return; // already idled out
        if (stay) markActivity(true);
        else doLogout();
      });
    };

    const check = () => {
      // Active research job → not idle (suspend by refreshing the activity timestamp).
      const progress = useProgressStore.getState();
      if (progress.processId !== null && !progress.finished) {
        markActivity(false);
        return;
      }
      const action = computeIdleAction(Date.now(), lastActivityRef.current, idleMs, warnMs);
      if (action === 'logout') {
        doLogout();
      } else if (action === 'warn' && !warningOpenRef.current) {
        openWarning();
      }
    };

    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'pointermove',
      'keydown',
      'wheel',
      'touchstart',
      'scroll',
    ];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    // Returning to the tab runs an immediate check (sleep/wake past the deadline → logout now).
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const timer = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(timer);
      channel?.close();
    };
    // confirm/navigate are stable (context fn + router hook); run once for the authed shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
