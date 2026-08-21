// Results fixtures (dummy-data mode): seeds all 3 tab types (covering the varied filtersApplied
// shapes), one detailed result with CRM rows + columns, and summary stats. mockUser.id is the owner
// so delete buttons show.
import type { ResultDetail, ResultSummary, ResultTab, SummaryStats } from '@/types';
import { mockUser } from './users';

const OWNER = mockUser.id;

function targetResult(n: number, owner: boolean): ResultSummary {
  return {
    processId: `tl_${n}`,
    createdAt: `2026-02-${String(20 - n).padStart(2, '0')}T13:30:00Z`,
    username: owner ? 'Jatin Choudhary' : 'Maya Patel',
    userId: owner ? OWNER : 'u2',
    totalMatches: 120 + n * 7,
    filesUploaded: [
      {
        displayFilename: `targets_batch_${n}.csv`,
        fileName: `targets_batch_${n}.csv`,
        gridfsId: `gridfs_tl_${n}_1`,
        totalFileRecords: 240 + n * 10,
        matchesFound: 120 + n * 7,
      },
      ...(n % 2 === 0
        ? [
            {
              displayFilename: `supplement_${n}.xlsx`,
              fileName: `supplement_${n}.xlsx`,
              gridfsId: `gridfs_tl_${n}_2`,
              totalFileRecords: 80,
              matchesFound: 12,
            },
          ]
        : []),
    ],
    resultFilename: `target_list_results_${n}.xlsx`,
    hasResultsFile: true,
    filtersApplied: {
      industryPairs: [
        { industry: 'Software', subIndustry: 'B2B SaaS' },
        { industry: 'Healthcare', subIndustry: 'Medical Devices' },
      ],
      locationGroups: [
        { continent: 'North America', country: 'United States', state: 'California' },
        { continent: 'Europe', country: 'United Kingdom' },
      ],
      minEmployees: 50,
      maxEmployees: 500,
      minRevenue: 10_000_000,
      maxRevenue: 50_000_000,
      businessQueries: ['Vertical SaaS for logistics', 'AI-enabled analytics'],
      customInsights: {
        questions: ['Has the company raised funding recently?', 'Key executives?'],
      },
      // Activity / matching (varied by n so result cards differ).
      primaryActivity: n % 2 === 0 ? 'Product' : 'Both',
      secondaryActivity: n % 2 === 0 ? 'Manufacturer' : 'Distributor',
      sizeCriteriaLogic: n % 2 === 0 ? 'AND' : 'OR',
      primaryBusinessOnly: n % 3 === 0,
      skipWebsiteScraping: false,
      // Enrichment toggles (API camelCase keys).
      useApollo: true,
      useNews: n % 2 === 0,
      useAcquisitionNews: n % 2 === 0,
      enableLinkedinEnrichment: n % 3 !== 0,
      ownershipEnrichment: false,
      acquisitionEnrichment: false,
      blankFieldBackfill: false,
      // Additional-source searches + caps.
      enableApolloSearch: true,
      apolloMaxResults: 100,
      enableGmapsSearch: n % 2 === 0,
      gmapsMaxResults: 50,
      enableCoresignalSearch: false,
      enableLinkedinSearch: n % 3 === 0,
      linkedinMaxResults: 25,
      // AI model selection (varied so cards show default vs custom).
      llmProviders: n % 2 === 0 ? ['openai', 'google'] : null,
      llmFallbackEnabled: n % 2 === 0,
    },
  };
}

