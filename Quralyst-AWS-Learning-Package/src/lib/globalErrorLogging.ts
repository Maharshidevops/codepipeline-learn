// Phase 40 — surface otherwise-invisible uncaught errors. Window 'error' (uncaught exceptions,
// including those thrown in event handlers) and 'unhandledrejection' (dropped promise rejections)
// do NOT flow through React or the QueryClient, so without this they never reach the logger — and
// therefore never the dev terminal or Sentry. Registered once from main.tsx. Everything goes through
// the shared logger, so it inherits console passthrough, terminal shipping, and the never-throws rule.
import { logger } from '@/lib/logger';

function describeReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

let installed = false;

/** Idempotent — safe to call once at boot; a second call is a no-op. */
export function installGlobalErrorLogging(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    // Resource-load errors (img/script) fire here too with an empty message — still worth a line.
    logger.error('uncaught error', {
      message: event.message || 'unknown error',
      source: event.filename,
      line: event.lineno,
      col: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    logger.error('unhandled promise rejection', { reason: describeReason(event.reason) });
  });
}
