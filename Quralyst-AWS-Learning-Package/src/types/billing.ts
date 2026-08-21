// Billing types. See REF-DATA-MODEL.md.

export interface Plan {
  code: string;
  name: string;
  description: string;
  isSelfServe: boolean;
  monthlyPrice: number;
  annualMonthlyEquivalent: number;
  companiesPerMonth: number | null;
  seatsIncluded: number | null;
  trialDays: number | null;
  features: Record<string, boolean>;
}

export interface TopupPack {
  code: string;
  credits: number;
  price: number;
}

export interface Subscription {
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'incomplete';
  planCode: string | null;
  billingCycle: 'monthly' | 'annual';
  seats: number;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export interface Balance {
  planBalance: number;
  topupBalance: number;
  reserved: number;
}

export interface Invoice {
  stripeInvoiceId: string;
  amount: number; // cents
  currency: string;
  status: string;
  paidAt?: string;
  hostedUrl?: string;
  pdfUrl?: string;
}

export interface PaymentMethod {
  isActive: boolean;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface BillingBannerData {
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
  dismissable?: boolean;
  key?: string;
}