function strategicResult(n: number): ResultSummary {
  return {
    processId: `sb_${n}`,
    createdAt: `2026-02-${String(18 - n).padStart(2, '0')}T10:00:00Z`,
    username: 'Liam Ng',
    userId: 'u3',
    totalMatches: 40 + n * 3,
    filesUploaded: [
      {
        displayFilename: `seller_profile_${n}.csv`,
        fileName: `seller_profile_${n}.csv`,
        gridfsId: `gridfs_sb_${n}`,
        totalFileRecords: 55,
        matchesFound: 40 + n * 3,
      },
    ],
    resultFilename: `strategic_buyers_${n}.xlsx`,
    hasResultsFile: true,
    filtersApplied: {
      industryPairs: [{ industry: 'Industrials', subIndustry: 'Automation' }],
      locationGroups: [{ country: 'United States' }],
      businessQueries: ['Strategic acquirers in adjacent verticals'],
      customInsights: { questions: ['Horizontal vs vertical fit?'] },
      // Activity / matching.
      primaryActivity: 'Service',
      secondaryActivity: 'Not Applicable',
      sizeCriteriaLogic: n % 2 === 0 ? 'OR' : 'AND',
      primaryBusinessOnly: true,
      skipWebsiteScraping: n % 2 === 0,
      // Enrichment toggles (API camelCase keys).
      useApollo: n % 2 === 0,
      useNews: true,
      useAcquisitionNews: true,
      enableLinkedinEnrichment: true,
      ownershipEnrichment: n % 2 === 0,
      acquisitionEnrichment: n % 2 === 0,
      blankFieldBackfill: n % 3 === 0,
      // Additional-source searches + caps.
      enableApolloSearch: n % 2 === 0,
      apolloMaxResults: 75,
      enableGmapsSearch: false,
      enableCoresignalSearch: true,
      coresignalMaxResults: 40,
      enableLinkedinSearch: true,
      linkedinMaxResults: 30,
      llmProviders: n % 2 === 0 ? ['anthropic'] : ['openai', 'anthropic', 'google'],
      llmFallbackEnabled: true,
    },
  };
}

function fvResult(n: number): ResultSummary {
  return {
    processId: `fv_${n}`,
    resultId: `fv_${n}`,
    createdAt: `2026-02-${String(16 - n).padStart(2, '0')}T09:00:00Z`,
    username: 'Sara Kim',
    userId: 'u4',
    totalCount: 25 + n * 2,
    filesUploaded: [],
    hasResultsFile: false,
    filtersApplied: {
      industry: 'Software',
      subIndustry: 'Vertical SaaS',
      location: { state: 'New York', country: 'United States' },
    },
  };
}

export const mockResultsByTab: Record<ResultTab, ResultSummary[]> = {
  'target-list': Array.from({ length: 8 }, (_, i) => targetResult(i + 1, i % 3 !== 0)),
  'strategic-buyer': Array.from({ length: 5 }, (_, i) => strategicResult(i + 1)),
  'fv-results': Array.from({ length: 4 }, (_, i) => fvResult(i + 1)),
  tearsheets: [],
};

export const mockResultUsers = [
  { id: OWNER, fullName: 'Jatin Choudhary' },
  { id: 'u2', fullName: 'Maya Patel' },
  { id: 'u3', fullName: 'Liam Ng' },
  { id: 'u4', fullName: 'Sara Kim' },
];

// Detailed result for preview + manage CRM + ResultDetail Data tab.
const DETAIL_COLUMNS = [
  'Company Name',
  'Business Description',
  'Company Type',
  'Sector',
  'Industry',
  'Website',
  'Company LinkedIn URL',
  'Revenue ($M)',
  'Employees',
  'Country',
  'State',
  'City',
  'Contact Email',
  'Fit/No Fit',
  'Rationale',
  'Total Score',
  'Business Score',
];

const DETAIL_ROWS: Record<string, string>[] = Array.from({ length: 12 }, (_, i) => ({
  'Company Name': `Acme ${i + 1} Inc.`,
  'Business Description':
    'A long business description that exceeds the cell width and is expandable via the cell modal to reveal the full text on click.',
  'Company Type': '',
  Sector: '',
  Industry: '',
  Website: `https://acme${i + 1}.example.com`,
  'Company LinkedIn URL': '',
  'Revenue ($M)': `${(10 + i) * 1}.00`,
  Employees: String(50 + i * 10),
  Country: 'United States',
  State: ['California', 'New York', 'Texas'][i % 3],
  City: ['San Francisco', 'New York', 'Austin'][i % 3],
  // Every 4th row has no email so the UI can show "No Email".
  'Contact Email': i % 4 === 3 ? '' : `contact${i + 1}@acme${i + 1}.example.com`,
  'Fit/No Fit': ['Fit', 'Partial Fit', 'No Fit'][i % 3],
  Rationale: 'Matches the stated business criteria.',
  'Total Score': String(95 - i * 3),
  'Business Score': String(90 - i * 2),
}));

