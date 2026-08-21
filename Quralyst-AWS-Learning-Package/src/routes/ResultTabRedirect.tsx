// Redirects a legacy per-view URL (/quralyst-research/{previous-results,preview,manage-results,
// summary}/:resultId) to the matching tab in the merged workspace (Phase 12). Preserves :resultId.
// Split out of router.tsx so that file has no component exports (react-refresh HMR).
import { Navigate, useParams } from 'react-router-dom';
import { paths } from '@/routes/paths';

export default function ResultTabRedirect({ tab }: { tab: 'data' | 'preview' | 'summary' }) {
  const { resultId } = useParams<{ resultId: string }>();
  return <Navigate to={paths.result(resultId ?? '', tab)} replace />;
}
