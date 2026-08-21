// Convenience hook over the auth store with role helpers mirroring base.html / _subnav.html gates.
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { currentUser, isAuthenticated, login, logout, setUser } = useAuthStore();
  const isAdmin = !!currentUser?.isAdmin;
  const isOrgAdmin =
    isAuthenticated &&
    (currentUser?.orgRole === 'owner' || currentUser?.orgRole === 'admin' || isAdmin);
  return { currentUser, isAuthenticated, isAdmin, isOrgAdmin, login, logout, setUser };
}
