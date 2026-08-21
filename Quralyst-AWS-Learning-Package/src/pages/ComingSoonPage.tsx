// Lightweight placeholder for nav destinations that exist in the Replit reference
// but are not wired to a live page in this build yet.
import { Link, useSearchParams } from 'react-router-dom';
import { paths } from '@/routes/paths';

export default function ComingSoonPage() {
  const [params] = useSearchParams();
  const feature = params.get('feature')?.trim() || 'This feature';

  return (
    <div className="container page-top-padding text-center">
      <p className="text-uppercase small fw-semibold text-muted mb-2">QuraLyst</p>
      <h1 className="h3 mb-2">Coming soon</h1>
      <p className="text-muted mb-4">
        {feature} is on the roadmap and is not available in this build yet.
      </p>
      <Link className="btn btn-standard" to={paths.processPreference}>
        Go to Research Home
      </Link>
    </div>
  );
}
