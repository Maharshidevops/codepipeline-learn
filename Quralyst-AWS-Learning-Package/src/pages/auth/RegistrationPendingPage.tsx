// RegistrationPendingPage — port of auth/registration_pending.html. Full split shell + pending-card.
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell, { AuthCardHeader } from '@/components/auth/AuthShell';
import { paths } from '@/routes/paths';

export default function RegistrationPendingPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  return (
    <AuthShell
      pageClass="pending-page recovery-page"
      cardClass="pending-card"
      left={
        <div className="auth-content recovery-content">
          <h2 className="auth-brand-topline">Registration Received</h2>
          <h1 className="name-text-img auth-brand-line">Quralyst</h1>
          <p>
            Thank you for registering with Quralyst. <br />
            We will review your registration and get back to you soon.
          </p>
        </div>
      }
      cardHeader={
        <AuthCardHeader
          title="Pending"
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
        Your registration is received and under review.
        <br />
        We will notify you by email once your account is approved and activated.
      </p>
      <div className="pending-email">
        <p className="pending-email-label">Registered email</p>
        <p className="pending-email-value">{email}</p>
      </div>
      <p className="pending-note">Please check your inbox and spam folder for updates.</p>
    </AuthShell>
  );
}
