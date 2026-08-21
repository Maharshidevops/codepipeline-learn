// Live status badges for sidebar groups (Phase 22). Rendered inside the group's parent label, so
// they appear in both the expanded row and (positioned by CSS) on the icon in the collapsed rail.
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/api';
import { useProgressStore } from '@/store/progressStore';

// Start processing: a pulsing dot while a job is running (same source as GlobalProgressTracker).
export function RunningBadge() {
  const { processId, status } = useProgressStore();
  const active = processId !== null && status !== 'idle';
  if (!active) return null;
  return (
    <span
      className="sidebar-badge sidebar-badge--pulse"
      role="status"
      aria-label="A job is in progress"
    />
  );
}

// Admin: pending user registrations + seat requests. Only mounted for admins (admin-gated nav),
// so the query never runs for non-admins. Cached for a minute; refetch on focus is off app-wide.
export function ApprovalsBadge() {
  const { data } = useQuery({
    queryKey: ['admin', 'approvals', 'pending-count'],
    queryFn: async () => {
      const [users, orgs] = await Promise.all([
        adminService.getRegistrations({ status: 'pending', page: 1, perPage: 1 }),
        adminService.getOrgApprovals({ status: 'pending', page: 1, perPage: 1 }),
      ]);
      return {
        pendingUsers: users.counts.pending,
        seatRequests: orgs.seatRequests.length,
      };
    },
    staleTime: 60_000,
  });
  const count = (data?.pendingUsers ?? 0) + (data?.seatRequests ?? 0);
  if (!count) return null;
  return (
    <span className="sidebar-badge sidebar-badge--count" aria-label={`${count} pending approvals`}>
      {count}
    </span>
  );
}
