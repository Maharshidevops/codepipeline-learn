// PE Dataset fixtures (F23.4 + F24.3 + F25.3) — mirror the backend contract shapes exactly.
import type {
  PEFirm,
  PEHolding,
  PEHoldingEnrichment,
  PEHoldingTeam,
  PEPeopleResolveResult,
  PEPeopleSummary,
  PEPerson,
  PEPersonRow,
  PEScrapeJob,
} from '@/types';

export const mockPeFirms: PEFirm[] = [
  {
    id: 'pef1',
    name: 'Vista Equity Partners',
    websiteUrl: 'https://vistaequitypartners.com',
    portfolioUrl: 'https://vistaequitypartners.com/companies',
    criteriaUrl: 'https://vistaequitypartners.com/approach',
    teamPageUrl: null,
    description: 'Enterprise software buyout firm.',
    status: 'active',
    scrapeFrequencyHours: 24,
    revMin: 100,
    revMax: 200,
    negativeEbitdaOk: false,
    ebitdaMin: 10,
    ebitdaMax: 40,
    evMin: 40,
    evMax: 280,
    equityCheckMin: 16,
    equityCheckMax: 168,
    sectorCriteria: 'Enterprise software',
    geoCriteria: 'North America',
    sectorCriteriaInferred: 'Software',
    geoCriteriaInferred: 'West US',
    criteriaAutoFilled: { evMin: 'estimated' },
    sizeCriteriaDerived: 'evMin,evMax,equityCheckMin,equityCheckMax',
    sizeCriteriaSource: 'scrape',
    firmHostKey: 'vistaequitypartners.com',
    holdingsCount: 42,
    peopleCount: 12,
    lastScrapedAt: '2026-07-06T10:00:00Z',
    createdAt: '2026-06-01T09:00:00Z',
    freshness: 'fresh',
  },
  {
    id: 'pef2',
    name: 'Quarantine Capital',
    websiteUrl: 'https://quarantine-cap.example.com',
    portfolioUrl: null,
    criteriaUrl: null,
    teamPageUrl: null,
    description: null,
    status: 'error',
    scrapeFrequencyHours: 24,
    revMin: null,
    revMax: null,
    negativeEbitdaOk: null,
    ebitdaMin: null,
    ebitdaMax: null,
    evMin: null,
    evMax: null,
    equityCheckMin: null,
    equityCheckMax: null,
    sectorCriteria: null,
    geoCriteria: null,
    sectorCriteriaInferred: null,
    geoCriteriaInferred: null,
    criteriaAutoFilled: null,
    sizeCriteriaDerived: null,
    sizeCriteriaSource: null,
    firmHostKey: 'quarantine-cap.example.com',
    holdingsCount: 0,
    peopleCount: 0,
    lastScrapedAt: null,
    createdAt: '2026-07-01T09:00:00Z',
    freshness: 'never',
  },
];

export const mockPeScrapeJobs: PEScrapeJob[] = [
  {
    id: 'job1',
    firmId: 'pef1',
    ibFirmId: null,
    jobType: 'portfolio',
    status: 'completed',
    trigger: 'manual',
    retryCount: 0,
    errorMessage: null,
    claimedBy: 'worker-1',
    createdAt: '2026-07-06T09:58:00Z',
    startedAt: '2026-07-06T09:59:00Z',
    completedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'job2',
    firmId: 'pef1',
    ibFirmId: null,
    jobType: 'criteria',
    status: 'failed',
    trigger: 'bulk',
    retryCount: 1,
    errorMessage: '[permanent] criteria page unreachable',
    claimedBy: 'worker-2',
    createdAt: '2026-07-05T09:00:00Z',
    startedAt: '2026-07-05T09:01:00Z',
    completedAt: '2026-07-05T09:02:00Z',
  },
];

// ---------------------------------------------------------------------------
// Holdings (F24.3). A base helper keeps the many contract fields tidy; each
// fixture overrides only what the test cares about.
// ---------------------------------------------------------------------------

