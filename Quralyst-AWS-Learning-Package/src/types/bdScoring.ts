// BD Scoring types (F36.3) — camelCase wire shapes matching REF-API-CONTRACT §BD Scoring.
import type { TemplateConfig, FieldValues } from '@/features/bd-scoring/scoringEngine';

export type BdTargetUserType = 'ibanking' | 'pe' | 'both';
export type BdScoringDirection = 'seller' | 'buyer';

export interface BdScoringTemplate {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  targetUserType: BdTargetUserType | string;
  scoringDirection: BdScoringDirection | string;
  isDefault: boolean;
  isActive: boolean;
  config: TemplateConfig;
  createdAt?: string | null;
  updatedAt?: string | null;
  isSystem?: boolean;
}

export interface BdScoredCompany {
  id: string;
  templateId: string | null;
  companyName: string;
  notes?: string | null;
  industryKey?: string | null;
  listContext?: string | null;
  fieldValues: FieldValues;
  scoreTotal: number;
  moduleScores: Record<string, number>;
  scoreBreakdown: Record<string, Record<string, number>>;
  bonusScore: number;
  isDisqualified: boolean;
  tier: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BdCompanyContext {
  listContext: string;
  count: number;
}

export interface BdImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface BdBulkResult {
  created: number;
  skipped: number;
}

export interface BdBenchmark {
  industryKey: string;
  industryLabel: string;
  industryGroup: string;
  notes: string;
  censusNaicsCodes: string[];
  revenuePerEmployeeLow: number;
  revenuePerEmployeeMid: number;
  revenuePerEmployeeHigh: number;
  sourceDataset: string;
  sourceYear: number | null;
  updatedAt?: string | null;
}

export interface BdCompanyCreateInput {
  templateId: string;
  fieldValues?: FieldValues;
  companyName?: string;
  notes?: string | null;
  industryKey?: string | null;
  listContext?: string | null;
  sector?: string;
  industry?: string;
  description?: string;
}

export interface BdCompanyUpdateInput {
  companyName?: string;
  notes?: string | null;
  industryKey?: string | null;
  listContext?: string | null;
  fieldValues?: FieldValues;
}

export interface BdTemplateWriteInput {
  name?: string;
  description?: string | null;
  slug?: string;
  targetUserType?: string;
  scoringDirection?: string;
  config?: TemplateConfig | Record<string, unknown>;
}

export interface BdTemplateGenerateInput {
  description: string;
  targetUserType?: string;
  scoringDirection?: string;
}

/** Draft returned by POST /templates/generate — not yet persisted. */
export interface BdTemplateDraft {
  name: string;
  description?: string | null;
  slug?: string;
  targetUserType?: string;
  scoringDirection?: string;
  config: TemplateConfig;
  provider?: string | null;
}
