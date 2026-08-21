// PE Tearsheets types (F40.2) — mirrors backend REF-API-CONTRACT.md §PE Dataset — Tearsheets.
export type TearsheetStatus =
  | 'pending'
  | 'researching'
  | 'synthesizing'
  | 'complete'
  | 'failed'
  | 'cancelled';

export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

export interface TearsheetStage {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  message?: string;
}

export interface TearsheetSource {
  provider?: string;
  title?: string;
  url?: string;
  snippet?: string;
}

export interface TearsheetCostLine {
  label: string;
  detail: string;
  costUsd: number | null;
}

export interface TearsheetCost {
  knownTotalUsd: number;
  hasUnknown: boolean;
  lines: TearsheetCostLine[];
  computedAt: string;
}

export interface TearsheetPerson {
  name: string;
  title: string;
  bio?: string;
  background?: string;
  linkedinUrl?: string;
  photoUrl?: string;
}

export interface TearsheetContent {
  executiveSummary?: string;
  thesisPoints?: string[];
  riskFlags?: string[];
  overview?: {
    oneLiner?: string;
    description?: string;
    website?: string;
    headquarters?: string;
    yearFounded?: string;
    employeeCount?: string;
    businessStatus?: string;
    ownershipStatus?: string;
    industries?: string[];
    keywords?: string[];
    keyFacts?: { label: string; value: string; asOf?: string }[];
    confidence?: Confidence;
    notes?: string;
  };
  funding?: {
    summary?: string;
    totalRaised?: string;
    latestRound?: string;
    latestValuation?: string;
    rounds?: {
      date?: string;
      round?: string;
      amount?: string;
      leadInvestors?: string[];
      participatingInvestors?: string[];
      postValuation?: string;
      notes?: string;
    }[];
    keyInvestors?: string[];
    confidence?: Confidence;
    notes?: string;
  };
  financials?: {
    summary?: string;
    revenue?: string;
    revenueGrowth?: string;
    profitability?: string;
    burnRate?: string;
    runway?: string;
    unitEconomics?: string;
    metrics?: { label: string; value: string; period?: string; notes?: string }[];
    confidence?: Confidence;
    notes?: string;
  };
  leadership?: {
    summary?: string;
    executives?: TearsheetPerson[];
    board?: TearsheetPerson[];
    confidence?: Confidence;
    notes?: string;
  };
  competitors?: {
    summary?: string;
    competitors?: {
      name: string;
      website?: string;
      hqLocation?: string;
      yearFounded?: string;
      employees?: string;
      funding?: string;
      description?: string;
      differentiator?: string;
    }[];
    confidence?: Confidence;
    notes?: string;
  };
  news?: {
    summary?: string;
    items?: {
      date?: string;
      headline: string;
      source?: string;
      url?: string;
      summary?: string;
    }[];
    signals?: string[];
    confidence?: Confidence;
    notes?: string;
  };
  capTable?: {
    summary?: string;
    entries?: {
      stakeholder: string;
      stakeholderType?: string;
      shareClass?: string;
      percentOwned?: string;
      notes?: string;
    }[];
    confidence?: Confidence;
    notes?: string;
  };
  industry?: {
    summary?: string;
    marketSize?: string;
    growthRate?: string;
    trends?: string[];
    tailwinds?: string[];
    headwinds?: string[];
    regulatoryContext?: string;
    confidence?: Confidence;
    notes?: string;
  };
  acquisitions?: {
    summary?: string;
    items?: {
      targetName: string;
      date?: string;
      dealValue?: string;
      dealType?: string;
      rationale?: string;
      source?: string;
      url?: string;
    }[];
    confidence?: Confidence;
    notes?: string;
  };
  linkedinMetrics?: {
    linkedinUrl?: string;
    followerCount?: number;
    employeeCountCurrent?: number;
    employeeHistory?: { date: string; employeeCount?: number }[];
    followerHistory?: { date: string; followerCount: number }[];
    industry?: string;
    hqCountry?: string;
    founded?: number;
    activeJobPostingsCount?: number;
    asOf?: string;
  };
  reviewInsights?: {
    googleRating?: string | null;
    reviewCount?: number | null;
    sentimentSummary?: string | null;
    strengths?: string[] | null;
    risks?: string[] | null;
    mandaTakeaway?: string | null;
    confidence?: Confidence;
  };
}

export type GammaStatus = 'generating' | 'complete' | 'failed';

export interface Tearsheet {
  id: string;
  companyName: string;
  website?: string;
  status: TearsheetStatus;
  stages: TearsheetStage[];
  errorMessage?: string;
  sources: TearsheetSource[];
  content?: TearsheetContent;
  cost?: TearsheetCost;
  /** Gamma polished deck status (best-effort). */
  gammaStatus?: GammaStatus;
  gammaUrl?: string;
  gammaError?: string;
  /** True when server has a secret export URL ready to proxy. */
  gammaPdfReady?: boolean;
  /** True when Gamma deck can be exported to PPTX format. */
  gammaPptxReady?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TearsheetSummary {
  id: string;
  companyName: string;
  website?: string;
  oneLiner?: string;
  status: TearsheetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TearsheetStats {
  totalTearsheets: number;
  completedTearsheets: number;
  inProgressTearsheets: number;
  failedTearsheets: number;
  uniqueCompanies: number;
  totalSources: number;
  lastGeneratedAt?: string;
}

export interface CreateTearsheetBody {
  companyName: string;
  website?: string;
  force?: boolean;
}
