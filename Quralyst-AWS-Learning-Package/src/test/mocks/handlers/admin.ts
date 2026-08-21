// MSW handlers for admin queues (Phase 5). Registrations + org approvals filter by status/email and
// paginate; counts from the full set. Org-updates filter by status. Mutations return success.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import {
  mockActiveOrgs,
  mockAdminOrgUpdates,
  mockDeletedOrgs,
  mockOrgApprovals,
  mockRegistrations,
  mockSeatRequests,
} from '@/test/mocks/fixtures/admin';

type QueueStatus = 'pending' | 'approved' | 'rejected';

// Derive a registration/approval queue status from its timestamps/reason.
function regStatus(r: { approvedAt?: string; rejectionReason?: string }): QueueStatus {
  if (r.rejectionReason) return 'rejected';
  if (r.approvedAt) return 'approved';
  return 'pending';
}

function paginate<T>(rows: T[], page: number, perPage: number) {
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  return {
    records: rows.slice((page - 1) * perPage, page * perPage),
    page,
    totalPages,
    totalItems,
  };
}

export const adminHandlers = [
  http.get(endpoints.admin.pendingRegistrationsData, ({ request }) => {
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') ?? 'pending') as QueueStatus;
    const page = Number(url.searchParams.get('page') ?? '1');
    const perPage = Number(url.searchParams.get('per_page') ?? '10');
    const email = (url.searchParams.get('email') ?? '').toLowerCase();
    const counts = {
      pending: mockRegistrations.filter((r) => regStatus(r) === 'pending').length,
      approved: mockRegistrations.filter((r) => regStatus(r) === 'approved').length,
      rejected: mockRegistrations.filter((r) => regStatus(r) === 'rejected').length,
    };
    const filtered = mockRegistrations.filter(
      (r) => regStatus(r) === status && (!email || r.email.toLowerCase().includes(email)),
    );
    const p = paginate(filtered, page, perPage);
    return ok(p.records, {
      meta: {
        pagination: {
          page: p.page,
          perPage,
          totalItems: p.totalItems,
          totalPages: p.totalPages,
          hasPrev: p.page > 1,
          hasNext: p.page < p.totalPages,
        },
        counts,
      },
    });
  }),
  http.post(endpoints.admin.approveUser(':id'), () => ok(null, { message: 'User approved.' })),
  http.post(endpoints.admin.rejectUser(':id'), () => ok(null, { message: 'User rejected.' })),
  http.post(endpoints.admin.deleteUser(':id'), () =>
    ok(null, { message: 'User permanently deleted.' }),
  ),

  http.get(endpoints.admin.orgApprovalsData, ({ request }) => {
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') ?? 'pending') as QueueStatus;
    const page = Number(url.searchParams.get('page') ?? '1');
    const perPage = Number(url.searchParams.get('per_page') ?? '10');
    const email = (url.searchParams.get('email') ?? '').toLowerCase();
    const counts = {
      pending: mockOrgApprovals.filter((o) => regStatus(o) === 'pending').length,
      approved: mockOrgApprovals.filter((o) => regStatus(o) === 'approved').length,
      rejected: mockOrgApprovals.filter((o) => regStatus(o) === 'rejected').length,
    };
    const filtered = mockOrgApprovals.filter(
      (o) => regStatus(o) === status && (!email || o.ownerEmail.toLowerCase().includes(email)),
    );
    const p = paginate(filtered, page, perPage);
    return ok(p.records, {
      meta: {
        pagination: {
          page: p.page,
          perPage,
          totalItems: p.totalItems,
          totalPages: p.totalPages,
          hasPrev: p.page > 1,
          hasNext: p.page < p.totalPages,
        },
        counts,
        seatRequests: mockSeatRequests,
      },
    });
  }),
  http.post(endpoints.admin.approveOrganization(':id'), () =>
    ok(null, { message: 'Organization approved.' }),
  ),
  http.post(endpoints.admin.rejectOrganization(':id'), () =>
    ok(null, { message: 'Organization rejected.' }),
  ),
  http.post(endpoints.admin.approveOrgUpdate(':id'), () =>
    ok(null, { message: 'Update approved.' }),
  ),
  http.post(endpoints.admin.rejectOrgUpdate(':id'), () =>
    ok(null, { message: 'Update rejected.' }),
  ),

  http.get(endpoints.admin.orgUpdatesData, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const items = status
      ? mockAdminOrgUpdates.filter((u) => u.status === status)
      : mockAdminOrgUpdates;
    return ok(items);
  }),

  http.get(endpoints.admin.organizationsData, () =>
    ok({ activeOrgs: mockActiveOrgs, deletedOrgs: mockDeletedOrgs }),
  ),
  http.post(endpoints.admin.restoreOrganization(':id'), () =>
    ok(null, { message: 'Organization restored.' }),
  ),
];
