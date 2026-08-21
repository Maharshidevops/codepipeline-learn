// Central typed route builders. Edit a path once here. See PHASE-0 §7 + the overview routing tree.
export const paths = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    googleCompleteOrg: '/auth/google/complete-org',
    orgPending: '/auth/org-pending',
    orgFull: '/auth/org-full',
    registrationPending: '/auth/registration-pending',
    registrationRejected: '/auth/registration-rejected',
  },
  processPreference: '/process-preference',
  targetList: '/quralyst-research',
  strategic: '/strategic-research',
  financialVerticals: '/financial-verticals',
  financialVerticalsDatabase: '/financial-verticals/database',
  financialVerticalsFirmMemory: '/financial-verticals/firm-memory',
  financialVerticalsResults: (id: string) => `/financial-verticals/results/${id}`,
  // Deal Workspaces (Tier B / F17)
  deals: '/deals',
  dealWorkspace: (id: string) => `/deals/${id}`,
  previousResults: '/previous-results',
  // Deep-link a Previous Results tab via the existing `active_tab` searchParam (sidebar group, Phase 22).
  previousResultsTab: (tab: 'target-list' | 'strategic-buyer' | 'fv-results' | 'tearsheets') =>
    `/previous-results?active_tab=${tab}`,
  // Tabbed result workspace (Phase 12). `result()` is the canonical builder; the four named builders
  // below are kept so every existing caller resolves to the right tab automatically.
  result: (id: string, tab: 'data' | 'preview' | 'summary' = 'data') =>
    `/quralyst-research/result/${id}/${tab}`,
  viewResult: (id: string) => `/quralyst-research/result/${id}/data`,
  previewResult: (id: string) => `/quralyst-research/result/${id}/preview`,
  previewInputFile: (id: string, fileId: string) =>
    `/quralyst-research/result/${id}/preview?fileId=${encodeURIComponent(fileId)}`,
  summary: (id: string) => `/quralyst-research/result/${id}/summary`,
  knowledgeBank: '/knowledge-bank',
  analystPreferences: '/analyst-preferences',
  scorecard: '/scorecard',
  settings: {
    profile: '/settings/profile',
    apiKeys: '/settings/api-keys',
    appearance: '/settings/appearance',
  },
  emailSync: '/email-sync',
  faq: '/faq',
  usage: '/usage', // F35.3 — estimated API usage (ordinary member)
  bdScoring: '/bd-scoring', // F36.3 — BD company scoring (ordinary member)
  /** Placeholder for Replit nav items not yet wired in this build. */
  comingSoon: '/coming-soon',
  pricing: '/pricing',
  billing: {
    acceptInvite: '/billing/accept-invite',
    checkoutSuccess: '/billing/checkout/success',
    checkoutCancel: '/billing/checkout/cancel',
    inviteInvalid: '/billing/invite-invalid',
  },
  org: {
    dashboard: (slug: string) => `/org/${slug}/dashboard`,
    edit: (slug: string) => `/org/${slug}/edit`,
    billing: (slug: string) => `/org/${slug}/billing`,
    members: (slug: string) => `/org/${slug}/members`,
    invites: (slug: string) => `/org/${slug}/invites`,
    creditLedger: (slug: string) => `/org/${slug}/credit-ledger`,
    updates: (slug: string) => `/org/${slug}/updates`,
    crm: (slug: string) => `/org/${slug}/crm`,
    domains: (slug: string) => `/org/${slug}/domains`,
  },
  admin: {
    pendingRegistrations: '/admin/pending-registrations',
    organizationApprovals: '/admin/organization-approvals',
    organizationUpdates: '/admin/organization-updates',
    organizations: '/admin/organizations',
    providerBudgets: '/admin/provider-budgets', // F35.3 — staff budget caps
  },
  pe: {
    firms: '/pe/firms',
    firm: (id: string) => `/pe/firms/${id}`,
    holdings: '/pe/holdings',
    people: '/pe/people',
    reviewQueue: '/pe/review-queue', // F27.3 — review-queue triage (pe:dataset)
    corrections: '/pe/corrections', // F27.3 — corrections + learned rules (pe:dataset)
    screener: '/pe/screener', // F29.2 — four-tab search + find-similar (pe:dataset)
    exitWatch: '/pe/exit-watch', // F30.2 — exit-readiness ranked table (pe:dataset)
    changes: '/pe/changes', // F31.2 — activity feed / changes (pe:dataset)
    analysis: '/pe/analysis', // F32.2 — analysis dashboard / analytics (pe:dataset)
    talentFlow: '/pe/talent-flow', // F33.2 — detected cross-firm moves + person history (pe:dataset)
    digest: '/pe/digest', // F37.2 — intelligence digest / ranked market-event feed (pe:dataset)
    marketMap: '/pe/market-map', // F38.2 — buyer universe + whitespace (pe:dataset)
    ask: '/pe/ask', // F39.2 — Ask the Market NL Q&A (pe:dataset)
    tearsheet: '/pe/tearsheet', // F40.2 — AI company tearsheet deck (pe:dataset)
    tearsheetView: (id: string) => `/pe/tearsheet/view/${encodeURIComponent(id)}`,
    news: '/pe/news', // F41.2 — market headlines widget standalone (pe:dataset)
    dataTools: '/pe/data-tools', // F42.3 — standalone enrichment utilities (pe:dataset)
    actionQueue: '/pe/action-queue', // F64.6 — staff-only live queue view + queue ops
    admin: '/pe/admin', // F28.2 — staff-only operator console
  },
  // IB Vertical (F34.4) — investment banks, tombstone transactions, professionals, league table.
  // Gated by the SAME pe:dataset grant as PE (RoleRoute role="pe_dataset").
  ib: {
    banks: '/ib',
    bank: (id: string) => `/ib/${id}`,
    transactions: '/ib/transactions',
    people: '/ib/people',
    screener: '/ib/screener',
  },
} as const;
