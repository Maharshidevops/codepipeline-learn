// ForgotPasswordPage — port of auth/forgot_password.html. Async POST → {success,message}; on
// success clears the email and starts a 30s resend cooldown ("Resend in Ns" → "Resend Link").
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell, { AuthCardHeader, RecoveryLeft } from '@/components/auth/AuthShell';
import Spinner from '@/components/ui/Spinner/Spinner';
import { authService } from '@/services/api';
import { paths } from '@/routes/paths';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timerRef.current), []);

  const startCooldown = () => {
    setCooldown(30);
    window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCooldown((t) => {
        if (t <= 1) {
          window.clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const data = await authService.forgotPassword({ email });
      setMessage({ success: data.success, text: data.message });
      if (data.success) {
        setEmail('');
        startCooldown();
      }
    } catch (err) {
      setMessage({
        success: false,
        text: getAuthErrorMessage(err, 'Unable to send reset email. Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const btnText =
    cooldown > 0 ? `Resend in ${cooldown}s` : message?.success ? 'Resend Link' : 'Send Reset Link';
  const btnDisabled = loading || cooldown > 0;

  return (
    <AuthShell
      pageClass="recovery-page"
      left={
        <RecoveryLeft
          title="Reset your password"
          text="Secure access to your Quralyst workspace in a few quick steps."
        />
      }
      cardHeader={
        <AuthCardHeader
          title="Forgot Password"
          right={
            <>
              Remembered it?
              <br />
              <Link to={paths.auth.login}>Sign in</Link>
            </>
          }
        />
      }
    >
      <p className="auth-intro-text">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      {message && (
        <div
          className="auth-form-message"
          style={{
            backgroundColor: message.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          {message.text}
        </div>
      )}

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="auth-button" disabled={btnDisabled}>
          <span>{btnText}</span>
          {loading && <Spinner size="sm" className="ms-2" />}
        </button>
      </form>
    </AuthShell>
  );
}
