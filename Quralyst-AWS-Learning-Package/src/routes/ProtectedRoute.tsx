// Gates the authenticated app shell. The app boots unauthenticated and restores the session via
// GET /auth/me on mount (App.tsx); while that probe is in flight (`hydrated` false) we hold a
// spinner instead of redirecting, so a hard refresh / deep link isn't bounced to login mid-probe.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/ui';
import { paths } from './paths';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const hydrated = useAuthStore((s) => s.hydrated);
  // While the session is being restored from the cookie (GET /auth/me on boot) don't redirect —
  // otherwise a hard refresh / deep link bounces the user to login before /auth/me even returns.
  if (!hydrated) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '100vh' }}
      >
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to={paths.auth.login} replace />;
  return <Outlet />;
}