function makeHolding(
  overrides: Partial<PEHolding> & Pick<PEHolding, 'id' | 'companyName'>,
): PEHolding {
  return {
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    companyKey: overrides.companyName.toLowerCase().replace(/\s+/g, '-'),
    sector: 'Enterprise software',
    subSector: null,
    geography: 'North America',
    city: null,
    state: null,
    country: 'United States',
    investmentStatus: 'current',
    foundingYear: null,
    investmentDate: '2021',
    exitDate: null,
    estimatedInvestmentYear: null,
    estimatedInvestmentMonth: null,
    estimatedInvestmentConfidence: null,
    description: 'A portfolio company.',
    aiDescription: null,
    aiKeywords: [],
    keyProductsServices: [],
    websiteUrl: 'https://example.com',
    peDetailUrl: null,
    logoUrl: null,
    pendingReview: false,
    manuallyCurated: false,
    qualityScore: 1,
    sources: { companyName: 'scrape', sector: 'scrape' },
    firstSeenAt: '2026-06-01T09:00:00Z',
    lastSeenAt: '2026-07-06T10:00:00Z',
    createdAt: '2026-06-01T09:00:00Z',
    quality: {
      overallTier: 'valid',
      hasIssue: false,
      fields: {
        companyName: { tier: 'valid', reasons: [] },
        sector: { tier: 'valid', reasons: [] },
      },
    },
    // F66 Unit 3: the backend only computes this on a firmId-filtered list, and defaults it to
    // false elsewhere rather than omitting it. Individual fixtures override it.
    hasTeam: false,
    ...overrides,
  };
}

// Clean rows across two firms — the default (quality=all) view.
export const mockPeHoldings: PEHolding[] = [
  makeHolding({
    id: 'peh1',
    companyName: 'Acme Analytics',
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    sector: 'Data & Analytics',
    // Operator-edited sector → provenance badge distinct in the drawer.
    sources: { companyName: 'scrape', sector: 'operator' },
    // Has real people attached (mockPeHoldingTeams.peh1) → the row's team indicator shows.
    hasTeam: true,
  }),
  makeHolding({
    id: 'peh2',
    companyName: 'Beacon Health',
    firmId: 'pef2',
    firmName: 'Quarantine Capital',
    sector: 'Healthcare IT',
    investmentStatus: 'realized',
    investmentDate: '2018',
    geography: 'Europe',
  }),
  makeHolding({
    id: 'peh3',
    companyName: 'Cobalt Robotics',
    sector: null,
    investmentStatus: 'unknown',
    investmentDate: null,
    estimatedInvestmentYear: '2020',
    estimatedInvestmentMonth: 'Mar',
    estimatedInvestmentConfidence: 0.8,
    geography: null,
  }),
];

// Suspect-quality rows — present-but-bad fields (hasIssue=true) with reason chips.
export const mockPeSuspectHoldings: PEHolding[] = [
  makeHolding({
    id: 'pehs1',
    companyName: 'Dodgy Domains',
    websiteUrl: 'not-a-real-domain',
    sources: { companyName: 'scrape', websiteUrl: 'scrape' },
    quality: {
      overallTier: 'suspect',
      hasIssue: true,
      fields: {
        companyName: { tier: 'valid', reasons: [] },
        websiteUrl: { tier: 'suspect', reasons: ['no_tld'] },
      },
    },
  }),
  makeHolding({
    id: 'pehs2',
    companyName: 'Empty Sector Co',
    sector: 'x',
    sources: { companyName: 'scrape', sector: 'scrape' },
    quality: {
      overallTier: 'invalid',
      hasIssue: true,
      fields: {
        sector: { tier: 'invalid', reasons: ['too_short', 'not_a_sector'] },
      },
    },
  }),
];

// ---------------------------------------------------------------------------
// People (F25.3). A base helper keeps the many contract fields tidy; each
// fixture overrides only what the test cares about.
// ---------------------------------------------------------------------------

