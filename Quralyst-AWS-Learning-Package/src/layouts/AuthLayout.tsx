// Auth shell — React port of auth_base.html (no sidebar). Loads the auth page CSS once for all
// auth routes; each page renders its own .auth-container via <AuthShell>.
import { Outlet } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import '@/styles/pages/auth.css';

export default function AuthLayout() {
  usePageTitle(); // per-route tab titles (Phase 34)
  return <Outlet />;
}
