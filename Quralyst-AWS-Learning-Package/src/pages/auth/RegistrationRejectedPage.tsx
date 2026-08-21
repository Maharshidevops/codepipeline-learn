// RegistrationRejectedPage — port of auth/registration_rejected.html. Full split shell; optional
// rejection reason via ?reason.
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell, { AuthCardHeader } from '@/components/auth/AuthShell';
import { paths } from '@/routes/paths';

export default function RegistrationRejectedPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const reason = params.get('reason') ?? '';
  return (
    <AuthShell
      pageClass="pending-page recovery-page"
      cardClass="pending-card"
      left={
        <div className="auth-content recovery-content">
          <h2 className="auth-brand-topline">Registration Declined</h2>
          <h1 className="name-text-img auth-brand-line">Quralyst</h1>
          <p>
            We regret to inform you that your registration for Quralyst could not be approved at
            this time.
          </p>
        </div>
      }
      cardHeader={
        <AuthCardHeader
          title="Rejected"
          right={
            <>
              Already have an account ?<br />
              <Link to={paths.auth.login}>Sign in</Link>
            </>
          }
        />
      }
    >
      <p className="pending-intro">
        Your registration could not be approved at this time.
        <br />
        If you believe this was a mistake, please contact support or try registering again later.
      </p>
      <div className="pending-email">
        <p className="pending-email-label">Registered email</p>
        <p className="pending-email-value">{email}</p>
      </div>
      {reason && (
        <div className="rejection-reason">
          <p className="pending-email-label">Rejection reason</p>
          <p className="rejection-reason-value">{reason}</p>
        </div>
      )}
      <p className="pending-note">
        For further assistance, please contact our support team at{' '}
        <a href="mailto:support@quralyst.ai">support@quralyst.ai</a>
      </p>
    </AuthShell>
  );
}
