// Org + billing fixtures (dummy-data mode). Shapes mirror the organizationService/billingService
// response types so they can't silently drift. Members span all three statuses for the tabs.
import type {
  Balance,
  CrmFile,
  Invoice,
  LedgerRow,
  Member,
  OrgUpdate,
  PaymentMethod,
  PendingInvite,
  Plan,
  Subscription,
  TopupPack,
  UsageRow,
} from '@/types';

export const mockMembers: Member[] = [
  {
    id: 'u1',
    email: 'jchoudhary@indago-research.com',
    name: 'Jatin Choudhary',
    orgRole: 'owner',
    orgStatus: 'active',
    createdAt: '2026-01-02T09:00:00Z',
  },
  {
    id: 'u2',
    email: 'maya.patel@indago-research.com',
    name: 'Maya Patel',
    orgRole: 'admin',
    orgStatus: 'active',
    createdAt: '2026-01-05T11:30:00Z',
  },
  {
    id: 'u3',
    email: 'liam.ng@indago-research.com',
    name: 'Liam Ng',
    orgRole: 'member',
    orgStatus: 'active',
    createdAt: '2026-01-09T14:10:00Z',
  },
  {
    id: 'u4',
    email: 'sara.kim@indago-research.com',
    name: 'Sara Kim',
    orgRole: 'member',
    orgStatus: 'active',
    createdAt: '2026-01-12T08:45:00Z',
  },
  {
    id: 'u5',
    email: 'tom.dubois@indago-research.com',
    name: 'Tom Dubois',
    orgRole: 'member',
    orgStatus: 'active',
    createdAt: '2026-01-15T16:20:00Z',
  },
  {
    id: 'u6',
    email: 'nina.rossi@indago-research.com',
    name: 'Nina Rossi',
    orgRole: 'member',
    orgStatus: 'active',
    createdAt: '2026-01-18T10:05:00Z',
  },
  {
    id: 'u7',
    email: 'omar.haddad@indago-research.com',
    name: 'Omar Haddad',
    orgRole: 'member',
    orgStatus: 'active',
    createdAt: '2026-01-20T13:40:00Z',
  },
  {
    id: 'u8',
    email: 'wei.zhang@indago-research.com',
    name: 'Wei Zhang',
    orgRole: 'member',
    orgStatus: 'active',
    createdAt: '2026-01-22T09:25:00Z',
  },
  {
    id: 'u9',
    email: 'pending.one@indago-research.com',
    name: 'Priya Nair',
    orgRole: 'member',
    orgStatus: 'pending',
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'u10',
    email: 'pending.two@indago-research.com',
    name: 'Carlos Mendez',
    orgRole: 'member',
    orgStatus: 'pending',
    createdAt: '2026-02-03T12:15:00Z',
  },
  {
    id: 'u11',
    email: 'pending.three@indago-research.com',
    name: 'Aisha Bello',
    orgRole: 'member',
    orgStatus: 'pending',
    createdAt: '2026-02-04T15:30:00Z',
  },
  {
    id: 'u12',
    email: 'inactive.one@indago-research.com',
    name: 'Greg Olsen',
    orgRole: 'member',
    orgStatus: 'inactive',
    createdAt: '2025-12-10T09:00:00Z',
  },
  {
    id: 'u13',
    email: 'inactive.two@indago-research.com',
    name: 'Hana Sato',
    orgRole: 'member',
    orgStatus: 'inactive',
    createdAt: '2025-12-18T09:00:00Z',
  },
];

export const mockUpdates: OrgUpdate[] = [
  {
    createdAt: '2026-02-05T10:00:00Z',
    summary: 'Maya Patel was promoted to admin.',
    updateType: 'role_change',
    status: 'completed',
  },
  {
    createdAt: '2026-02-03T12:15:00Z',
    summary: 'Carlos Mendez requested to join.',
    updateType: 'join_request',
    status: 'pending',
  },
  {
    createdAt: '2026-02-01T09:00:00Z',
    summary: 'Priya Nair requested to join.',
    updateType: 'join_request',
    status: 'pending',
  },
  {
    createdAt: '2026-01-28T16:00:00Z',
    summary: 'Subscription upgraded to Growth (annual).',
    updateType: 'billing',
    status: 'completed',
  },
  {
    createdAt: '2026-01-20T13:40:00Z',
    summary: 'Omar Haddad joined the organization.',
    updateType: 'member_added',
    status: 'completed',
  },
];