export const mockInputFilePreview: ResultDetail = {
  processId: 'tl_1',
  createdAt: '2026-02-19T13:30:00Z',
  columns: ['Company Name', 'Website', 'Industry', 'Employees', 'Revenue'],
  rows: Array.from({ length: 8 }, (_, i) => ({
    'Company Name': `Input Co ${i + 1}`,
    Website: `https://input${i + 1}.example.com`,
    Industry: 'Software',
    Employees: String(100 + i * 25),
    Revenue: `$${(5 + i) * 1_000_000}`,
  })),
  isInputFilePreview: true,
  inputFileName: 'targets_batch_1.csv',
};

export function inputFilePreviewFor(resultId: string, fileId: string): ResultDetail {
  return {
    ...mockInputFilePreview,
    processId: resultId,
    inputFileName: fileId.includes('_2') ? 'supplement.xlsx' : 'targets_batch.csv',
  };
}

export const mockResultDetail: ResultDetail = {
  processId: 'tl_1',
  createdAt: '2026-02-19T13:30:00Z',
  columns: DETAIL_COLUMNS,
  rows: DETAIL_ROWS,
  isInputFilePreview: false,
  sourceType: 'target_list',
  title: 'Target list — Acme batch',
  resultFilename: 'Target list - Acme - demo - 2026-02-19.xlsx',
  totalMatches: 8,
  totalRows: 12,
  version: 1,
  versionGroup: 'tl_1',
  versions: [
    {
      processId: 'tl_1',
      version: 1,
      createdAt: '2026-02-19T13:30:00Z',
      totalMatches: 8,
      status: 'completed',
    },
  ],
  filtersApplied: {
    enableGmapsSearch: false,
    businessQueries: ['industrial automation'],
  },
};

// ---- Strategic-buyer detail (sb_*) ----
// Strategic acquirers carry an acquisition-rationale shape rather than the target-list fit columns.
const STRATEGIC_COLUMNS = [
  'Company Name',
  'Business Description',
  'Strategic Rationale',
  'Revenue',
  'Employees',
  'HQ Location',
  'Recent Acquisitions',
  'Fit Score',
];

const STRATEGIC_BUYERS = [
  [
    'Meridian Industrial Group',
    'Diversified automation & controls manufacturer',
    'Vertical integration into adjacent controls software',
    '$1.2B',
    '4,200',
    'Chicago, IL',
    'AxisFlow (2024), Nodal Systems (2022)',
    '94',
  ],
  [
    'Crestline Holdings',
    'Industrial equipment roll-up platform',
    'Add-on to existing factory-automation portfolio',
    '$860M',
    '3,100',
    'Cleveland, OH',
    'PrecisionCast (2023)',
    '91',
  ],
  [
    'Vantage Technologies',
    'Enterprise IoT & sensor networks',
    'Expand sensor coverage into logistics vertical',
    '$540M',
    '1,900',
    'Austin, TX',
    'SenseGrid (2024), Telemetry.io (2021)',
    '88',
  ],
  [
    'Northbridge Capital Partners',
    'Family-office-backed industrial investor',
    'Buy-and-build thesis in process automation',
    '$2.0B AUM',
    '120',
    'Boston, MA',
    '6 platform acquisitions since 2020',
    '85',
  ],
  [
    'Apex Manufacturing Solutions',
    'Contract manufacturer, precision components',
    'Captive supplier for downstream assembly',
    '$410M',
    '2,400',
    'Detroit, MI',
    'None disclosed',
    '82',
  ],
  [
    'Helix Automation',
    'Robotics integrator for mid-market plants',
    'Software + services cross-sell opportunity',
    '$320M',
    '1,250',
    'Raleigh, NC',
    'Cobotix (2023)',
    '79',
  ],
  [
    'Summit Process Group',
    'Process-control instrumentation maker',
    'Channel expansion into European OEMs',
    '$690M',
    '2,800',
    'Houston, TX',
    'Valtek Controls (2022)',
    '76',
  ],
  [
    'Granite Peak Equity',
    'Lower-middle-market PE, industrials focus',
    'Platform investment, fragmented sub-sector',
    '$1.4B AUM',
    '85',
    'Denver, CO',
    '4 add-ons in 2024',
    '72',
  ],
];

