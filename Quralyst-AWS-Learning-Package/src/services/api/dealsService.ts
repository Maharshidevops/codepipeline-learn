// Deal Workspaces (Tier B / B1 / F17) — typed facade over the /api/v1/deals endpoints.
// Membership is the security model server-side; the FE just reflects `yourRole` for lead-only UI.
import { http } from '../http';
import { endpoints } from '../endpoints';

export type DealType = 'sell_side' | 'buy_side';
export type DealStatus = 'active' | 'archived';
export type MemberRole = 'lead' | 'member';

export interface DealStage {
  stageId: string;
  name: string;
  order: number;
  isTerminal: boolean;
  color: string;
}

export interface DealMember {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
}

export interface PipelineSummaryItem {
  stageId: string;
  count: number;
}

export interface Deal {
  id: string;
  name: string;
  dealType: DealType;
  description: string;
  status: DealStatus;
  leadUserId: string;
  yourRole: MemberRole | null;
  stages: DealStage[];
  members: DealMember[];
  pipelineSummary?: PipelineSummaryItem[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DealActivity {
  id: string;
  dealId: string;
  actionType: string;
  actorUserId: string;
  actorName: string;
  recordRef: string;
  payload: Record<string, unknown>;
  createdAt: string | null;
}

export interface RecordContact {
  contactId?: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  isPrimary: boolean;
  /** Per-contact outreach enum (QURALYST-20 parity). */
  outreachStatus?: ContactOutreachStatus | string;
}

/** Per-contact outreach vocabulary — mirrors QURALYST-20 EmbeddedContact choices. */
export const CONTACT_OUTREACH_STATUSES = [
  'not_contacted',
  'contacted',
  'responded',
  'meeting_set',
  'passed',
] as const;

export type ContactOutreachStatus = (typeof CONTACT_OUTREACH_STATUSES)[number];

export const CONTACT_OUTREACH_LABELS: Record<ContactOutreachStatus, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  responded: 'Responded',
  meeting_set: 'Meeting Set',
  passed: 'Passed',
};

export function normalizeContactOutreach(value?: string | null): ContactOutreachStatus {
  const raw = (value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return (CONTACT_OUTREACH_STATUSES as readonly string[]).includes(raw)
    ? (raw as ContactOutreachStatus)
    : 'not_contacted';
}

// Buyer-type vocabulary — mirrors the backend's `buyer_type` choices exactly (reference-parity,
// 2026-07-29). Any other value is rejected on save, so UI must not offer one. Seeded server-side
// from the source run's kind: a Financial-Verticals run → financial_sponsor, a normal run →
// strategic. The retired "Provided" / "Other" labels no longer exist.
export const BUYER_TYPES = ['strategic', 'financial_sponsor'] as const;

export type BuyerType = (typeof BUYER_TYPES)[number];

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  strategic: 'Strategic',
  financial_sponsor: 'Financial sponsor',
};

/** Display label for a buyer type. Tolerates a legacy value still stored on an old record so the
 *  buyer log shows what is there rather than a blank. */
export function buyerTypeLabel(value: string): string {
  return BUYER_TYPE_LABELS[value as BuyerType] ?? (value || '—');
}

export interface CompanyRecord {
  id: string;
  dealId: string;
  companyName: string;
  website: string;
  stageId: string;
  tier: number | null;
  buyerType: string;
  outreachStatus: string;
  passReason: string;
  predictedFit: string;
  sourceResultId: string;
  contacts: RecordContact[];
  notes: string;
  ownerUserId: string;
  ownerName: string;
}

export interface DealComment {
  id: string;
  recordId: string;
  authorUserId: string;
  authorName: string;
  text: string;
  mentions: string[];
  createdAt: string | null;
}

export interface BuyerLogRow {
  id: string;
  companyName: string;
  website?: string;
  stageId?: string;
  tier: number | null;
  buyerType: string;
  stage: string;
  outreachStatus: string;
  passReason: string;
  notes?: string;
  ownerUserId?: string;
  ownerName?: string;
  contacts?: RecordContact[];
  primaryContact?: RecordContact | null;
  stageDates: Record<string, string>;
}

export interface BulkAddResult {
  added: number;
  skipped: { name: string; reason: string }[];
}

// F19 — deal brief + research-list linking
export type BriefStatus = 'parsing' | 'ready' | 'error';

export interface DealBrief {
  id: string;
  dealId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: BriefStatus;
  errorMessage: string;
  criteria: Record<string, unknown>;
  hasFile: boolean;
  uploadedBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DealListLink {
  id: string;
  dealId: string;
  resultId: string;
  kind: 'processed' | 'financial';
  title: string;
  listType: string;
  totalCount: number;
  linkedBy: string;
  createdAt: string | null;
}

export interface MemberCandidate {
  userId: string;
  name: string;
  email: string;
}

export interface DealsService {
  list(status?: DealStatus | 'all'): Promise<Deal[]>;
  create(input: { name: string; dealType: DealType; description?: string }): Promise<Deal>;
  get(id: string): Promise<Deal>;
  patch(id: string, input: { name?: string; description?: string }): Promise<Deal>;
  archive(id: string): Promise<Deal>;
  replaceStages(id: string, stages: DealStage[]): Promise<Deal>;
  addMember(id: string, userId: string): Promise<Deal>;
  searchMembers(id: string, query: string): Promise<MemberCandidate[]>;
  removeMember(id: string, userId: string): Promise<Deal>;
  transferLead(id: string, userId: string): Promise<Deal>;
  activity(id: string, recordId?: string): Promise<DealActivity[]>;
  // F18 — pipeline
  listCompanies(id: string): Promise<CompanyRecord[]>;
  addCompany(
    id: string,
    input: Partial<CompanyRecord> & { companyName: string },
  ): Promise<CompanyRecord>;
  bulkAdd(id: string, rows: Record<string, unknown>[]): Promise<BulkAddResult>;
  updateCompany(
    id: string,
    recordId: string,
    input: Partial<Omit<CompanyRecord, 'tier'>> & { tier?: number | null },
  ): Promise<CompanyRecord>;
  deleteCompany(id: string, recordId: string): Promise<void>;
  changeStage(
    id: string,
    recordId: string,
    stageId: string,
    passReason?: string,
  ): Promise<CompanyRecord>;
  listCompanyActivity(id: string, recordId: string): Promise<DealActivity[]>;
  addCompanyNote(id: string, recordId: string, note: string): Promise<void>;
  listComments(id: string, recordId: string): Promise<DealComment[]>;
  addComment(id: string, recordId: string, text: string, mentions?: string[]): Promise<DealComment>;
  buyerLog(id: string): Promise<BuyerLogRow[]>;
  statusReportUrl(id: string): string;
  marketingReportUrl(id: string): string;
  // F19 — deal brief
  getBrief(id: string): Promise<DealBrief | null>;
  uploadBrief(id: string, file: File): Promise<DealBrief>;
  setBriefCriteria(
    id: string,
    input: { criteria?: Record<string, unknown>; status?: BriefStatus; errorMessage?: string },
  ): Promise<DealBrief>;
  deleteBrief(id: string): Promise<void>;
  briefDownloadUrl(id: string): string;
  // F19 — research-list linking
  listLinks(id: string): Promise<DealListLink[]>;
  linkList(
    id: string,
    input: {
      resultId: string;
      kind?: 'processed' | 'financial';
      title?: string;
      listType?: string;
      totalCount?: number;
    },
  ): Promise<DealListLink>;
  unlinkList(id: string, resultId: string): Promise<void>;
  linksForResult(resultId: string): Promise<DealListLink[]>;
}

export const dealsService: DealsService = {
  list: async (status: DealStatus | 'all' = 'active') => {
    const data = await http<{ deals: Deal[] }>(endpoints.deals.list(status));
    return data.deals ?? [];
  },
  create: async (input) => {
    const data = await http<{ deal: Deal }>(endpoints.deals.create, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.deal;
  },
  get: async (id) => (await http<{ deal: Deal }>(endpoints.deals.detail(id))).deal,
  patch: async (id, input) => {
    const data = await http<{ deal: Deal }>(endpoints.deals.detail(id), {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return data.deal;
  },
  archive: async (id) =>
    (await http<{ deal: Deal }>(endpoints.deals.archive(id), { method: 'POST' })).deal,
  replaceStages: async (id, stages) => {
    const data = await http<{ deal: Deal }>(endpoints.deals.stages(id), {
      method: 'PUT',
      body: JSON.stringify({ stages }),
    });
    return data.deal;
  },
  addMember: async (id, userId) => {
    const data = await http<{ deal: Deal }>(endpoints.deals.members(id), {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return data.deal;
  },
  searchMembers: async (id, query) =>
    (await http<{ users: MemberCandidate[] }>(endpoints.deals.memberSearch(id, query))).users ?? [],
  removeMember: async (id, userId) =>
    (await http<{ deal: Deal }>(endpoints.deals.member(id, userId), { method: 'DELETE' })).deal,
  transferLead: async (id, userId) => {
    const data = await http<{ deal: Deal }>(endpoints.deals.lead(id), {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return data.deal;
  },
  activity: async (id, recordId) =>
    (await http<{ activity: DealActivity[] }>(endpoints.deals.activity(id, recordId))).activity ??
    [],

  listCompanies: async (id) =>
    (await http<{ companies: CompanyRecord[] }>(endpoints.deals.companies(id))).companies ?? [],
  addCompany: async (id, input) => {
    const data = await http<{ company: CompanyRecord }>(endpoints.deals.companies(id), {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.company;
  },
  bulkAdd: async (id, rows) =>
    http<BulkAddResult>(endpoints.deals.companiesBulk(id), {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),
  updateCompany: async (id, recordId, input) => {
    const data = await http<{ company: CompanyRecord }>(endpoints.deals.company(id, recordId), {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return data.company;
  },
  deleteCompany: async (id, recordId) => {
    await http(endpoints.deals.company(id, recordId), { method: 'DELETE' });
  },
  changeStage: async (id, recordId, stageId, passReason = '') => {
    const data = await http<{ company: CompanyRecord }>(
      endpoints.deals.companyStage(id, recordId),
      {
        method: 'POST',
        body: JSON.stringify({ stageId, passReason }),
      },
    );
    return data.company;
  },
  listCompanyActivity: async (id, recordId) =>
    (await http<{ activity: DealActivity[] }>(endpoints.deals.companyActivity(id, recordId)))
      .activity ?? [],
  addCompanyNote: async (id, recordId, note) => {
    await http(endpoints.deals.companyActivity(id, recordId), {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },
  listComments: async (id, recordId) =>
    (await http<{ comments: DealComment[] }>(endpoints.deals.comments(id, recordId))).comments ??
    [],
  addComment: async (id, recordId, text, mentions) => {
    const data = await http<{ comment: DealComment }>(endpoints.deals.comments(id, recordId), {
      method: 'POST',
      body: JSON.stringify({ text, mentions }),
    });
    return data.comment;
  },
  buyerLog: async (id) =>
    (await http<{ buyerLog: BuyerLogRow[] }>(endpoints.deals.buyerLog(id))).buyerLog ?? [],
  statusReportUrl: (id) => endpoints.deals.statusReport(id),
  marketingReportUrl: (id) => endpoints.deals.marketingReport(id),

  // F19 — brief
  getBrief: async (id) =>
    (await http<{ brief: DealBrief | null }>(endpoints.deals.brief(id))).brief,
  uploadBrief: async (id, file) => {
    const form = new FormData();
    form.append('file', file);
    const data = await http<{ brief: DealBrief }>(endpoints.deals.brief(id), {
      method: 'POST',
      body: form,
    });
    return data.brief;
  },
  setBriefCriteria: async (id, input) => {
    const data = await http<{ brief: DealBrief }>(endpoints.deals.briefCriteria(id), {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.brief;
  },
  deleteBrief: async (id) => {
    await http(endpoints.deals.brief(id), { method: 'DELETE' });
  },
  briefDownloadUrl: (id) => endpoints.deals.briefDownload(id),

  // F19 — linking
  listLinks: async (id) =>
    (await http<{ links: DealListLink[] }>(endpoints.deals.lists(id))).links ?? [],
  linkList: async (id, input) => {
    const data = await http<{ link: DealListLink }>(endpoints.deals.lists(id), {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.link;
  },
  unlinkList: async (id, resultId) => {
    await http(endpoints.deals.list_link(id, resultId), { method: 'DELETE' });
  },
  linksForResult: async (resultId) =>
    (await http<{ links: DealListLink[] }>(endpoints.deals.linksForResult(resultId))).links ?? [],
};
