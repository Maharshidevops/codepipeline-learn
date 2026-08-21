// Single source of every API path the frontend calls. See REF-API-CONTRACTS.md.
// Phase 9: every backend endpoint is served under a single `/api` prefix (the SPA's own
// client-side routes stay un-prefixed), so the dev proxy + prod nginx are one rule
// (`/api` → FastAPI, everything else → the SPA). When FastAPI routes change, edit here only.
export const endpoints = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/signup',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    refresh: '/api/auth/refresh',
    googleLogin: '/api/auth/login/google', // OAuth initiator — full-page redirect to Google (not fetch)
    googleCompleteOrg: '/api/auth/google-complete-org',
    logout: '/api/auth/logout',
    currentUser: '/api/auth/me', // convenience endpoint for the SPA
  },
  profile: {
    update: '/api/profile',
    changePassword: '/api/profile/change-password',
    uploadImage: '/api/profile/upload-image',
    deleteImage: '/api/profile/image',
    image: (userId: string) => `/api/profile/image/${userId}`,
    currentApiKeys: '/api/profile/user-preferences/current-api-keys',
    updateApiKeys: '/api/profile/user-preferences/update-api-keys',
    clearApiKeys: '/api/profile/user-preferences/clear-api-keys',
    testApiKeys: '/api/profile/user-preferences/test-api-keys',
    testGptKey: '/api/test-gpt-key',
    activeProcessing: '/api/active-processing',
  },
  locations: {
    states: '/api/locations/states',
    cities: '/api/locations/cities',
  },
  research: {
    targetList: '/api/quralyst_research',
    strategic: '/api/strategic_research',
    financialVerticals: '/api/financial-verticals',
    financialVerticalsDatabase: '/api/financial-verticals/database-creation',
    previewMapping: '/api/quralyst_research/preview-mapping', // F9 — column-mapping preview
    reuseFilters: '/api/research/reuse-filters',
    saveManualFields: '/api/save-manual-fields',
    enhanceBusinessQuery: '/api/quralyst_research/enhance-business-query',
    extractFormCriteria: '/api/extract-form-criteria',
    buyerRecommendation: '/api/strategic_research/buyer-recommendation',
    // AI mandate helpers (F10)
    enhanceTargetDescription: '/api/quralyst_research/enhance-target-description',
    describeFromWebsite: '/api/quralyst_research/describe-from-website',
    describeFromPdf: '/api/quralyst_research/describe-from-pdf',
    suggestIndustry: '/api/quralyst_research/suggest-industry',
    // Parse Mandate (F11) — one document → full wizard prefill
    parseMandate: '/api/parse-mandate',
    // Research Home private-market news (auth'd; not PE-gated)
    homeNews: '/api/news',
  },
  results: {
    list: (tab: string) => `/api/previous-results/${tab}`,
    users: '/api/previous-results/users',
    detail: (id: string) => `/api/results/${id}`,
    summary: (id: string) => `/api/results/${id}/summary`,
    crm: (id: string) => `/api/results/${id}/crm`,
    saveManualFields: '/api/save-manual-fields',
    fitOverride: (id: string) => `/api/results/${id}/fit-override`, // F6 — analyst fit override
    remove: (id: string) => `/api/quralyst_research/delete-result/${id}`,
    download: (id: string) => `/api/download-stored/${id}/results`,
    inputFilePreview: (resultId: string, fileId: string) =>
      `/api/results/${resultId}/input-files/${encodeURIComponent(fileId)}`,
    inputFileDownload: (resultId: string, fileId: string) =>
      `/api/results/${resultId}/input-files/${encodeURIComponent(fileId)}/download`,
    sendRowEmail: (resultId: string) => `/api/previous-results/${resultId}/send-row-email`,
  },
  customColumn: {
    start: '/api/custom-column',
    status: (resultId: string) =>
      `/api/custom-column/status?result_id=${encodeURIComponent(resultId)}`,
  },
  // Per-row comments (Phase 29) — paths mirror legacy Backup/routes/comments.py.
  // companyName is encoded here: legacy keys comments by (resultId, companyName) and names can
  // contain URL-hostile characters.
  comments: {
    list: (resultId: string) => `/api/comments/${resultId}`,
    forCompany: (resultId: string, companyName: string) =>
      `/api/comments/${resultId}/${encodeURIComponent(companyName)}`,
    save: '/api/comments',
    remove: (commentId: string) => `/api/comments/${commentId}`,
    stats: (resultId: string) => `/api/comments/stats/${resultId}`,
  },
  progress: {
    sse: '/api/sse/progress',
    poll: '/api/quralyst_research/progress',
    fvPoll: '/api/financial-verticals/progress',
    notifyDisconnect: '/api/notify-disconnect',
  },
  billing: {
    checkoutSession: '/api/billing/create-checkout-session',
    topupSession: '/api/billing/create-topup-session',
    portal: '/api/billing/portal',
    salesSeatRequest: '/api/billing/sales-seat-request',
    subscriptionJson: '/api/billing/subscription-json',
    dismissBanner: '/api/dismiss-banner',
    pricing: '/api/billing/pricing/data',
    acceptInvite: (token: string) => `/api/billing/accept-invite/${token}`,
    acceptInviteData: (token: string) => `/api/billing/accept-invite/${token}/data`,
  },
  org: {
    membersData: (slug: string) => `/api/organization/${slug}/members/data`,
    members: (slug: string) => `/api/organization/${slug}/members`,
    edit: (slug: string) => `/api/organization/${slug}/edit`,
    editData: (slug: string) => `/api/organization/${slug}/edit/data`,
    testApiKeys: (slug: string) => `/api/organization/${slug}/test-api-keys`,
    clearApiKeys: (slug: string) => `/api/organization/${slug}/clear-api-keys`,
    rotateJoinCode: (slug: string) => `/api/organization/${slug}/join-code/rotate`,
    inviteSend: (slug: string) => `/api/organization/${slug}/billing/invite/send`,
    inviteRevoke: (slug: string, id: string) =>
      `/api/organization/${slug}/billing/invite/${id}/revoke`,
    invitesData: (slug: string) => `/api/organization/${slug}/invites/data`,
    domains: (slug: string) => `/api/organization/${slug}/domains`,
    domainsData: (slug: string) => `/api/organization/${slug}/domains/data`,
    requestSeats: (slug: string) => `/api/organization/${slug}/request-seats`,
    // SPA data endpoints for tabs the legacy rendered server-side:
    dashboardData: (slug: string) => `/api/organization/${slug}/dashboard/data`,
    billingData: (slug: string) => `/api/organization/${slug}/billing/data`,
    creditLedgerData: (slug: string) => `/api/organization/${slug}/credit-ledger/data`,
    updatesData: (slug: string) => `/api/organization/${slug}/updates/data`,
    crmData: (slug: string) => `/api/organization/${slug}/crm/data`,
  },
  admin: {
    pendingRegistrationsData: '/api/admin/pending-registrations/data',
    orgApprovalsData: '/api/admin/organization-approvals/data',
    orgUpdatesData: '/api/admin/organization-updates/data',
    organizationsData: '/api/admin/organizations/data',
    approveUser: (id: string) => `/api/admin/approve-user/${id}`,
    rejectUser: (id: string) => `/api/admin/reject-user/${id}`,
    deleteUser: (id: string) => `/api/admin/delete-user/${id}`,
    approveOrganization: (id: string) => `/api/admin/approve-organization/${id}`,
    rejectOrganization: (id: string) => `/api/admin/reject-organization/${id}`,
    approveOrgUpdate: (id: string) => `/api/admin/approve-organization-update/${id}`,
    rejectOrgUpdate: (id: string) => `/api/admin/reject-organization-update/${id}`,
    restoreOrganization: (id: string) => `/api/admin/organizations/${id}/restore`,
    // F35.2/F35.3 — provider budgets + platform usage overview (staff)
    providerBudgets: '/api/admin/provider-budgets',
    usageOverview: '/api/admin/usage/overview',
  },
  // Usage dashboard (F35.2/F35.3) — ordinary member surface (not pe:dataset).
  usage: {
    summary: '/api/usage/summary',
    runs: '/api/usage/runs',
    timeseries: '/api/usage/timeseries',
    balances: '/api/usage/balances',
    budgetStatus: '/api/usage/budget-status',
    members: '/api/usage/members',
    pricing: '/api/usage/pricing',
  },
  // BD Scoring (F36.2/F36.3) — ordinary org surface (not pe:dataset).
  bdScoring: {
    templates: '/api/bd-scoring/templates',
    generateTemplate: '/api/bd-scoring/templates/generate',
    template: (id: string) => `/api/bd-scoring/templates/${id}`,
    companies: '/api/bd-scoring/companies',
    company: (id: string) => `/api/bd-scoring/companies/${id}`,
    importCsv: '/api/bd-scoring/companies/import-csv',
    bulkFromRows: '/api/bd-scoring/companies/bulk-from-rows',
    contexts: '/api/bd-scoring/companies/contexts',
    benchmarks: '/api/bd-scoring/benchmarks',
    refreshBenchmarks: '/api/bd-scoring/admin/refresh-benchmarks',
  },
  // Knowledge Bank (Tier A / A1) — org-scoped playbooks that feed RAG guidance into scoring.
  knowledge: {
    list: '/api/knowledge',
    create: '/api/knowledge',
    detail: (id: string) => `/api/knowledge/${id}`,
    search: '/api/knowledge/search',
    upload: '/api/knowledge/upload',
  },
  // Custom Insights (Tier A / A14 / F13) — system preset questions for the insights step.
  customInsights: {
    presets: '/api/custom-insights/presets',
  },
  // Deal Workspaces (Tier B / B1 / F17) — /api/v1/deals
  deals: {
    list: (status: string) => `/api/v1/deals?status=${encodeURIComponent(status)}`,
    create: '/api/v1/deals',
    detail: (id: string) => `/api/v1/deals/${id}`,
    archive: (id: string) => `/api/v1/deals/${id}/archive`,
    stages: (id: string) => `/api/v1/deals/${id}/stages`,
    members: (id: string) => `/api/v1/deals/${id}/members`,
    memberSearch: (id: string, q: string) =>
      `/api/v1/deals/${id}/member-search?q=${encodeURIComponent(q)}`,
    member: (id: string, uid: string) => `/api/v1/deals/${id}/members/${encodeURIComponent(uid)}`,
    lead: (id: string) => `/api/v1/deals/${id}/lead`,
    activity: (id: string, recordId?: string) =>
      recordId
        ? `/api/v1/deals/${id}/activity?recordId=${encodeURIComponent(recordId)}`
        : `/api/v1/deals/${id}/activity`,
    // F18 — pipeline companies / comments / buyer log / reports
    companies: (id: string) => `/api/v1/deals/${id}/companies`,
    company: (id: string, rid: string) => `/api/v1/deals/${id}/companies/${rid}`,
    companiesBulk: (id: string) => `/api/v1/deals/${id}/companies/bulk`,
    companyStage: (id: string, rid: string) => `/api/v1/deals/${id}/companies/${rid}/stage`,
    companyActivity: (id: string, rid: string) => `/api/v1/deals/${id}/companies/${rid}/activity`,
    bulkStage: (id: string) => `/api/v1/deals/${id}/companies/bulk-stage`,
    comments: (id: string, rid: string) => `/api/v1/deals/${id}/companies/${rid}/comments`,
    comment: (id: string, cid: string) => `/api/v1/deals/${id}/comments/${cid}`,
    buyerLog: (id: string) => `/api/v1/deals/${id}/buyer-log`,
    statusReport: (id: string) => `/api/v1/deals/${id}/status-report.xlsx`,
    marketingReport: (id: string) => `/api/v1/deals/${id}/marketing-report.xlsx`,
    // F19 — deal brief + research-list linking
    brief: (id: string) => `/api/v1/deals/${id}/brief`,
    briefCriteria: (id: string) => `/api/v1/deals/${id}/brief/criteria`,
    briefDownload: (id: string) => `/api/v1/deals/${id}/brief/download`,
    lists: (id: string) => `/api/v1/deals/${id}/lists`,
    list_link: (id: string, resultId: string) =>
      `/api/v1/deals/${id}/lists/${encodeURIComponent(resultId)}`,
    linksForResult: (resultId: string) =>
      `/api/v1/deals/lists/for-result/${encodeURIComponent(resultId)}`,
  },
  // Deal Notifications (Tier B / B1 / F20) — in-app bell.
  notifications: {
    list: (unread: boolean, limit = 50) => `/api/v1/notifications?unread=${unread}&limit=${limit}`,
    read: (id: string) => `/api/v1/notifications/${id}/read`,
    readAll: '/api/v1/notifications/read-all',
  },
  // Email Sync (Tier B / B9 / F21) — Gmail/Outlook prior-contact detection.
  emailSync: {
    status: '/api/v1/email-sync/status',
    connect: (provider: string) => `/api/v1/email-sync/${provider}/connect`, // full-page redirect
    disconnect: (provider: string) => `/api/v1/email-sync/${provider}`,
    sync: (provider: string) => `/api/v1/email-sync/${provider}/sync`,
    interactions: (limit = 50) => `/api/v1/email-sync/interactions?limit=${limit}`,
    interactionsBatch: '/api/v1/email-sync/interactions/batch',
    nudgeDismiss: '/api/v1/email-sync/nudge/dismiss',
  },
  // List Enrichment (Tier A / A8 / F14) — post-hoc Apollo enrich on a finished result.
  enrich: {
    start: '/api/enrich-list',
    status: (resultId: string, mode: string) =>
      `/api/enrich-list/status?result_id=${encodeURIComponent(resultId)}&mode=${encodeURIComponent(mode)}`,
  },
  // Analyst Memory (Tier A / A2) — per-user scoring preferences injected after the knowledge block.
  memory: {
    get: '/api/memory',
    update: '/api/memory',
    // System-learned lists (fit_corrections | outcome_signals): remove one, or clear all.
    deleteLearnedItem: (kind: string, index: number) => `/api/memory/learned/${kind}/${index}`,
    clearLearned: (kind: string) => `/api/memory/learned/${kind}`,
    // Behavioral-signal capture (Tier A) — passive, best-effort writes into the memory stores.
    firmDismissal: '/api/memory/signals/firm-dismissal',
    mandateExamples: '/api/memory/signals/mandate-examples',
  },
  // Org Memory (Tier A / A3) — firm-wide thesis (admin-edited) + aggregated outcome signals.
  orgMemory: {
    get: '/api/org-memory',
    update: '/api/org-memory',
    recalculate: '/api/org-memory/recalculate',
  },
  // Outcome Tags & Scorecard (Tier A / A5) — real deal outcomes that feed scoring memory.
  outcomes: {
    list: (resultId: string) => `/api/outcomes/${resultId}`,
    set: (resultId: string, firmKey: string) => `/api/outcomes/${resultId}/${firmKey}`,
    remove: (resultId: string, firmKey: string) => `/api/outcomes/${resultId}/${firmKey}`,
    scorecard: '/api/scorecard',
  },
  // Firm Memory (Tier A / A4) — per-PE-firm team notes plus system-captured signals, injected into
  // Financial Verticals scoring when that firm is scored. Org-scoped; keyed by normalized firm name.
  // The /learn endpoints were removed with the holdings-derived pattern (2026-07-29).
  firmMemory: {
    list: '/api/firm-memory',
    upsert: '/api/firm-memory',
    detail: (firmKey: string) => `/api/firm-memory/${firmKey}`,
    remove: (firmKey: string) => `/api/firm-memory/${firmKey}`,
  },
  // Search Templates (Tier A / A7) — saved, named wizard presets per mode; reload to prefill.
  searchTemplates: {
    list: '/api/search-templates',
    create: '/api/search-templates',
    detail: (id: string) => `/api/search-templates/${id}`,
    update: (id: string) => `/api/search-templates/${id}`,
    remove: (id: string) => `/api/search-templates/${id}`,
  },
  // PE Dataset (F23.4) — gated by the `pe:dataset` permission (staff or explicit grant).
  // Contract: backend Phases/Migration/REF-API-CONTRACT.md §PE Dataset.
  pe: {
    firms: '/api/pe/firms',
    // All firms as {id, name}, unpaginated — backs the firm-filter dropdowns (the paginated
    // `firms` route caps pageSize at 100, which those dropdowns overran → 400).
    firmOptions: '/api/pe/firms/options',
    firm: (id: string) => `/api/pe/firms/${id}`,
    firmScrapeJobs: (id: string) => `/api/pe/firms/${id}/scrape-jobs`,
    firmPortfolioUrls: (id: string) => `/api/pe/firms/${id}/portfolio-urls`,
    firmScrape: (id: string) => `/api/pe/firms/${id}/scrape`,
    // F60 §4 Auto-Enrichment — on-demand enrich enqueue + coverage ledger read.
    firmEnrich: (id: string) => `/api/pe/firms/${id}/enrich`,
    firmEnrichmentStatus: (id: string) => `/api/pe/firms/${id}/enrichment-status`,
    // POST /api/pe/firms/discover is API-only (CU.5): discovery runs server-side
    // inside create/bulk-import — the FE constant/service method were removed.
    bulkImport: '/api/pe/firms/bulk-import',
    scrapeAll: '/api/pe/firms/scrape-all',
    // CSV export of the firm directory (honors search/status filters). Server-built,
    // audited (pe.firms.export). GET — a plain download, no body.
    firmsExport: '/api/pe/firms/export',
    // Holdings (F24.1) — aggregated cross-firm portfolio dataset. page is 0-based.
    holdings: '/api/pe/holdings',
    holding: (id: string) => `/api/pe/holdings/${id}`,
    holdingTeam: (id: string) => `/api/pe/holdings/${id}/team`,
    holdingEnrichment: (id: string) => `/api/pe/holdings/${id}/enrichment`,
    holdingAiEnrich: (id: string) => `/api/pe/holdings/${id}/ai-enrich`,
    // People (F25.1/F25.2) — platform-global team directory. offset-based pagination.
    // Batch ops return 202 {processId, processType}; progress via endpoints.progress.sse.
    people: '/api/pe/people',
    peopleSummary: '/api/pe/people/summary',
    peopleScrape: '/api/pe/people/scrape',
    person: (id: string) => `/api/pe/people/${id}`,
    personFlag: (id: string) => `/api/pe/people/${id}/flag`,
    personUnflag: (id: string) => `/api/pe/people/${id}/unflag`,
    peopleTag: '/api/pe/people/tag',
    peopleTagFocus: '/api/pe/people/tag-focus',
    peopleFindEmails: '/api/pe/people/find-emails',
    peopleVerifyEmails: '/api/pe/people/verify-emails',
    peopleContactEnrich: '/api/pe/people/contact-enrich',
    peopleScrapeBatch: '/api/pe/people/scrape-batch',
    peopleScrapeByFirms: '/api/pe/people/scrape-by-firms',
    peopleExportResolve: '/api/pe/people/export/resolve',
    peopleExport: '/api/pe/people/export',

    // Review queue + corrections (F27.1/F27.2). Router-level `require_pe_access`
    // (staff or pe:dataset grant); the corrections rule-enable/disable + real apply are
    // staff-only server-side. Contract: backend REF-API-CONTRACT.md §PE Dataset — Review
    // Queue / Corrections + the F27 routers (app/routers/pe/review_queue.py, corrections.py).
    reviewQueue: '/api/pe/review-queue',
    reviewQueueStats: '/api/pe/review-queue/stats',
    reviewItem: (id: string) => `/api/pe/review-queue/${id}`,
    reviewBulkApprove: '/api/pe/review-queue/bulk-approve',
    corrections: '/api/pe/corrections',
    correctionsApply: '/api/pe/corrections/apply',
    correctionRuleEnable: (id: string) => `/api/pe/corrections/rules/${id}/enable`,
    correctionRuleDisable: (id: string) => `/api/pe/corrections/rules/${id}/disable`,

    // Screener (F29.2) — four-tab search + find-similar over the whole PE dataset. Gated by
    // `require_pe_access` (staff OR pe:dataset grant). Contract: backend REF-API-CONTRACT.md
    // §PE Dataset — Screener. `find-similar-firms` is a CSRF-protected POST.
    screenerHoldings: '/api/pe/screener/holdings',
    screenerFirms: '/api/pe/screener/firms',
    screenerPeople: '/api/pe/screener/people',
    screenerOptions: '/api/pe/screener/options',
    screenerHoldingsStats: '/api/pe/screener/holdings-stats',
    screenerFindSimilar: '/api/pe/screener/find-similar-firms',

    // Signals / Exit Watch (F30.2) — derived analytics over the PE dataset. Gated by
    // `require_pe_access` (staff OR pe:dataset grant). All GETs; 60 s server cache. Contract:
    // backend REF-API-CONTRACT.md §PE Dataset — Signals. Types: `src/types/peSignals.ts`.
    signalsFirm: (id: string) => `/api/pe/signals/firms/${id}`,
    signalsFirms: '/api/pe/signals/firms',
    signalsSectors: '/api/pe/signals/sectors',
    signalsExitReadiness: '/api/pe/signals/exit-readiness',

    // Changes / Activity Feed (F31.2) — reverse-chronological feed of detected portfolio activity.
    // Gated by `require_pe_access` (staff OR pe:dataset grant). Both GETs; read-only. Contract:
    // backend REF-API-CONTRACT.md §PE Dataset — Changes. Types: `src/types/peChanges.ts`.
    changes: '/api/pe/changes',
    changesSummary: '/api/pe/changes/summary',

    // Analysis Dashboard / Analytics (F32.2) — market-level aggregations over the PE dataset. Gated by
    // `require_pe_access` (staff OR pe:dataset grant). All GETs; 60 s server cache; every endpoint
    // takes `?window=&segment=`. Contract: backend REF-API-CONTRACT.md §PE Dataset — Analysis
    // Dashboard / Analytics. Types: `src/types/peAnalytics.ts`.
    analyticsMostActiveFirms: '/api/pe/analytics/most-active-firms',
    analyticsMostExits: '/api/pe/analytics/most-exits',
    analyticsTopSectors: '/api/pe/analytics/top-sectors',
    analyticsRecentBySector: '/api/pe/analytics/recent-by-sector',
    analyticsActivityTrend: '/api/pe/analytics/activity-trend',
    analyticsSummary: '/api/pe/analytics/summary',
    analyticsGeographicClusters: '/api/pe/analytics/geographic-clusters',
    analyticsHoldPeriods: '/api/pe/analytics/hold-periods',

    // Talent Flow (F33.2) — detected cross-firm professional moves + per-person career history. Gated
    // by `require_pe_access` (staff OR pe:dataset grant). Both GETs; read-only. Contract: backend
    // REF-API-CONTRACT.md §PE Dataset — Talent Flow. Types: `src/types/peTalentFlow.ts`.
    talentFlowMoves: '/api/pe/talent-flow/moves',
    personHistory: (id: string) => `/api/pe/people/${id}/history`,

    // Digest (F37.2) — ranked market-event feed over a window. Gated by require_pe_access
    // (staff OR pe:dataset grant). Read-only GET; 60 s server memo. Contract: backend
    // REF-API-CONTRACT.md §PE Dataset — Digest. Types: `src/types/peDigest.ts`.
    digest: '/api/pe/digest',

    // Market Map (F38.2) — buyer universe + whitespace. Gated by require_pe_access.
    // Contract: backend REF-API-CONTRACT.md §PE Dataset — Market Map.
    marketMapOptions: '/api/pe/market-map/options',
    marketMapBuyers: '/api/pe/market-map/buyers',
    marketMapWhitespace: '/api/pe/market-map/whitespace',

    // Ask the Market (F39.2) — NL Q&A with citations. CSRF-protected POST.
    // Contract: backend REF-API-CONTRACT.md §PE Dataset — Ask the Market.
    qa: '/api/pe/qa',

    // Tearsheets (F40.2) — AI company dossiers. CSRF on POST/DELETE/rerun.
    // Contract: backend REF-API-CONTRACT.md §PE Dataset — Tearsheets.
    tearsheets: '/api/pe/tearsheets',
    tearsheetsStats: '/api/pe/tearsheets/stats',
    tearsheetsRecent: '/api/pe/tearsheets/recent',
    tearsheet: (id: string) => `/api/pe/tearsheets/${id}`,
    tearsheetRerun: (id: string) => `/api/pe/tearsheets/${id}/rerun`,
    tearsheetCancel: (id: string) => `/api/pe/tearsheets/${id}/cancel`,
    tearsheetGammaPdf: (id: string, download?: boolean) =>
      `/api/pe/tearsheets/${id}/gamma.pdf${download ? '?download=1' : ''}`,
    tearsheetGammaPptx: (id: string, download?: boolean) =>
      `/api/pe/tearsheets/${id}/gamma.pptx${download ? '?download=1' : ''}`,
    tearsheetGammaRerun: (id: string) => `/api/pe/tearsheets/${id}/gamma/rerun`,

    // News Feed (F41.2) — curated SMB/M&A headlines. Read-only GET.
    // Contract: backend REF-API-CONTRACT.md §PE Dataset — News Feed.
    news: '/api/pe/news',

    // Data Tools (F42.3) — single-shot + bulk enrichment utilities. CSRF on mutations.
    // Contract: backend REF-API-CONTRACT.md §PE Dataset — Data Tools.
    toolsUrlLookup: '/api/pe/tools/url-lookup',
    toolsUrlBulk: '/api/pe/tools/url-lookup/bulk',
    toolsUrlRecent: '/api/pe/tools/url-lookup/recent',
    toolsPeLookup: '/api/pe/tools/pe-lookup',
    toolsPeBulk: '/api/pe/tools/pe-lookup/bulk',
    toolsPeRecent: '/api/pe/tools/pe-lookup/recent',
    toolsLocationLookup: '/api/pe/tools/location-lookup',
    toolsLocationBulk: '/api/pe/tools/location-lookup/bulk',
    toolsLocationRecent: '/api/pe/tools/location-lookup/recent',
    toolsGicsClassify: '/api/pe/tools/gics-classify',
    toolsGicsBulk: '/api/pe/tools/gics-classify/bulk',
    toolsGicsHoldings: '/api/pe/tools/gics-classify/holdings',
    toolsGicsRecent: '/api/pe/tools/gics-classify/recent',
    toolsJobs: '/api/pe/tools/jobs',
    toolsJob: (id: string) => `/api/pe/tools/jobs/${id}`,
    toolsJobResults: (id: string) => `/api/pe/tools/jobs/${id}/results`,
    toolsJobResume: (id: string) => `/api/pe/tools/jobs/${id}/resume`,
  },
  // IB Vertical (F34.4) — investment banks + tombstone transactions + professionals + advisory
  // league table. Gated by the SAME `pe:dataset` permission as PE (`require_pe_access`); staff-only
  // ops (DELETE bank, infer-emails, scan-contact-pages, the three re-queues) ride `require_staff`.
  // Contract: backend Phases/Migration/REF-API-CONTRACT.md §IB Vertical (Tier C, F34).
  ib: {
    banks: '/api/ib',
    bank: (id: string) => `/api/ib/${id}`,
    bankScrape: (id: string) => `/api/ib/${id}/scrape`,
    bankEnrich: (id: string) => `/api/ib/${id}/enrich`,
    bankEnrichmentStatus: (id: string) => `/api/ib/${id}/enrichment-status`,
    bankTransactions: (id: string) => `/api/ib/${id}/transactions`,
    bankPeople: (id: string) => `/api/ib/${id}/people`,
    bulkImport: '/api/ib/bulk-import',
    scrapeAll: '/api/ib/scrape-all',
    scrapeStatus: '/api/ib/scrape-status',
    coverageStats: '/api/ib/coverage-stats',
    // Staff-only re-queues + PII ops (backend require_staff — the UI hides these unless can('pe:admin')).
    rescrapePeople: '/api/ib/rescrape-people',
    rescrapeTransactions: '/api/ib/rescrape-transactions',
    /** Live deal re-scrape progress (QURALYST-20 InvestmentBanks panel). */
    rescrapeTransactionsProgress: '/api/ib/rescrape-transactions/progress',
    rescrapeZeroCoverage: '/api/ib/rescrape-zero-coverage',
    inferEmails: '/api/ib/infer-emails',
    scanContactPages: '/api/ib/scan-contact-pages',
    // Reads
    transactions: '/api/ib/transactions',
    people: '/api/ib/people',
    screenerStats: '/api/ib/screener/stats',
    discover: '/api/ib/discover',
    leagueTable: '/api/ib/analytics/league-table',
  },
  // PE Dataset — Admin Ops (F28.2) — STAFF-ONLY operator console. Backend 403s non-staff.
  // Contract: backend Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Admin Ops
  // (+ "F28 admin-ops additions"). Trigger ops enqueue and return 202; mutations echo CSRF.
  peAdmin: {
    scraperPause: '/api/pe/admin/scraper-pause',
    scrapeQueue: '/api/pe/admin/scrape-queue',
    stats: '/api/pe/admin/stats',
    dedupFirms: '/api/pe/admin/dedup-firms',
    // `op` is a path segment — includes the two-segment `holdings/re-enrich-missing-descriptions`.
    trigger: (op: string) => `/api/pe/admin/${op}`,
    triggerStatus: (op: string) => `/api/pe/admin/${op}/status`,
    notFound: (kind: 'holdings' | 'people') => `/api/pe/admin/not-found/${kind}`,
    notFoundItem: (id: string) => `/api/pe/admin/not-found/${id}`,
    notFoundExit: (id: string) => `/api/pe/admin/not-found/${id}/exit`,
    notFoundKeep: (id: string) => `/api/pe/admin/not-found/${id}/keep`,
    portfolioQuality: '/api/pe/admin/portfolio-companies-quality',
    portfolioQualityStatus: '/api/pe/admin/portfolio-companies-quality/status',
    resetAndBackfill: '/api/pe/admin/reset-and-backfill',
    queueSampleRescrape: '/api/pe/admin/queue-sample-rescrape',
    // CU.5: pe_dataset access grants (GET list / POST grant-or-revoke) + the CU.3
    // drain-state read. run-talent-flow rides the trigger(op) builder above.
    accessGrants: '/api/pe/admin/access-grants',
    pipelineStatus: '/api/pe/admin/pipeline-status',
    // F50 — per-queue observability + queue ops. The estate is SEVEN collections since F46, so
    // `scrapeQueue` above (fleet-wide recent jobs) can no longer answer "is this queue healthy".
    // NB `pipelineHealth` is the Tier-5 *data* health (projection staleness / semantic coverage);
    // `pipelineStatus` above is the in-process enrichment-drain state. Different things.
    queues: '/api/pe/admin/queues',
    queueJobs: (queue: string) => `/api/pe/admin/queues/${queue}/jobs`,
    queueJobRequeue: (queue: string, jobId: string) =>
      `/api/pe/admin/queues/${queue}/jobs/${jobId}/requeue`,
    // F65 — single-job delete. `queuePurge` below removes EVERY failed job on the queue, which is
    // the wrong tool for discarding one dead job while triaging the rest.
    queueJobDelete: (queue: string, jobId: string) => `/api/pe/admin/queues/${queue}/jobs/${jobId}`,
    queuePurge: (queue: string) => `/api/pe/admin/queues/${queue}/purge`,
    queuePause: (queue: string) => `/api/pe/admin/queues/${queue}/pause`,
    pipelineHealth: '/api/pe/admin/pipeline-health',
  },
  // Frontend log shipping — batched entries are re-emitted through the backend logger to
  // CloudWatch (no DB; Phase 15), tagged source=frontend.
  logs: {
    ship: '/api/logs',
  },
  // Ops carve-outs — bare JSON (not the {success,data} envelope). Used by
  // /backend-connection-testing; prefer raw fetch over http().
  ops: {
    health: '/api/health',
    healthSecrets: '/api/health/secrets',
  },
} as const;
