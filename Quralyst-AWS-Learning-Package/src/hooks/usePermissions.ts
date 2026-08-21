// usePermissions / can() (Phase 32) — the single read path for permission gating. Reads the
// server-driven permission map off the current user; while the map is absent (older payloads,
// pre-backend), falls back to the legacy role derivation so existing gating keeps working.
// Frontend checks are UX only — the backend authorizing every request is the security boundary.
import { useAuthStore } from '@/store/authStore';
import type { PermissionKey, User } from '@/types';

/** Legacy fallback when the user payload carries no permission map. */
function legacyFallback(user: User, permission: PermissionKey): boolean {
  const isOrgAdmin = user.orgRole === 'owner' || user.orgRole === 'admin' || user.isAdmin;
  switch (permission) {
    case 'admin:approve':
      return user.isAdmin;
    case 'org:manage_members':
      return isOrgAdmin;
    case 'org:view':
    case 'billing:view':
      return user.orgRole !== null || user.isAdmin;
    case 'results:export':
      return true; // every member could export in the legacy app
    case 'pe:dataset':
      // Legacy fallback when no server permission map: staff only.
      // (Server compute_permissions grants pe:dataset to all active approved members).
      return user.isAdmin;
    case 'pe:admin':
      // PE admin ops (F28) are staff-only — never the per-user pe:dataset grant.
      return user.isAdmin;
  }
}

export function checkPermission(user: User | null, permission: PermissionKey): boolean {
  if (!user) return false;
  const mapped = user.permissions?.[permission];
  if (mapped !== undefined) return mapped;
  return legacyFallback(user, permission);
}

export function usePermissions() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const can = (permission: PermissionKey) => checkPermission(currentUser, permission);
  return { can };
}