function makePerson(
  overrides: Partial<PEPersonRow> & Pick<PEPersonRow, 'id' | 'name'>,
): PEPersonRow {
  return {
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    firstName: null,
    lastName: null,
    title: 'Partner',
    bio: null,
    bioSource: null,
    email: null,
    emailInferred: false,
    emailSource: null,
    emailLabel: null,
    emailVerificationStatus: null,
    emailVerificationScore: null,
    emailVerifiedAt: null,
    phone: null,
    phoneSource: null,
    linkedinUrl: null,
    linkedinSource: null,
    contactSourceUrl: null,
    photoUrl: null,
    pageUrl: null,
    location: null,
    strategy: null,
    roleTag: null,
    focusTags: [],
    portfolioCompanies: [],
    sector: null,
    reviewFlags: [],
    flaggedAt: null,
    flagReason: null,
    pendingReview: false,
    manuallyCurated: false,
    firstSeenAt: '2026-06-01T09:00:00Z',
    lastSeenAt: '2026-07-06T10:00:00Z',
    createdAt: '2026-06-01T09:00:00Z',
    ...overrides,
  };
}

export const mockPePeople: PEPersonRow[] = [
  makePerson({
    id: 'ppl1',
    name: 'Ada Partner',
    title: 'Managing Partner',
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    // Apollo-sourced, confirmed-deliverable email → both provenance badges render.
    email: 'ada@vistaequitypartners.com',
    emailSource: 'apollo',
    emailLabel: 'Apollo',
    emailInferred: false,
    emailVerificationStatus: 'deliverable',
    emailVerificationScore: 0.92,
    linkedinUrl: 'https://linkedin.com/in/ada',
    phone: '+1 555 0100',
    roleTag: 'investment',
    focusTags: ['Technology'],
    bio: 'Leads enterprise software investments.',
  }),
  makePerson({
    id: 'ppl2',
    name: 'Ben Operator',
    title: 'Operating Partner',
    firmId: 'pef1',
    firmName: 'Vista Equity Partners',
    // Inferred email → warning label, no verification yet.
    email: 'ben@vistaequitypartners.com',
    emailSource: null,
    emailLabel: 'Inferred',
    emailInferred: true,
    roleTag: 'operations',
  }),
  makePerson({
    id: 'ppl3',
    name: 'Cara Advisor',
    title: 'Senior Advisor',
    firmId: 'pef2',
    firmName: 'Quarantine Capital',
    // F66 §2 vocabulary: `advisory`, not the pre-F66 `advisor`. ROLE_LABEL still maps the old
    // spelling for un-retagged rows, but a fixture should mirror what the backend now emits.
    roleTag: 'advisory',
    focusTags: ['Healthcare'],
    // Already flagged → the Unflag control renders in that row.
    flaggedAt: '2026-07-01T09:00:00Z',
    flagReason: 'Left the firm',
  }),
];

export const mockPePeopleSummary: PEPeopleSummary = {
  total: 3,
  tagged: 3,
  tagDistribution: [
    { role: 'investment', count: 1 },
    { role: 'operations', count: 1 },
    { role: 'advisor', count: 1 },
  ],
  firms: [
    {
      firmId: 'pef1',
      firmName: 'Vista Equity Partners',
      count: 2,
      withLinkedin: 1,
      withEmail: 1,
      withInferredEmail: 1,
      withBio: 1,
      withPhoto: 0,
      withTags: 2,
    },
    {
      firmId: 'pef2',
      firmName: 'Quarantine Capital',
      count: 1,
      withLinkedin: 0,
      withEmail: 0,
      withInferredEmail: 0,
      withBio: 0,
      withPhoto: 0,
      withTags: 1,
    },
  ],
};

export const mockPePeopleResolve: PEPeopleResolveResult = {
  matched: [
    {
      firmId: 'pef1',
      firmName: 'Vista Equity Partners',
      websiteUrl: 'https://vistaequitypartners.com',
    },
  ],
  partialMatches: [
    {
      firmId: 'pef2',
      firmName: 'Quarantine Capital',
      websiteUrl: 'https://quarantine-cap.example.com',
      inputUrl: 'https://blog.quarantine-cap.example.com',
      warning: 'Matched via parent domain',
    },
  ],
  unmatched: ['https://unknown-firm.example.com'],
};

