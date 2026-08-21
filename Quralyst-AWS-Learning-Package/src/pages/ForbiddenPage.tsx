// ForbiddenPage (Phase 32) — route-level 403: the user is logged in but lacks access. Rendered
// by RoleRoute in place of the protected outlet (no redirect: losing your place on a permissions
// boundary is hostile; staying put with an explanation is the legacy behavior we want).
import { Link } from 'react-router-dom';
import { paths } from '@/routes/paths';

export default function ForbiddenPage() {
  return (
    <div className="no-data-placeholder text-center p-5">
      <i className="bi bi-shield-lock" style={{ fontSize: '3rem' }} />
      <h4 className="mt-3">You don&apos;t have access to this</h4>
      <p className="text-secondary">
        Your account doesn&apos;t have permission to view this page. If you think it should, contact
        your organization admin.
      </p>
      <Link to={paths.processPreference} className="btn btn-standard mt-2">
        <i className="bi bi-arrow-left me-1" />
        Back to Start Processing
      </Link>
    </div>
  );
}
