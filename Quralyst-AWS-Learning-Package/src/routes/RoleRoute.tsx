// Role gate mirroring the Jinja `{% if org_role in ('owner','admin') or is_admin %}` checks.
// Phase 32: denials render ForbiddenPage in place (user stays logged in, no redirect), and the
// check goes through can() — the role props map onto permission keys, so the server-driven
// permission map wins once present and the legacy role derivation covers older payloads.
import { Outlet } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import ForbiddenPage from '@/pages/ForbiddenPage';
import type { PermissionKey } from '@/types';

interface RoleRouteProps {
  role: 'is_admin' | 'org_admin' | 'pe_dataset' | 'pe_admin';
}

const ROLE_PERMISSION: Record<RoleRouteProps['role'], PermissionKey> = {
  is_admin: 'admin:approve',
  org_admin: 'org:manage_members',
  pe_dataset: 'pe:dataset', // F23.4 — staff or explicit per-user grant
  pe_admin: 'pe:admin', // F28.2 — staff only (operator console)
};

export default function RoleRoute({ role }: RoleRouteProps) {
  const { can } = usePermissions();
  if (!can(ROLE_PERMISSION[role])) return <ForbiddenPage />;
  return <Outlet />;
}
