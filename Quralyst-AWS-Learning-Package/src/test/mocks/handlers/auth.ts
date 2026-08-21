// MSW handlers for auth + bootstrap endpoints. See REF-API-CONTRACTS.md (Auth).
// Phase 11: responses use the uniform envelope (ok/err); the 429 lockout's `lockedUntil` is in meta.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok, err } from '@/test/mocks/envelope';
import { mockUser, mockMemberUser, mockToken } from '@/test/mocks/fixtures/users';

// Login lockout simulation (Phase 32): 5 failed attempts â†’ 429 with lockedUntil (ISO). The UI
// counts down from `lockedUntil - now` each tick (never a duration snapshot â€” clock-skew rule).
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 2 * 60 * 1000; // short for mock-mode demos; the real backend decides
let failedAttempts = 0;
let lockedUntil: number | null = null;

export function resetLoginLockout() {
  failedAttempts = 0;
  lockedUntil = null;
}

export const authHandlers = [
  http.get(endpoints.auth.currentUser, () => ok(mockUser)),

  http.post(endpoints.auth.login, async ({ request }) => {
    const body = (await request.json()) as { email?: string };

    if (lockedUntil !== null) {
      if (Date.now() < lockedUntil) {
        return err(429, 'Too many failed attempts.', {
          lockedUntil: new Date(lockedUntil).toISOString(),
        });
      }
      resetLoginLockout(); // lock expired
    }

    if (body?.email?.includes('fail')) {
      failedAttempts += 1;
      if (failedAttempts >= LOCKOUT_THRESHOLD) {
        lockedUntil = Date.now() + LOCKOUT_MS;
        return err(429, 'Too many failed attempts.', {
          lockedUntil: new Date(lockedUntil).toISOString(),
        });
      }
      return err(401, 'Invalid credentials');
    }

    failedAttempts = 0;
    // "member" in the email -> plain-member user (exercises ForbiddenPage + hidden admin links).
    const user = body?.email?.includes('member') ? mockMemberUser : mockUser;
    return ok({ user, token: mockToken, expiresIn: 1800, tokenType: 'Bearer' });
  }),

  http.post(endpoints.auth.refresh, () =>
    ok({ token: mockToken, expiresIn: 1800, tokenType: 'Bearer' }),
  ),

  http.post(endpoints.auth.logout, () => ok()),

  // Signup -> success popup with user details (email containing "fail" -> error).
  http.post(endpoints.auth.signup, async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
    };
    if (body?.email?.includes('fail')) {
      return err(400, 'That email is already registered.');
    }
    const name = [body?.firstName, body?.lastName].filter(Boolean).join(' ') || 'New User';
    return ok({
      signupSuccess: true,
      userDetails: {
        name,
        username: body?.username || (body?.email ?? '').split('@')[0],
        email: body?.email ?? '',
      },
    });
  }),

  // Forgot password -> data={success, message} (domain success, always 200). "fail" -> domain false.
  http.post(endpoints.auth.forgotPassword, async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (body?.email?.includes('fail')) {
      return ok({ success: false, message: 'No account found for that email.' });
    }
    return ok({
      success: true,
      message: 'If an account exists, a reset link has been sent to your email.',
    });
  }),

  // Reset password -> data={success, message} (domain success, always 200). Token "bad" -> false.
  http.post(endpoints.auth.resetPassword, async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (!body?.token || body.token === 'bad') {
      return ok({ success: false, message: 'This reset link is invalid or has expired.' });
    }
    return ok({ success: true, message: 'Your password has been reset. You can now sign in.' });
  }),

  // Google complete-org -> authenticated session (like login).
  http.post(endpoints.auth.googleCompleteOrg, () =>
    ok({ user: mockUser, token: mockToken, expiresIn: 1800, tokenType: 'Bearer' }),
  ),

  // Bootstrap poll used by base.html / process-preference on load.
  http.get(endpoints.profile.activeProcessing, () => ok({ active: false, completed: false })),
];
