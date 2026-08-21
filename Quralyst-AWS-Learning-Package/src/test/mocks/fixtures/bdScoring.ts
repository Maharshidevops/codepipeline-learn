import templatesJson from './bdScoringTemplates.json';
import type { BdBenchmark, BdCompanyContext, BdScoredCompany, BdScoringTemplate } from '@/types';

export const mockBdTemplates = templatesJson as BdScoringTemplate[];

export const mockBdCompanies: BdScoredCompany[] = [
  {
    id: 'c1',
    templateId: 'tpl2',
    companyName: 'Acme Industrial',
    notes: null,
    industryKey: 'specialty_trades',
    listContext: 'Project Aspen',
    fieldValues: { management_layer: 'none', revenue_range: 'r5', employee_count: 20 },
    scoreTotal: 112,
    moduleScores: { m1: 40, m2: 30, m3: 42 },
    scoreBreakdown: { m3: { management_layer: 6 } },
    bonusScore: 0,
    isDisqualified: false,
    tier: 'tier1',
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
  },
  {
    id: 'c2',
    templateId: 'tpl2',
    companyName: 'Beta Co',
    notes: 'watch',
    industryKey: null,
    listContext: null,
    fieldValues: { dq_active_process: true },
    scoreTotal: 0,
    moduleScores: {},
    scoreBreakdown: {},
    bonusScore: 0,
    isDisqualified: true,
    tier: 'disqualified',
    createdAt: '2026-07-19T10:00:00.000Z',
    updatedAt: '2026-07-19T10:00:00.000Z',
  },
  {
    id: 'c3',
    templateId: 'tpl2',
    companyName: 'Gamma LLC',
    notes: null,
    industryKey: 'it_services',
    listContext: 'Project Aspen',
    fieldValues: { management_layer: 'none' },
    scoreTotal: 6,
    moduleScores: { m3: 6 },
    scoreBreakdown: { m3: { management_layer: 6 } },
    bonusScore: 0,
    isDisqualified: false,
    tier: 'tier4',
    createdAt: '2026-07-18T10:00:00.000Z',
    updatedAt: '2026-07-18T10:00:00.000Z',
  },
];

export const mockBdContexts: BdCompanyContext[] = [
  { listContext: 'Project Aspen', count: 2 },
  { listContext: 'Deal Zebra', count: 1 },
];

export const mockBdBenchmarks: BdBenchmark[] = [
  {
    industryKey: 'specialty_trades',
    industryLabel: 'Specialty trades (HVAC, plumbing, electrical, fire protection)',
    industryGroup: 'Trades and construction',
    notes: 'HVAC… (fallback estimate, Census data unavailable)',
    censusNaicsCodes: ['2382'],
    revenuePerEmployeeLow: 120000,
    revenuePerEmployeeMid: 180000,
    revenuePerEmployeeHigh: 260000,
    sourceDataset: 'Fallback estimate',
    sourceYear: null,
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    industryKey: 'it_services',
    industryLabel: 'IT services and managed services providers',
    industryGroup: 'Business and professional services',
    notes: 'IT consulting…',
    censusNaicsCodes: ['5415'],
    revenuePerEmployeeLow: 140000,
    revenuePerEmployeeMid: 200000,
    revenuePerEmployeeHigh: 290000,
    sourceDataset: 'Census Annual Business Survey 2021',
    sourceYear: 2021,
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
];