// F66 Unit 3 — every field the backend's `_team_person` projection sends, populated. The old
// fixture left photoUrl/email/phone/linkedinUrl null on the one person it had, which meant no
// test ever exercised the contact icons or the avatar and the snake_case wire bug stayed
// invisible. A fixture that only covers the null path cannot catch a casing mismatch.
function makeTeamMember(over: Partial<PEPerson> & Pick<PEPerson, 'id' | 'name'>): PEPerson {
  return {
    title: null,
    email: null,
    emailInferred: false,
    emailSource: null,
    emailVerificationStatus: null,
    emailVerificationScore: null,
    emailVerifiedAt: null,
    phone: null,
    phoneSource: null,
    linkedinUrl: null,
    linkedinSource: null,
    contactSourceUrl: null,
    photoUrl: null,
    bio: null,
    bioSource: null,
    roleTag: null,
    focusTags: null,
    matchType: 'direct',
    ...over,
  };
}

// Team responses keyed by matchType so tests can pick a firm/holding to exercise each rung.
/** GET /holdings/:id/enrichment — the pipeline ledger read.
 *
 * peh1 is the interesting case and mirrors production: GICS answered, the URL pass RAN and
 * found nothing, and the location pass has not reached this holding at all (null, not an
 * empty object). Those three states must stay distinguishable in the UI — the counts in the
 * worker log cannot express them, which is the whole reason this panel exists. */
export const mockPeHoldingEnrichment: Record<string, PEHoldingEnrichment> = {
  peh1: {
    companyName: 'Acme Analytics',
    gics: {
      status: 'found',
      confidence: 'high',
      errorMessage: null,
      checkedAt: '2026-08-09T19:12:14.742000',
      sector: 'Industrials',
      sectorCode: '20',
      industryGroup: 'Commercial & Professional Services',
      industryGroupCode: '2020',
      industry: 'Commercial Services & Supplies',
      industryCode: '202010',
      subIndustry: 'Environmental & Facilities Services',
      subIndustryCode: '20201050',
      reasoning: null,
    },
    url: {
      status: 'not_found',
      confidence: 'not_found',
      errorMessage: null,
      checkedAt: '2026-08-09T19:09:23.024000',
      url: null,
      location: null,
      description: null,
    },
    location: null,
  },
  default: { companyName: 'Unknown', gics: null, url: null, location: null },
};

export const mockPeHoldingTeams: Record<string, PEHoldingTeam> = {
  // Mixed rungs: one direct hit plus two sector-focus matches, i.e. the "1 direct / 2 Energy
  // focus" shape the reference UI shows. The direct member carries a full contact set.
  peh1: {
    matchType: 'direct',
    sector: 'Energy',
    directCount: 1,
    sectorCount: 2,
    fallbackCount: 0,
    people: [
      makeTeamMember({
        id: 'per1',
        name: 'Dana Director',
        title: 'Managing Partner',
        email: 'dana@example.com',
        emailSource: 'apollo',
        emailVerificationStatus: 'deliverable',
        phone: '+15551234567',
        linkedinUrl: 'https://www.linkedin.com/in/danadirector',
        photoUrl: 'https://cdn.example.com/dana.jpg',
        bio: 'Sits on the board of Northwind Analytics.',
        roleTag: 'investment',
        focusTags: ['Energy'],
        matchType: 'direct',
      }),
      makeTeamMember({
        id: 'per2',
        name: 'Sam Sector',
        title: 'Principal',
        email: 'sam@example.com',
        roleTag: 'investment',
        focusTags: ['Energy'],
        matchType: 'sector',
      }),
      makeTeamMember({
        id: 'per3',
        // No photo → the initials avatar path.
        name: 'Ana Analyst',
        title: 'Analyst, Deal Team',
        roleTag: 'investment',
        focusTags: ['Energy'],
        matchType: 'sector',
      }),
    ],
  },
  // The firm-lead floor: nothing matched, so the senior investment lead stands in.
  peh2: {
    matchType: 'firm_fallback',
    sector: 'Technology',
    directCount: 0,
    sectorCount: 0,
    fallbackCount: 1,
    people: [
      makeTeamMember({
        id: 'per4',
        name: 'Lee Lead',
        title: 'Founding Partner',
        roleTag: 'investment',
        matchType: 'fallback',
      }),
    ],
  },
  // Everything else degrades to the empty `none` rung (a firm with no people at all).
  default: {
    matchType: 'none',
    sector: null,
    directCount: 0,
    sectorCount: 0,
    fallbackCount: 0,
    people: [],
  },
};
