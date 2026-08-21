// LoginPage — port of auth/login.html. Split auth shell + email/password form, "Continue with
// Google" (keep-logged-in → ?keep=1|0), the google-only hint banner (?google_hint=1), and OAuth
// callback errors (?error=work_email_required, etc.).
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell, { AuthCardHeader, BrandLeft } from '@/components/auth/AuthShell';
import { authService } from '@/services/api';
import { endpoints } from '@/services/endpoints';
import { config } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { useLockoutCountdown } from '@/hooks/useLockoutCountdown';
import { paths } from '@/routes/paths';
import { authLoginErrorMessage, getAuthErrorMessage, getLockedUntil } from '@/lib/authErrors';
import type { ApiError } from '@/types';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
});
type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const { error } = useToast();
  const showGoogleHint = searchParams.get('google_hint') === '1';
  const oauthErrorMessage = authLoginErrorMessage(searchParams.get('error'));

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const [remember, setRemember] = useState(false);

  // Login lockout (Phase 32): a 429 carries lockedUntil (ISO); show a live countdown and
  // disable submit until it expires.
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const { isLocked, countdown } = useLockoutCountdown(lockedUntil);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { user, token, expiresIn } = await authService.login(values);
      setLockedUntil(null);
      login(user, token, expiresIn);
      navigate(paths.processPreference);
    } catch (e) {
      const apiError = e as ApiError;
      if (apiError?.status === 429) {
        const locked = getLockedUntil(apiError);
        if (locked) {
          setLockedUntil(locked);
          return;
        }
        error('Sign in failed', getAuthErrorMessage(apiError));
        return;
      }
      if (apiError?.status === 403 && apiError.message) {
        error('Sign in failed', apiError.message);
        return;
      }
      if (apiError?.status === 401) {
        error('Sign in failed', 'Invalid email or password. Please try again.');
        return;
      }
      error(
        'Sign in failed',
        getAuthErrorMessage(apiError, 'Unable to sign in. Please try again.'),
      );
    }
  });

  // "Continue with Google": OAuth is a redirect flow, so this is a full-page navigation to the
  // backend initiator (GET /auth/login/google), which 302s the browser to Google. A fetch /
  // client-route nav can't follow the cross-origin redirect. `keep` carries the remember-me choice.
  const onGoogleClick = () => {
    const keep = watch('remember') || remember ? '1' : '0';
    window.location.href = `${config.apiBaseUrl}${endpoints.auth.googleLogin}?keep=${keep}`;
  };

  return (
    <AuthShell
      pageClass="login-page"
      left={
        <BrandLeft
          topLine="Sign In to"
          description="Quralyst is M&A focused AI copilot built specifically for M&A advisors and deal professionals."
        />
      }
      cardHeader={
        <AuthCardHeader
          title="Sign in"
          right={
            <>
              No Account ?<br />
              <Link to={paths.auth.signup}>Sign up</Link>
            </>
          }
        />
      }
    >
      <button
        type="button"
        className="google-btn"
        id="google-login-btn"
        data-hint={showGoogleHint ? 'true' : undefined}
        onClick={onGoogleClick}
      >
        <img src="/images/google-icon.svg" alt="Google" className="google-btn-icon" />
        <span>Continue with Google</span>
      </button>

      {oauthErrorMessage && (
        <div className="auth-oauth-error-banner" id="login-oauth-error-banner" role="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2" />
          </svg>
          {oauthErrorMessage}
        </div>
      )}

      <div className="auth-divider">
        <span>or sign in with email</span>
      </div>

      {showGoogleHint && (
        <div className="google-hint-banner" id="google-hint-banner">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          This account was registered with Google. Use the button above to sign in.
        </div>
      )}

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" placeholder="Email address" {...register('email')} />
          {errors.email && <div className="error">{errors.email.message}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Password"
            {...register('password')}
          />
          {errors.password && <div className="error">{errors.password.message}</div>}
        </div>
        <div className="auth-form-options">
          <label className="auth-form-options__remember" htmlFor="login-keep-logged-in">
            <input
              id="login-keep-logged-in"
              type="checkbox"
              {...register('remember', {
                onChange: (e) => setRemember(e.target.checked),
              })}
            />
            <span>Keep me logged in</span>
          </label>
          <div className="auth-form-options__forgot">
            <Link to={paths.auth.forgotPassword}>Forgot Password</Link>
          </div>
        </div>
        {isLocked && (
          <div className="error" role="alert" id="login-lockout-message">
            Too many attempts — try again in {countdown}
          </div>
        )}
        <button type="submit" className="auth-button" disabled={isSubmitting || isLocked}>
          Sign In
        </button>
      </form>
    </AuthShell>
  );
}
