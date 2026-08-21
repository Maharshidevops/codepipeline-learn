// Organization types. See REF-DATA-MODEL.md.
import type { OrgRole } from './user';

export type OrgKeyName =
  | 'openai_api_key'
  | 'apollo_api_key'
  | 'news_api_key'
  | 'gmaps_api_key'
  | 'coresignal_api_key'
  | 'apify_api_key'
  | 'anthropic_api_key'
  | 'gemini_api_key'
  // F16 — extra providers
  | 'serper_api_key'
  | 'kickbox_api_key'
  | 'perplexity_api_key'
  // Polished tearsheets (Gamma)
  | 'gamma_api_key';

export interface OrgDomain {
  value: string;
  verifiedAt?: string;
  verificationToken: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  settings: { allowMemberKeys: boolean; orgKeyFallback: boolean; membersSeeOrgUsage?: boolean };
  keyStatus: Record<OrgKeyName, boolean>;
  domains: OrgDomain[];
}

export interface Member {
  id: string;
  email: string;
  name?: string;
  orgRole: OrgRole;
  orgStatus: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

export interface Seats {
  included: number | null;
  active: number;
  pending: number;
  used: number;
  remaining: number | null;
}

export interface PendingInvite {
  id: string;
  email: string;
  orgRole: 'admin' | 'member';
  createdAt: string;
  expiresAt?: string;
}

export interface UsageRow {
  date: string;
  userName: string;
  userEmail?: string;
  companiesProcessed: number;
  apiCalls: Record<string, number>;
}

export interface LedgerRow {
  createdAt: string;
  source: string;
  creditType: string;
  delta: string; // signed "+10" / "-5"
  balanceAfter: number;
  user: string;
  jobId: string;
  batchRef: string;
  description: string;
}

export interface OrgUpdate {
  createdAt: string;
  summary?: string;
  updateType: string;
  status: string;
}

export interface CrmFile {
  title?: string;
  processId: string;
  createdAt: string;
  status: string;
}
