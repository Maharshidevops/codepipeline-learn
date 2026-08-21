// Frontend application logger (Phase 33). Console passthrough in dev; with VITE_LOG_SHIPPING on,
// entries accumulate in a ring buffer (cap 200, drop-oldest) and flush as a batch POST /api/logs
// every ~10s and on pagehide/visibilitychange via navigator.sendBeacon (survives tab kill).
// Backend re-emits each entry through its logger to CloudWatch (no DB; Phase 15) — tagged
// source=frontend, correlated by the cookie-resolved user + per-tab sessionId + route.
//
// HARD RULES: the logger must never throw or loop (shipping failures are swallowed, never logged
// through itself), and NEVER log tokens, passwords, API keys, or result data.
import { config } from '@/config';
import { shipLogToSentry } from '@/lib/reportError';
import { endpoints } from '@/services/endpoints';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  fields?: Record<string, unknown>;
  route: string;
  ts: string; // ISO
  sessionId: string; // per-tab
  userAgent: string;
}

const BUFFER_CAP = 200;
const FLUSH_INTERVAL_MS = 10_000;

// Per-tab session id — correlates one tab's entries without identifying the user.
const sessionId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Date.now());

let buffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function makeEntry(level: LogLevel, message: string, fields?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    fields,
    route: typeof window !== 'undefined' ? window.location.pathname : '',
    ts: new Date().toISOString(),
    sessionId,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

// Phase 40 — mirror the entry to the dev terminal via the /__client-log bridge (vite.config.ts).
// Dev-only, gated by the VITE_LOG_TO_TERMINAL toggle (off in tests/prod — see config.ts), fire-and-
// forget, and never recurses into the logger (plain fetch, swallowed rejection). `debug` is skipped
// to keep the terminal readable.
function shipToTerminal(entry: LogEntry): void {
  if (!import.meta.env.DEV || !config.logToTerminal || entry.level === 'debug') return;
  try {
    void fetch('/__client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch(() => {
      /* the terminal bridge is best-effort — a failure must never be logged through the logger */
    });
  } catch {
    /* the logger never throws */
  }
}

function push(entry: LogEntry): void {
  try {
    if (config.errorReportingDsn) {
      shipLogToSentry(entry.level, entry.message, entry.fields);
    }
    if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
      // Console passthrough in dev (shipping is usually off here anyway). Skipped under test
      // (MODE='test') so per-request logging doesn't flood — and slow — the test console.
      console[entry.level === 'debug' ? 'log' : entry.level](
        `[${entry.level}] ${entry.message}`,
        entry.fields ?? '',
      );
    }
    shipToTerminal(entry);
    if (!config.logShipping) return;
    buffer.push(entry);
    if (buffer.length > BUFFER_CAP) buffer = buffer.slice(buffer.length - BUFFER_CAP); // drop-oldest
    startTimer();
  } catch {
    /* the logger never throws */
  }
}

function startTimer(): void {
  if (flushTimer !== null) return;
  flushTimer = setInterval(() => flush(), FLUSH_INTERVAL_MS);
}

/** Flush the buffer. `useBeacon` on page teardown (sendBeacon survives the tab closing). */
export function flush(useBeacon = false): void {
  try {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    const url = config.apiBaseUrl + endpoints.logs.ship;
    const body = JSON.stringify({ entries: batch });
    if (useBeacon && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    }
    // Plain fetch (not http()): no auth/CSRF coupling, and a shipping failure must never recurse
    // into error handling. keepalive lets late flushes complete during unload.
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body,
    }).catch(() => {
      /* swallowed — never logged through itself */
    });
  } catch {
    /* the flush path never throws */
  }
}

function onPageHide(): void {
  flush(true);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) =>
    push(makeEntry('debug', message, fields)),
  info: (message: string, fields?: Record<string, unknown>) =>
    push(makeEntry('info', message, fields)),
  warn: (message: string, fields?: Record<string, unknown>) =>
    push(makeEntry('warn', message, fields)),
  error: (message: string, fields?: Record<string, unknown>) =>
    push(makeEntry('error', message, fields)),
};

// Test hooks — not for app code.
export function _getBuffer(): readonly LogEntry[] {
  return buffer;
}
export function _resetLogger(): void {
  buffer = [];
  if (flushTimer !== null) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}
