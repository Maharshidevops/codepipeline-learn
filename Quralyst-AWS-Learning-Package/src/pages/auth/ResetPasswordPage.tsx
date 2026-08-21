// ResetPasswordPage — port of auth/reset_password.html. Token from ?token; live password checklist
// + confirm match gate; async POST → {success,message}. On success hides the form and shows the
// "Return to Login" link.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell, { AuthCardHeader, RecoveryLeft } from '@/components/auth/AuthShell';
import PasswordRequirements from '@/components/form/PasswordRequirements';
import Spinner from '@/components/ui/Spinner/Spinner';
import { authService } from '@/services/api';
import { paths } from '@/routes/paths';
import { passwordMeetsAllRequirements, passwordsMatch } from '@/lib/password';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  const showMismatch = confirm.length > 0 && password !== confirm;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!passwordMeetsAllRequirements(password)) {
      setMessage({
        success: false,
        text: 'Please meet all password requirements before continuing.',
      });
      return;
    }
    if (!passwordsMatch(password, confirm)) {
      setMessage({ success: false, text: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      const data = await authService.resetPassword({ token, password });
      setMessage({ success: data.success, text: data.message });
      if (data.success) setDone(true);
    } catch (err) {
      setMessage({
        success: false,
        text: getAuthErrorMessage(err, 'Unable to reset password. Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      pageClass="recovery-page"
      left={
        <RecoveryLeft
          title="Reset your password"
          text="Choose a new password to keep your Quralyst account protected."
        />
      }
      cardHeader={<AuthCardHeader title="Create New Password" />}
    >
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

      {!done && (
        <form className="auth-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter new password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRequirements password={password} confirm={confirm} id="reset-password-reqs" />
          </div>
          <div className="form-group">
            <label htmlFor="confirm_password">Confirm New Password</label>
            <input
              id="confirm_password"
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {showMismatch && (
              <div id="reset-confirm-mismatch" className="reset-mismatch-hint">
                Passwords do not match.
              </div>
            )}
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            <span>Reset Password</span>
            {loading && <Spinner size="sm" className="ms-2" />}
          </button>
        </form>
      )}

      {done && (
        <div className="auth-success-actions">
          <Link to={paths.auth.login} className="auth-button auth-return-link">
            Return to Login
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
