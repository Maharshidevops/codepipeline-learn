// Billing service. Pricing/checkout/top-up/portal/sales-seat + the org billing-tab body
// (subscription/balance/invoice/payment methods) + accept-invite. Real impl hits the endpoints;
// MSW intercepts in mock mode.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { Balance, Invoice, PaymentMethod, Plan, Subscription, TopupPack } from '@/types';

export interface SubscriptionResponse {
  subscription: Subscription | null;
}

export interface PricingData {
  plans: Plan[];
  currentPlanCode: string | null;
  topupPacks: Record<string, TopupPack>;
  salesRequestOrgSlug?: string;
}

export interface BillingBody {
  subscription: Subscription | null;
  planMeta: { name: string };
  balance: Balance;
  lastInvoice?: Invoice;
  paymentMethods: PaymentMethod[];
  isAdmin: boolean;
}

export interface AcceptInviteInfo {
  orgName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  expiresAt?: string;
  currentEmail: string;
}

export interface MessageResult {
  success: boolean;
  message: string;
}

export interface BillingService {
  getSubscription(): Promise<SubscriptionResponse>;
  getPricing(): Promise<PricingData>;
  createCheckoutSession(payload: {
    plan_code: string;
    billing_cycle: 'monthly' | 'annual';
  }): Promise<{ url: string }>;
  createTopupSession(payload: { pack_code: string; quantity: number }): Promise<{ url: string }>;
  salesSeatRequest(payload: { requested_seats: number; note?: string }): Promise<{ ok: boolean }>;
  getBillingBody(slug: string): Promise<BillingBody>;
  openPortal(): Promise<{ url: string }>;
  getAcceptInvite(token: string): Promise<AcceptInviteInfo>;
  acceptInvite(token: string): Promise<MessageResult>;
}

export const billingService: BillingService = {
  getSubscription: () => http<SubscriptionResponse>(endpoints.billing.subscriptionJson),
  getPricing: () => http<PricingData>(endpoints.billing.pricing),
  createCheckoutSession: (payload) =>
    http<{ url: string }>(endpoints.billing.checkoutSession, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createTopupSession: (payload) =>
    http<{ url: string }>(endpoints.billing.topupSession, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  // Phase 11: pure mutation — re-add the (always-true) ok flag; failure throws.
  salesSeatRequest: async (payload) => {
    await http.full(endpoints.billing.salesSeatRequest, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { ok: true };
  },
  getBillingBody: (slug) => http<BillingBody>(endpoints.org.billingData(slug)),
  openPortal: () => http<{ url: string }>(endpoints.billing.portal, { method: 'POST' }),
  getAcceptInvite: (token) => http<AcceptInviteInfo>(endpoints.billing.acceptInviteData(token)),
  // Phase 11: success → message toast; invalid/conflict invites THROW (the page catches them).
  acceptInvite: async (token) => {
    const env = await http.full(endpoints.billing.acceptInvite(token), { method: 'POST' });
    return { success: true, message: env.message ?? '' };
  },
};
