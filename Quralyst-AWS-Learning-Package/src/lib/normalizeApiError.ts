// normalizeApiError (Phase 15) — maps an ApiError / unknown thrown value to a single user-friendly
// message string. Used by the global QueryClient error handler and available to the ErrorBoundary
// fallback. http.ts throws a plain ApiError ({ status, message }); the server's `message` can be a
// raw text/HTML body, so we prefer a status-based message and only surface short, plain server text.
import type { ApiError } from '@/types';

function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number' &&
    'message' in err
  );
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: 'We couldn’t find what you were looking for.',
  408: 'The request timed out. Please try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again.',
  502: 'The server is temporarily unavailable. Please try again.',
  503: 'The service is temporarily unavailable. Please try again.',
  504: 'The server took too long to respond. Please try again.',
};

const GENERIC = 'Something went wrong. Please try again.';

export function normalizeApiError(err: unknown): string {
  if (isApiError(err)) {
    const msg = typeof err.message === 'string' ? err.message.trim() : '';
    const plainServerMsg =
      msg && msg.length <= 200 && !msg.startsWith('<') && !msg.startsWith('{') ? msg : '';

    // 401 always maps to the session message (auth resilience), unless caller is an auth form.
    if (err.status === 401) return plainServerMsg || STATUS_MESSAGES[401];

    // Prefer the server's ban/limit text for rate limits (login lockout, password-change ban).
    if (err.status === 429) return plainServerMsg || STATUS_MESSAGES[429];

    if (plainServerMsg) return plainServerMsg;
    return STATUS_MESSAGES[err.status] ?? GENERIC;
  }
  if (err instanceof Error && err.message) return err.message;
  return GENERIC;
}
