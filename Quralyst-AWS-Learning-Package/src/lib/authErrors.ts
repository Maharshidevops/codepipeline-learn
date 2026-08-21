// Auth-form error helpers — surface server ban/limit messages instead of generic "network error".
import type { ApiError } from '@/types';
import { normalizeApiError } from '@/lib/normalizeApiError';

export interface AuthMessageResult {
  success: boolean;
  message: string;
  lockedUntil?: string;
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as ApiError).status === 'number' &&
    'message' in err
  );
}

export function isLikelyNetworkFailure(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error && /failed to fetch|networkerror|load failed/i.test(err.message)) {
    return true;
  }
  return false;
}

export function getLockedUntil(err: unknown): string | null {
  if (!isApiError(err)) return null;
  const locked = err.meta?.lockedUntil;
  return typeof locked === 'string' && locked.length > 0 ? locked : null;
}

/** User-facing message for auth/password forms (bans, validation, lockouts). */
export function getAuthErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isLikelyNetworkFailure(err)) {
    return 'Unable to reach the server. Check your connection and try again.';
  }
  const msg = normalizeApiError(err);
  return msg || fallback;
}

// OAuth redirect query codes from GET /auth/google/callback → user-facing copy.
// Backend: Business-Research-Tool---Quralyst/app/routers/auth.py
const AUTH_LOGIN_ERROR_MESSAGES: Record<string, string> = {
  work_email_required:
    'Please use a work or business Google account. Personal email addresses (Gmail, etc.) are not accepted.',
  oauth_unconfigured:
    'Google sign-in is not configured. Please sign in with your email and password.',
  oauth_failed: 'Could not complete Google sign-in. Please try again.',
  oauth_email:
    'Your Google account email is not verified, or we could not read it. Please try again.',
  account_disabled: 'Your account has been disabled. Please contact support.',
  account_status: 'Invalid account status. Please contact support.',
  org_inactive: 'Your organization access is not active. Contact your organization administrator.',
};

/** Resolve ?error=… on /auth/login after an OAuth redirect. */
export function authLoginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return AUTH_LOGIN_ERROR_MESSAGES[code] ?? null;
}
