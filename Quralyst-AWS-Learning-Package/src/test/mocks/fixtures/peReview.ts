// PE Review-Queue + Corrections fixtures (F27.3) — mirror the backend F27 serializers exactly
// (services/pe/review_service.serialize + corrections_engine.serialize_*). CamelCase, unified
// envelope. Contract: backend Phases/Migration/REF-API-CONTRACT.md §PE Dataset — Review Queue /
// Corrections.
import type {
  PECorrection,
  PECorrectionRule,
  PECorrectionsApplySummary,
  PECorrectionsStore,
  PEReviewItem,
  PEReviewStats,
} from '@/types';

export const mockReviewItems: PEReviewItem[] = [
  {
    id: 'ri1',
    recordType: 'holding',
    recordId: 'h1',
    firmId: 'pef1',
    reason: 'stale_removal',
    itemType: null,
    // {before, after} bag — the diff view marks companyName as changed.
    payload: {
      companyName: { before: 'Acme Old', after: 'Acme Industries' },
      sector: { before: 'Software', after: 'Software' },
    },
    contentHash: 'hash-1',
    status: 'pending',
    reviewerNotes: null,
    resolvedAt: null,
    createdAt: '2026-07-13T10:00:00Z',
  },
  {
    id: 'ri2',
    recordType: 'holding',
    recordId: 'h2',
    firmId: 'pef1',
    reason: 'exit_check',
    itemType: null,
    payload: { investmentStatus: 'realized', exitDate: '2025-01-01' },
    contentHash: 'hash-2',
    status: 'pending',
    reviewerNotes: null,
    resolvedAt: null,
    createdAt: '2026-07-13T09:00:00Z',
  },
  {
    id: 'ri3',
    recordType: 'person',
    recordId: 'p1',
    firmId: 'pef2',
    reason: 'junk_cleanup',
    itemType: 'suspicious_name',
    payload: { itemType: 'suspicious_name', detail: 'Name looks like a page title' },
    contentHash: 'hash-3',
    status: 'pending',
    reviewerNotes: null,
    resolvedAt: null,
    createdAt: '2026-07-13T08:00:00Z',
  },
];

export const mockReviewStats: PEReviewStats = {
  pending: 3,
  approved: 5,
  rejected: 2,
  edited: 1,
  total: 11,
  byReason: { stale_removal: 4, exit_check: 3, junk_cleanup: 3, inflated_portfolio: 1 },
  byType: { holding: 8, person: 3 },
};

const mockCorrections: PECorrection[] = [
  {
    id: 'c1',
    at: '2026-07-12T14:00:00Z',
    scope: 'holding',
    action: 'edit',
    firmDomain: 'acme-capital.com',
    companyName: 'Acme Industries',
    label: null,
    field: 'sector',
    before: 'Tech',
    after: 'Software',
  },
  {
    id: 'c2',
    at: '2026-07-11T09:30:00Z',
    scope: 'firm',
    action: 'delete',
    firmDomain: 'ghost-fund.com',
    companyName: null,
    label: 'Ghost Fund',
    field: null,
    before: null,
    after: null,
  },
];

export const mockRuleEnabled: PECorrectionRule = {
  id: 'rule-enabled',
  kind: 'substitution',
  scope: 'holding',
  field: 'sector',
  patternId: null,
  before: 'tech',
  after: 'Software',
  description: 'When a sector is "tech", set it to "Software".',
  correctedCount: 12,
  enabled: true,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-10T00:00:00Z',
};

export const mockRuleDisabled: PECorrectionRule = {
  id: 'rule-disabled',
  kind: 'pattern',
  scope: 'firm',
  field: 'name',
  patternId: 'firm-name-equals-website',
  before: null,
  after: null,
  description: 'Firm name is just its website domain — replace it with a clean name.',
  correctedCount: 0,
  enabled: false,
  createdAt: '2026-07-05T00:00:00Z',
  updatedAt: '2026-07-05T00:00:00Z',
};

export const mockCorrectionsStore: PECorrectionsStore = {
  corrections: mockCorrections,
  totalCorrections: mockCorrections.length,
  rules: [mockRuleEnabled, mockRuleDisabled],
};

export const mockDryRunSummary: PECorrectionsApplySummary = {
  status: 'dry_run',
  counts: {
    overridesDeleted: 0,
    teamUrlSet: 0,
    rostersReplaced: 0,
    peopleWritten: 0,
    correctionsApplied: 2,
    correctionsDeleted: 0,
    renamed: 1,
    ruleFixes: 4,
  },
  samples: {
    corrections: [
      {
        firmDomain: 'acme-capital.com',
        companyName: 'Acme Industries',
        field: 'sector',
        after: 'Software',
      },
    ],
    rules: [{ ruleId: 'rule-disabled', pattern: 'firm-name-equals-website', fixed: 4 }],
    unmatched: [],
  },
};

export const mockApplySummary: PECorrectionsApplySummary = {
  ...mockDryRunSummary,
  status: 'ok',
};
