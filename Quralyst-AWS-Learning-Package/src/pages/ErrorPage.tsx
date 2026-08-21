// ErrorPage (Phase 14) — generic error/500 screen, style-matched to NotFoundPage. Used as the
// router `errorElement` on the authed AppLayout route, so loader/render errors inside the shell
// render here (within the layout) instead of bubbling to the top-level ErrorBoundary. Reads the
// thrown error via useRouteError for a useful detail line.
import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { paths } from '@/routes/paths';

export default function ErrorPage() {
  const error = useRouteError();

  let detail = 'An unexpected error occurred. Please try again.';
  if (isRouteErrorResponse(error)) {
    detail = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error && error.message) {
    detail = error.message;
  }

  return (
    <div className="container page-top-padding text-center">
      <h1>Something went wrong</h1>
      <p className="text-muted">{detail}</p>
      <div className="d-flex gap-2 justify-content-center">
        <button type="button" className="btn btn-standard" onClick={() => window.location.reload()}>
          Try again
        </button>
        <Link className="btn btn-standard" to={paths.processPreference}>
          Go to Start processing
        </Link>
      </div>
    </div>
  );
}
