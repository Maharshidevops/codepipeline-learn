// MSW handlers for billing: checkout-success poll (Phase 2) + pricing/checkout/topup/sales/portal
// and accept-invite (Phase 4). Checkout/top-up/portal return a stub URL; sales returns ok.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import { mockPlans, mockSubscription, mockTopupPacks } from '@/test/mocks/fixtures/orgData';

export const billingHandlers = [
  http.get(endpoints.billing.subscriptionJson, () => ok({ subscription: mockSubscription })),

  http.get(endpoints.billing.pricing, () =>
    ok({
      plans: mockPlans,
      currentPlanCode: mockSubscription.planCode,
      topupPacks: mockTopupPacks,
      salesRequestOrgSlug: 'quralyst',
    }),
  ),

  http.post(endpoints.billing.checkoutSession, () =>
    ok({ url: '/billing/checkout/success?org_slug=quralyst' }),
  ),
  http.post(endpoints.billing.topupSession, () =>
    ok({ url: '/billing/checkout/success?org_slug=quralyst' }),
  ),
  http.post(endpoints.billing.salesSeatRequest, () =>
    ok(null, { message: 'Your seat request has been submitted.' }),
  ),
  http.post(endpoints.billing.portal, () => ok({ url: '#stripe-portal' })),
  http.post(endpoints.billing.dismissBanner, () => ok()),

  http.get(endpoints.billing.acceptInviteData(':token'), () =>
    ok({
      orgName: 'Quralyst',
      inviterName: 'Maya Patel',
      inviterEmail: 'maya.patel@indago-research.com',
      role: 'member',
      expiresAt: '2026-02-12T09:00:00Z',
      currentEmail: 'jchoudhary@indago-research.com',
    }),
  ),
  http.post(endpoints.billing.acceptInvite(':token'), () =>
    ok(null, { message: 'Invitation accepted.' }),
  ),
];
