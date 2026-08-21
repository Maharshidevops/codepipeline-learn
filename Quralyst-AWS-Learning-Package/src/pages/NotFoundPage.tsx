import { Link } from 'react-router-dom';
import { paths } from '@/routes/paths';

export default function NotFoundPage() {
  return (
    <div className="container page-top-padding text-center">
      <h1>404</h1>
      <p className="text-muted">The page you’re looking for doesn’t exist.</p>
      <Link className="btn btn-standard" to={paths.processPreference}>
        Go to Start processing
      </Link>
    </div>
  );
}