const STRATEGIC_ROWS: Record<string, string>[] = STRATEGIC_BUYERS.map((r) =>
  Object.fromEntries(STRATEGIC_COLUMNS.map((col, i) => [col, r[i]])),
);

export const mockStrategicResultDetail: ResultDetail = {
  processId: 'sb_1',
  createdAt: '2026-02-17T10:00:00Z',
  columns: STRATEGIC_COLUMNS,
  rows: STRATEGIC_ROWS,
  isInputFilePreview: false,
  sourceType: 'strategic_buyer_list',
  title: 'Strategic buyer list',
  resultFilename: 'Strategic buyer list - demo.xlsx',
  totalMatches: STRATEGIC_ROWS.length,
  totalRows: STRATEGIC_ROWS.length,
  version: 1,
  versionGroup: 'sb_1',
  versions: [
    { processId: 'sb_1', version: 1, totalMatches: STRATEGIC_ROWS.length, status: 'completed' },
  ],
  filtersApplied: { businessQueries: ['strategic acquirer'] },
};

// ---- Financial-verticals / PE-firm detail (fv_*) ----
// FV results are PE firms, not operating-company targets — the columns reflect fund attributes.
const FV_COLUMNS = [
  'PE Firm Name',
  'Domain',
  'Portfolio Companies',
  'Geographic Focus',
  'Sector Focus',
  'AUM',
  'Investment Stage',
  'Fit Score',
];

const FV_FIRMS = [
  [
    'Bain Capital',
    'baincapital.com',
    '120+',
    'North America, Europe',
    'Tech, Healthcare, Industrials',
    '$185B',
    'Buyout / Growth',
    '96',
  ],
  [
    'Thoma Bravo',
    'thomabravo.com',
    '90+',
    'North America',
    'Enterprise Software',
    '$142B',
    'Buyout',
    '95',
  ],
  [
    'Vista Equity Partners',
    'vistaequitypartners.com',
    '85+',
    'North America',
    'Enterprise Software, Data',
    '$100B',
    'Buyout / Growth',
    '93',
  ],
  [
    'Insight Partners',
    'insightpartners.com',
    '600+',
    'Global',
    'Software, Internet',
    '$80B',
    'Growth Equity',
    '90',
  ],
  [
    'Francisco Partners',
    'franciscopartners.com',
    '70+',
    'North America, Europe',
    'Technology',
    '$45B',
    'Buyout',
    '88',
  ],
  ['Hg Capital', 'hgcapital.com', '50+', 'Europe', 'Software, Services', '$75B', 'Buyout', '86'],
  [
    'Warburg Pincus',
    'warburgpincus.com',
    '200+',
    'Global',
    'Tech, Financial Services',
    '$83B',
    'Growth / Buyout',
    '84',
  ],
  [
    'TA Associates',
    'ta.com',
    '110+',
    'North America, Europe, Asia',
    'Tech, Healthcare',
    '$65B',
    'Growth Equity',
    '81',
  ],
  [
    'Genstar Capital',
    'gencap.com',
    '40+',
    'North America',
    'Software, Financial Services',
    '$49B',
    'Buyout',
    '78',
  ],
  [
    'Accel-KKR',
    'accel-kkr.com',
    '60+',
    'North America, Europe',
    'Software, Tech-Enabled Services',
    '$19B',
    'Buyout / Growth',
    '75',
  ],
];

