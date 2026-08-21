// Error-reporting seam (Phase 33) — strictly env-gated. With VITE_ERROR_REPORTING_DSN unset,
// initErrorReporting() no-ops and @sentry/react is NEVER imported: zero network calls, zero
// boot-time bundle weight (the dynamic import keeps Sentry in its own lazy chunk), and the
// toggle itself can never throw. Call sites use reportError() and never know whether reporting
// is on.
//
// CSP note (Phase 31): when a DSN is set on a CSP build, the Sentry ingest origin must be added
// to connect-src in vite.config.ts (and worker-src blob: for Session Replay).
import { config } from '@/config';

type SentryModule = typeof import('@sentry/react');
type AppLogLevel = 'debug' | 'info' | 'warn' | 'error';

let sentry: SentryModule | null = null;

function tracePropagationTargets(): Array<string | RegExp> {
  const targets: Array<string | RegExp> = ['localhost', /^\//];
  if (config.apiBaseUrl) targets.push(config.apiBaseUrl);
  return targets;
}

export async function initErrorReporting(): Promise<void> {
  if (!config.errorReportingDsn) return;
  try {
    const [Sentry, React, ReactRouterDOM] = await Promise.all([
      import('@sentry/react'),
      import('react'),
      import('react-router-dom'),
    ]);
    const { useEffect } = React;
    const { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } =
      ReactRouterDOM;

    const isDev = import.meta.env.DEV;

    Sentry.init({
      dsn: config.errorReportingDsn,
      release: import.meta.env.VITE_APP_VERSION ?? undefined,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes,
        }),
        Sentry.replayIntegration(),
        // Forward console.warn / console.error to Sentry Logs (enableLogs must be true).
        Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
      ],
      tracesSampleRate: isDev ? 1.0 : 0.05,
      tracePropagationTargets: tracePropagationTargets(),
      replaysSessionSampleRate: isDev ? 1.0 : 0.1,
      replaysOnErrorSampleRate: 1.0,
      enableLogs: true,
      enableMetrics: true,
      // PII scrub is the backstop, not the policy — call sites must not attach PII either.
      beforeSend(event) {
        if (event.user) {
          delete event.user.email;
          delete event.user.username;
          delete event.user.ip_address;
        }
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
        }
        return event;
      },
    });
    sentry = Sentry;
  } catch {
    // Offline first paint / chunk fetch failure must never break boot.
  }
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  try {
    sentry?.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* reporting must never throw into app code */
  }
}

/** Forward structured app logs to Sentry when reporting is on. No-op without a DSN or before init. */
export function shipLogToSentry(
  level: AppLogLevel,
  message: string,
  fields?: Record<string, unknown>,
): void {
  if (!sentry || level === 'debug') return;
  try {
    const logFn = sentry.logger[level];
    logFn(message, fields);
  } catch {
    /* reporting must never throw into app code */
  }
}

/** Diagnostic helper for /backend-connection-testing — emits a log + metric, then reports an error. */
export async function triggerSentryTestError(): Promise<void> {
  if (!config.errorReportingDsn) {
    throw new Error('Sentry is not configured (set VITE_ERROR_REPORTING_DSN).');
  }
  const Sentry = await import('@sentry/react');
  Sentry.logger.info('User triggered test error', {
    action: 'test_error_button_click',
  });
  Sentry.metrics.count('test_counter', 1);
  const error = new Error('This is your first error!');
  Sentry.captureException(error);
  throw error;
}
