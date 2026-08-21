// InviteInvalidPage — port of billing/invite_invalid.html. Auth-aware action link. Rendered in
// AppLayout (the authed shell); the link target depends on whether the user is signed in.
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { paths } from '@/routes/paths';
import '@/styles/pages/billing.css';

export default function InviteInvalidPage() {
  const [params] = useSearchParams();
  const error = params.get('error') ?? 'This invitation link is no longer valid.';
  const { isAuthenticated } = useAuth();
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 text-center">
          <div className="mb-3">
            <i className="bi bi-exclamation-triangle text-warning billing-status-icon" />
          </div>
          <h2 className="mb-3">Invitation not available</h2>
          <p className="text-muted">{error}</p>
          <div className="mt-4">
            {isAuthenticated ? (
              <Link to={paths.processPreference} className="btn btn-primary">
                Go to app
              </Link>
            ) : (
              <Link to={paths.auth.login} className="btn btn-primary">
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
