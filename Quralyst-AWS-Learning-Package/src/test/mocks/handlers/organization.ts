// MSW handlers for organization tabs (Phase 4). Members + credit-ledger paginate/filter to mirror
// the Flask routes; the rest return seeded fixtures. Mutations return success.
// Phase 11: list arrays live in `data` with pagination/counts in `meta`; mutations carry the toast
// in `message`; object endpoints put the object in `data`.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import { mockOrganization } from '@/test/mocks/fixtures/organizations';
import {
  mockBalance,
  mockCrmFiles,
  mockInvites,
  mockInvoice,
  mockLedgerRows,
  mockMembers,
  mockPaymentMethods,
  mockSubscription,
  mockUpdates,
} from '@/test/mocks/fixtures/orgData';

const SLUG = ':slug';

export const organizationHandlers = [
  // Members — filter by status + email, paginate; counts from the full set.
  http.get(endpoints.org.membersData(SLUG), ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'active';
    const page = Number(url.searchParams.get('page') ?? '1');
    const perPage = Number(url.searchParams.get('per_page') ?? '10');
    const email = (url.searchParams.get('email') ?? '').toLowerCase();

    const counts = {
      pending: mockMembers.filter((m) => m.orgStatus === 'pending').length,
      active: mockMembers.filter((m) => m.orgStatus === 'active').length,
      inactive: mockMembers.filter((m) => m.orgStatus === 'inactive').length,
    };
    const filtered = mockMembers.filter(
      (m) => m.orgStatus === status && (!email || m.email.toLowerCase().includes(email)),
    );
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const records = filtered.slice((page - 1) * perPage, page * perPage);
    return ok(records, {
      meta: {
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
        counts,
      },
    });
  }),
  http.post(endpoints.org.members(SLUG), () => ok(null, { message: 'Member updated.' })),

  http.get(endpoints.org.dashboardData(SLUG), () =>
    ok({
      org: {
        name: mockOrganization.name,
        slug: mockOrganization.slug,
        joinCode: mockOrganization.joinCode,
      },
      memberCount: mockMembers.filter((m) => m.orgStatus === 'active').length,
      pendingMembers: mockMembers.filter((m) => m.orgStatus === 'pending').length,
      seatUsage: mockMembers.filter((m) => m.orgStatus === 'active').length,
      seatCap: 5,
      recentUpdates: mockUpdates,
    }),
  ),

  http.get(endpoints.org.editData(SLUG), () =>
    ok({
      name: mockOrganization.name,
      allowMemberKeys: mockOrganization.settings.allowMemberKeys,
      orgKeyFallback: mockOrganization.settings.orgKeyFallback,
      membersSeeOrgUsage: mockOrganization.settings.membersSeeOrgUsage ?? true,
      keyStatus: mockOrganization.keyStatus,
      joinCode: mockOrganization.joinCode,
    }),
  ),
  http.post(endpoints.org.edit(SLUG), () => ok(null, { message: 'Organization updated.' })),
  http.post(endpoints.org.clearApiKeys(SLUG), () =>
    ok(null, { message: 'All organization API keys have been cleared successfully.' }),
  ),
  http.post(endpoints.org.testApiKeys(SLUG), () =>
    ok({
      testResults: Object.fromEntries(
        Object.keys(mockOrganization.keyStatus).map((k) => [
          k,
          {
            status: mockOrganization.keyStatus[k as keyof typeof mockOrganization.keyStatus]
              ? 'valid'
              : 'not_configured',
            message: mockOrganization.keyStatus[k as keyof typeof mockOrganization.keyStatus]
              ? 'OK'
              : 'API key not configured',
          },
        ]),
      ),
    }),
  ),
  http.post(`${endpoints.org.testApiKeys(SLUG)}/:keyName`, ({ params }) => {
    const keyName = String(params.keyName);
    const configured = Boolean(
      mockOrganization.keyStatus[keyName as keyof typeof mockOrganization.keyStatus],
    );
    return ok({
      testResults: {
        [keyName]: {
          status: configured ? 'valid' : 'not_configured',
          message: configured ? 'OK' : 'API key not configured',
        },
      },
    });
  }),
  http.post(endpoints.org.rotateJoinCode(SLUG), () => ok({ joinCode: 'QR-NEWCODE' })),

  http.get(endpoints.org.invitesData(SLUG), () =>
    ok({
      seats: { included: 5, active: 8, pending: mockInvites.length, used: 8, remaining: -3 },
      pendingInvites: mockInvites,
      isAdmin: true,
    }),
  ),
  http.post(endpoints.org.inviteSend(SLUG), async ({ request }) => {
    const body = (await request.json()) as { email?: string; role?: 'admin' | 'member' };
    return ok({
      email: body?.email ?? '',
      role: body?.role ?? 'member',
      acceptUrl: `/billing/accept-invite/mock-token`,
    });
  }),
  http.post(endpoints.org.inviteRevoke(SLUG, ':id'), () =>
    ok(null, { message: 'Invite revoked.' }),
  ),

  http.get(endpoints.org.creditLedgerData(SLUG), ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const perPage = 10;
    const total = mockLedgerRows.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const rows = mockLedgerRows.slice((page - 1) * perPage, page * perPage);
    return ok(rows, {
      meta: {
        pagination: {
          page,
          perPage,
          totalItems: total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      },
    });
  }),

  http.get(endpoints.org.updatesData(SLUG), () => ok(mockUpdates)),

  http.get(endpoints.org.domainsData(SLUG), () => ok(mockOrganization.domains)),
  http.post(endpoints.org.domains(SLUG), () => ok(null, { message: 'Domain updated.' })),

  http.get(endpoints.org.crmData(SLUG), () => ok(mockCrmFiles)),

  // Org billing tab body
  http.get(endpoints.org.billingData(SLUG), () =>
    ok({
      subscription: mockSubscription,
      planMeta: { name: 'Growth' },
      balance: mockBalance,
      lastInvoice: mockInvoice,
      paymentMethods: mockPaymentMethods,
      isAdmin: true,
    }),
  ),
];
