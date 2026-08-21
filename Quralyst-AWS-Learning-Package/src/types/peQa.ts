// PE Ask-the-Market types (F39.2) — mirrors backend REF-API-CONTRACT.md §PE Dataset — Ask the Market.
export type QaEntity = 'holdings' | 'firms' | 'people' | 'events';
export type QaCitationType = 'firm' | 'holding' | 'person' | 'event';
export type QaSort = 'name' | 'appetite' | 'recency' | 'relevance';
export type QaStatus = 'current' | 'realized';
export type QaEnrich = 'acquisition_appetite' | 'exit_readiness';

export interface QaEvidence {
  type: QaCitationType;
  id: string | number;
  label: string;
  href: string;
  detail?: string | null;
}

export interface QaCitation {
  type: QaCitationType;
  id: string | number;
  label: string;
  sublabel?: string | null;
  href: string;
  detail?: string | null;
  evidence?: QaEvidence[];
}

export interface QaFilters {
  sectors?: string[];
  geographies?: string[];
  keywords?: string[];
  status?: QaStatus;
  investYearFrom?: number;
  investYearTo?: number;
  exitYearFrom?: number;
  exitYearTo?: number;
  firmName?: string;
  title?: string;
  roleTag?: string;
  eventType?: string;
  windowDays?: number;
}

export interface QaPlan {
  entity: QaEntity;
  filters: QaFilters;
  limit: number;
  enrich: QaEnrich[];
  sort: QaSort;
  groupByFirm: boolean;
  intent: string;
}

export interface QaResponse {
  answered: boolean;
  reason?: string | null;
  intent?: string | null;
  answer?: string | null;
  citations?: QaCitation[];
  plan?: QaPlan | null;
  recordCount?: number;
}