const FV_ROWS: Record<string, string>[] = FV_FIRMS.map((r) =>
  Object.fromEntries(FV_COLUMNS.map((col, i) => [col, r[i]])),
);

export const mockFvResultDetail: ResultDetail = {
  processId: 'fv_1',
  createdAt: '2026-02-16T09:00:00Z',
  columns: FV_COLUMNS,
  rows: FV_ROWS,
  isInputFilePreview: false,
};

/**
 * Pick the detail fixture that matches a result id's type prefix, so each result kind shows its own
 * column shape: `sb_*` → strategic buyers, `fv_*` → PE firms, everything else → target-list rows.
 * The requested id is stamped onto `processId` so the workspace tabs key off the right result.
 */
export function resultDetailFor(id: string): ResultDetail {
  const base = id.startsWith('sb_')
    ? mockStrategicResultDetail
    : id.startsWith('fv_')
      ? mockFvResultDetail
      : mockResultDetail;
  return { ...base, processId: id };
}

// CRM management view of the same result.
export const mockCrmDetail: ResultDetail = {
  processId: 'tl_1',
  createdAt: '2026-02-19T13:30:00Z',
  columns: [],
  rows: [],
  crmData: DETAIL_ROWS.map((r) => ({
    companyName: r['Company Name'],
    lead_owner: '',
    call_status: 'Not Started',
    teaser: 'N',
    nda: 'N',
    cim: 'N',
    decision_status: 'Pending',
    notes: '',
  })),
  manualFields: ['lead_owner', 'call_status', 'teaser', 'nda', 'cim', 'decision_status', 'notes'],
  usernames: ['Jatin Choudhary', 'Maya Patel', 'Liam Ng', 'Sara Kim'],
  ynFields: ['teaser', 'nda', 'cim'],
  statusFields: {
    call_status: ['Not Started', 'Attempted', 'Connected', 'Voicemail'],
    decision_status: ['Pending', 'Interested', 'Passed', 'Closed'],
  },
  isInputFilePreview: false,
};

export const mockSummaryStats: SummaryStats = {
  fitsCount: 64,
  partialFitsCount: 22,
  totalInputRecords: 240,
  totalMatches: 86,
  topLocations: [
    { name: 'California', count: 24 },
    { name: 'New York', count: 18 },
    { name: 'Texas', count: 14 },
    { name: 'Massachusetts', count: 9 },
    { name: 'Illinois', count: 7 },
  ],
  stateDistribution: [
    { name: 'California', count: 24, percentage: 28 },
    { name: 'New York', count: 18, percentage: 21 },
    { name: 'Texas', count: 14, percentage: 16 },
    { name: 'Massachusetts', count: 9, percentage: 10 },
    { name: 'Illinois', count: 7, percentage: 8 },
  ],
  employeeDistribution: [
    { range: '1-50', companies: 20, percentage: 23 },
    { range: '51-200', companies: 34, percentage: 40 },
    { range: '201-500', companies: 22, percentage: 26 },
    { range: '500+', companies: 10, percentage: 11 },
  ],
  revenueDistribution: [
    { range: '<$10M', companies: 18, percentage: 21 },
    { range: '$10M-$50M', companies: 40, percentage: 47 },
    { range: '$50M-$100M', companies: 18, percentage: 21 },
    { range: '>$100M', companies: 10, percentage: 11 },
  ],
  topCountryName: 'United States',
  companiesWithPhone: 72,
  companiesWithEmail: 68,
  companiesWithAddress: 80,
  companiesWithExecutive: 55,
};

export const mockCriteriaList = [
  'Industry: Software (B2B SaaS), Healthcare (Medical Devices)',
  'Geography: United States (California), United Kingdom',
  'Employees: 50 - 500',
  'Revenue: $10,000,000 - $50,000,000',
  'Business Queries: 2 applied',
  'Custom Insights: 2 questions',
];