export const mockPlans: Plan[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'For individuals getting started.',
    isSelfServe: true,
    monthlyPrice: 49,
    annualMonthlyEquivalent: 39,
    companiesPerMonth: 500,
    seatsIncluded: 1,
    trialDays: 14,
    features: { ai_enrichment: true, apollo: true, news: false, priority_support: false },
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'For growing deal teams.',
    isSelfServe: true,
    monthlyPrice: 199,
    annualMonthlyEquivalent: 159,
    companiesPerMonth: 5000,
    seatsIncluded: 5,
    trialDays: 14,
    features: { ai_enrichment: true, apollo: true, news: true, priority_support: false },
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Custom limits and support.',
    isSelfServe: false,
    monthlyPrice: 0,
    annualMonthlyEquivalent: 0,
    companiesPerMonth: null,
    seatsIncluded: null,
    trialDays: null,
    features: { ai_enrichment: true, apollo: true, news: true, priority_support: true },
  },
];

export const mockTopupPacks: Record<string, TopupPack> = {
  small: { code: 'small', credits: 500, price: 25 },
  medium: { code: 'medium', credits: 2000, price: 80 },
  large: { code: 'large', credits: 5000, price: 175 },
};

export const mockSubscription: Subscription = {
  status: 'active',
  planCode: 'growth',
  billingCycle: 'monthly',
  seats: 5,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: '2026-07-01T00:00:00Z',
};

export const mockBalance: Balance = { planBalance: 4200, topupBalance: 800, reserved: 150 };

export const mockInvoice: Invoice = {
  stripeInvoiceId: 'in_1Q2W3E',
  amount: 19900,
  currency: 'usd',
  status: 'paid',
  paidAt: '2026-06-01T00:00:00Z',
  hostedUrl: '#',
  pdfUrl: '#',
};

export const mockPaymentMethods: PaymentMethod[] = [
  { isActive: true, brand: 'visa', last4: '4242', expMonth: 8, expYear: 2028, isDefault: true },
];

export const mockUsageProviders = [
  'openai',
  'apollo',
  'gmaps',
  'coresignal',
  'anthropic',
  'gemini',
];

export const mockUsageRows: UsageRow[] = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-02-${String(14 - i).padStart(2, '0')}`,
  userName: mockMembers[i % 8].name ?? 'Member',
  userEmail: mockMembers[i % 8].email,
  companiesProcessed: 120 - i * 5,
  apiCalls: {
    openai: 300 - i * 8,
    apollo: 150 - i * 4,
    gmaps: 40 + i,
    coresignal: 20 + i * 2,
    anthropic: 90 - i * 3,
    gemini: 10 + i,
  },
}));

export const mockLedgerRows: LedgerRow[] = Array.from({ length: 24 }, (_, i) => {
  const credit = i % 3 === 0;
  return {
    createdAt: `2026-02-${String(24 - i).padStart(2, '0')}T10:00:00Z`,
    source: credit ? 'topup' : 'processing',
    creditType: credit ? 'topup' : 'plan',
    delta: credit ? `+${(i + 1) * 100}` : `-${(i + 1) * 7}`,
    balanceAfter: 5000 - i * 30,
    user: mockMembers[i % 8].name ?? 'Member',
    jobId: credit ? '' : `JOB-${1000 + i}`,
    batchRef: credit ? `BATCH-${200 + i}` : '',
    description: credit ? 'Top-up purchase' : 'Target list processing',
  };
});

export const mockInvites: PendingInvite[] = [
  {
    id: 'inv1',
    email: 'newhire@indago-research.com',
    orgRole: 'member',
    createdAt: '2026-02-04T09:00:00Z',
    expiresAt: '2026-02-11T09:00:00Z',
  },
  {
    id: 'inv2',
    email: 'analyst@indago-research.com',
    orgRole: 'admin',
    createdAt: '2026-02-05T09:00:00Z',
    expiresAt: '2026-02-12T09:00:00Z',
  },
];

export const mockCrmFiles: CrmFile[] = [
  {
    title: 'Q1 SaaS Targets',
    processId: 'proc_a1',
    createdAt: '2026-02-02T09:00:00Z',
    status: 'ready',
  },
  {
    title: 'EU Manufacturing Buyers',
    processId: 'proc_b2',
    createdAt: '2026-01-28T09:00:00Z',
    status: 'ready',
  },
  { processId: 'proc_c3', createdAt: '2026-01-20T09:00:00Z', status: 'processing' },
];
