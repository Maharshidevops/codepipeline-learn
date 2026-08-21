// Organization service — every org tab's data + mutations go through here. Real impl hits the
// endpoints; MSW intercepts in mock mode (paginating/filtering members to mirror the Flask route).
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  CrmFile,
  LedgerRow,
  Member,
  OrgDomain,
  OrgKeyName,
  OrgUpdate,
  PageMeta,
  PendingInvite,
  Seats,
  TestApiKeysResult,
} from '@/types';

export type MemberStatus = 'pending' | 'active' | 'inactive';
export type MemberAction = 'approve' | 'reject' | 'suspend' | 'remove' | 'change_role';

export interface MembersQuery {
  status: MemberStatus;
  page?: number;
  perPage?: number;
  email?: string;
}
export interface MembersResponse {
  records: Member[];
  page: number;
  totalPages: number;
  totalItems: number;
  counts: { pending: number; active: number; inactive: number };
}
export interface MessageResult {
  success: boolean;
  message: string;
}

export interface DashboardData {
  org: { name: string; slug: string; joinCode: string };
  memberCount: number;
  pendingMembers: number;
  seatUsage: number;
  seatCap: number | null;
  recentUpdates: OrgUpdate[];
}

export interface EditData {
  name: string;
  allowMemberKeys: boolean;
  orgKeyFallback: boolean;
  membersSeeOrgUsage: boolean;
  keyStatus: Record<OrgKeyName, boolean>;
  joinCode: string;
}
export interface EditPayload {
  name: string;
  allow_member_keys: boolean;
  org_key_fallback: boolean;
  members_see_org_usage: boolean;
  keys: Partial<Record<OrgKeyName, string>>;
}

export interface InvitesData {
  seats: Seats;
  pendingInvites: PendingInvite[];
  isAdmin: boolean;
}
export interface SendInviteResult {
  email: string;
  role: 'admin' | 'member';
  acceptUrl: string;
}

export interface CreditLedgerData {
  rows: LedgerRow[];
  total: number;
  page: number;
  totalPages: number;
}
export interface UpdatesData {
  rows: OrgUpdate[];
}
export interface DomainsData {
  domains: OrgDomain[];
}
export interface CrmData {
  files: CrmFile[];
}

export interface OrganizationService {
  getMembers(slug: string, query: MembersQuery): Promise<MembersResponse>;
  memberAction(
    slug: string,
    payload: { user_id: string; action: MemberAction; role?: string },
  ): Promise<MessageResult>;
  getDashboard(slug: string): Promise<DashboardData>;
  getEditData(slug: string): Promise<EditData>;
  saveEdit(slug: string, payload: EditPayload): Promise<MessageResult>;
  testApiKeys(slug: string): Promise<TestApiKeysResult>;
  testSingleApiKey(
    slug: string,
    keyName: OrgKeyName,
    keyValue?: string,
  ): Promise<TestApiKeysResult>;
  clearApiKeys(slug: string): Promise<MessageResult>;
  rotateJoinCode(slug: string): Promise<{ joinCode: string }>;
  getInvites(slug: string): Promise<InvitesData>;
  sendInvite(
    slug: string,
    payload: { email: string; role: 'admin' | 'member' },
  ): Promise<SendInviteResult>;
  revokeInvite(slug: string, inviteId: string): Promise<MessageResult>;
  getCreditLedger(slug: string, page?: number): Promise<CreditLedgerData>;
  getUpdates(slug: string): Promise<UpdatesData>;
  getDomains(slug: string): Promise<DomainsData>;
  domainAction(
    slug: string,
    payload: { action: 'add' | 'verify'; domain: string },
  ): Promise<MessageResult>;
  getCrm(slug: string): Promise<CrmData>;
}

// Phase 11: list endpoints put the array in `data` and pagination/counts in `meta`; mutations carry
// the toast in `message`. These re-assemble the existing service interfaces so the org pages barely
// change. Failures throw (the global handler surfaces them).
async function mutate(path: string, init?: RequestInit): Promise<MessageResult> {
  const env = await http.full(path, { method: 'POST', ...init });
  return { success: true, message: env.message ?? '' };
}

export const organizationService: OrganizationService = {
  getMembers: async (slug, query) => {
    const qs = new URLSearchParams({
      status: query.status,
      page: String(query.page ?? 1),
      per_page: String(query.perPage ?? 10),
      ...(query.email ? { email: query.email } : {}),
    });
    const env = await http.full<Member[]>(`${endpoints.org.membersData(slug)}?${qs.toString()}`);
    const meta = (env.meta ?? {}) as { pagination?: PageMeta; counts?: MembersResponse['counts'] };
    const p = meta.pagination ?? ({} as PageMeta);
    return {
      records: env.data,
      page: p.page,
      totalPages: p.totalPages,
      totalItems: p.totalItems,
      counts: meta.counts as MembersResponse['counts'],
    };
  },
  memberAction: (slug, payload) =>
    mutate(endpoints.org.members(slug), { body: JSON.stringify(payload) }),
  getDashboard: (slug) => http<DashboardData>(endpoints.org.dashboardData(slug)),
  getEditData: (slug) => http<EditData>(endpoints.org.editData(slug)),
  saveEdit: (slug, payload) => mutate(endpoints.org.edit(slug), { body: JSON.stringify(payload) }),
  testApiKeys: async (slug) => {
    const data = await http<Pick<TestApiKeysResult, 'testResults'>>(
      endpoints.org.testApiKeys(slug),
      {
        method: 'POST',
      },
    );
    return { success: true, ...data };
  },
  testSingleApiKey: async (slug, keyName, keyValue) => {
    const data = await http<Pick<TestApiKeysResult, 'testResults'>>(
      `${endpoints.org.testApiKeys(slug)}/${keyName}`,
      {
        method: 'POST',
        ...(keyValue ? { body: JSON.stringify({ keyValue }) } : {}),
      },
    );
    return { success: true, ...data };
  },
  clearApiKeys: (slug) => mutate(endpoints.org.clearApiKeys(slug)),
  rotateJoinCode: (slug) =>
    http<{ joinCode: string }>(endpoints.org.rotateJoinCode(slug), { method: 'POST' }),
  getInvites: (slug) => http<InvitesData>(endpoints.org.invitesData(slug)),
  sendInvite: (slug, payload) =>
    http<SendInviteResult>(endpoints.org.inviteSend(slug), {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  revokeInvite: (slug, inviteId) => mutate(endpoints.org.inviteRevoke(slug, inviteId)),
  getCreditLedger: async (slug, page = 1) => {
    const env = await http.full<LedgerRow[]>(
      `${endpoints.org.creditLedgerData(slug)}?page=${page}`,
    );
    const p = (env.meta?.pagination ?? {}) as PageMeta;
    return { rows: env.data, total: p.totalItems, page: p.page, totalPages: p.totalPages };
  },
  getUpdates: async (slug) => ({ rows: await http<OrgUpdate[]>(endpoints.org.updatesData(slug)) }),
  getDomains: async (slug) => ({
    domains: await http<OrgDomain[]>(endpoints.org.domainsData(slug)),
  }),
  domainAction: (slug, payload) =>
    mutate(endpoints.org.domains(slug), { body: JSON.stringify(payload) }),
  getCrm: async (slug) => ({ files: await http<CrmFile[]>(endpoints.org.crmData(slug)) }),
};
