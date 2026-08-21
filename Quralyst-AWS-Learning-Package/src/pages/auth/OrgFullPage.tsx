// OrgFullPage — port of auth/org_full.html. Organization at seat capacity. org name via ?org.
import { Link, useSearchParams } from 'react-router-dom';
import { paths } from '@/routes/paths';

export default function OrgFullPage() {
  const [params] = useSearchParams();
  const orgName = params.get('org') ?? 'Your organization';
  return (
    <div className="auth-container">
      <div className="auth-card p-4">
        <h1>Organization at capacity</h1>
        <p>
          {orgName} has reached its seat limit. Your administrator has been notified to request more
          seats.
        </p>
        <Link to={paths.auth.login} className="btn btn-primary">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
