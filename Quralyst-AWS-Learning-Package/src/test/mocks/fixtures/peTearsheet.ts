// MSW fixtures for PE Tearsheets (F40.2).
import type { Tearsheet } from '@/types';

const NOW = '2026-07-01T12:00:00.000Z';

export const mockTearsheetInflight: Tearsheet = {
  id: 'ts-inflight',
  companyName: 'Widget Co',
  website: 'widget.co',
  status: 'researching',
  stages: [
    { key: 'web', label: 'Web research', status: 'complete' },
    { key: 'news', label: 'News scan', status: 'running', message: 'Scanning headlines' },
    { key: 'synthesis', label: 'AI synthesis', status: 'pending' },
  ],
  sources: [],
  createdAt: NOW,
  updatedAt: NOW,
};

export const mockTearsheetComplete: Tearsheet = {
  id: 'ts-complete',
  companyName: 'Acme Robotics',
  website: 'acmerobotics.com',
  status: 'complete',
  stages: [
    { key: 'web', label: 'Web research', status: 'complete' },
    { key: 'news', label: 'News scan', status: 'complete' },
    { key: 'synthesis', label: 'AI synthesis', status: 'complete' },
  ],
  sources: [{ provider: 'perplexity', title: 'Company profile', url: 'https://example.com/p' }],
  content: {
    executiveSummary:
      'Acme Robotics builds autonomous warehouse systems with strong recurring software revenue.',
    thesisPoints: ['Large TAM in logistics automation', 'Sticky enterprise contracts'],
    riskFlags: ['Customer concentration', 'Hardware supply chain exposure'],
    overview: {
      oneLiner: 'Autonomous warehouse robotics for mid-market 3PLs.',
      description: 'Founded in 2014, Acme deploys AMR fleets with a cloud orchestration layer.',
      website: 'acmerobotics.com',
      headquarters: 'Austin, TX',
      yearFounded: '2014',
      employeeCount: '420',
      businessStatus: 'Operating',
      ownershipStatus: 'Private',
      industries: ['Industrial automation', 'Logistics software'],
      keyFacts: [
        { label: 'Net retention', value: '118%' },
        { label: 'Gross margin', value: '62%' },
      ],
      confidence: 'high',
    },
    leadership: {
      summary: 'Experienced industrial automation leadership team.',
      executives: [
        { name: 'Jane Doe', title: 'CEO', bio: 'Former Amazon Robotics VP.' },
        { name: 'John Smith', title: 'CFO', bio: 'Ex–Goldman Sachs.' },
      ],
      confidence: 'medium',
    },
    news: {
      summary: 'Recent product launch and partnership momentum.',
      items: [
        {
          date: '2026-06-01',
          headline: 'Acme launches next-gen AMR fleet',
          source: 'TechCrunch',
        },
      ],
      signals: ['Product launch', 'Enterprise partnership'],
      confidence: 'medium',
    },
    competitors: {
      summary: 'Competes with legacy automation vendors and newer AMR startups.',
      competitors: [
        {
          name: 'AutoLift',
          hqLocation: 'Chicago',
          employees: '800',
          funding: '$120M',
          differentiator: 'Heavy pallet handling',
        },
      ],
      confidence: 'low',
    },
    funding: {
      summary: 'Well-capitalized after Series C.',
      totalRaised: '$185M',
      latestRound: 'Series C (2024)',
      latestValuation: '$900M',
      rounds: [{ date: '2024-03', round: 'Series C', amount: '$75M', leadInvestors: ['Sequoia'] }],
      confidence: 'high',
    },
    industry: {
      summary: 'Warehouse automation tailwinds from labor shortages.',
      marketSize: '$12B',
      growthRate: '14% CAGR',
      tailwinds: ['Labor shortages', 'E-commerce growth'],
      headwinds: ['CapEx cycles'],
      confidence: 'medium',
    },
    linkedinMetrics: {
      employeeHistory: [
        { date: '2024-01-01', employeeCount: 280 },
        { date: '2025-01-01', employeeCount: 350 },
        { date: '2026-01-01', employeeCount: 420 },
      ],
      followerHistory: [
        { date: '2024-01-01', followerCount: 12000 },
        { date: '2025-01-01', followerCount: 18000 },
        { date: '2026-01-01', followerCount: 24000 },
      ],
    },
    reviewInsights: {
      googleRating: '4.4',
      reviewCount: 128,
      sentimentSummary: 'Customers praise uptime and support responsiveness.',
      strengths: ['Reliable uptime', 'Strong support'],
      risks: ['Implementation timelines'],
      confidence: 'unknown',
    },
  },
  cost: {
    knownTotalUsd: 0.8425,
    hasUnknown: true,
    lines: [
      { label: 'Perplexity research', detail: 'Deep research pass', costUsd: 0.5125 },
      { label: 'Claude synthesis', detail: 'Slide synthesis', costUsd: 0.33 },
      { label: 'Coresignal', detail: 'LinkedIn metrics', costUsd: null },
    ],
    computedAt: NOW,
  },
  createdAt: NOW,
  updatedAt: NOW,
};

/** Complete tearsheet with polished Gamma PDF ready (Replit parity UI). */
export const mockTearsheetWithGamma: Tearsheet = {
  ...mockTearsheetComplete,
  id: 'ts-gamma',
  gammaStatus: 'complete',
  gammaUrl: 'https://gamma.app/docs/acme-tearsheet',
  gammaPdfReady: true,
};

export const mockTearsheetGammaGenerating: Tearsheet = {
  ...mockTearsheetComplete,
  id: 'ts-gamma-gen',
  gammaStatus: 'generating',
  gammaUrl: undefined,
  gammaPdfReady: false,
};

export const mockTearsheetFailed: Tearsheet = {
  id: 'ts-failed',
  companyName: 'Bad Co',
  status: 'failed',
  stages: [{ key: 'web', label: 'Web research', status: 'failed', message: 'No sources found' }],
  errorMessage: 'Unable to find enough public information to synthesize a tearsheet.',
  sources: [],
  createdAt: NOW,
  updatedAt: NOW,
};

export const mockTearsheetSynthesizing: Tearsheet = {
  ...mockTearsheetInflight,
  id: 'ts-synth',
  status: 'synthesizing',
  stages: [
    { key: 'perplexity', label: 'Perplexity deep research', status: 'complete' },
    { key: 'brave', label: 'Brave web search', status: 'complete' },
    { key: 'serper', label: 'Serper news + knowledge graph', status: 'complete' },
    { key: 'coresignal', label: 'LinkedIn metrics', status: 'complete' },
    { key: 'reviews', label: 'Review-site insights', status: 'complete' },
    { key: 'synthesis', label: 'AI synthesis', status: 'running' },
  ],
};

export const mockTearsheetPending: Tearsheet = {
  ...mockTearsheetInflight,
  id: 'ts-pending',
  status: 'pending',
  stages: [
    { key: 'web', label: 'Web research', status: 'pending' },
    { key: 'news', label: 'News scan', status: 'pending' },
    { key: 'synthesis', label: 'AI synthesis', status: 'pending' },
  ],
};
