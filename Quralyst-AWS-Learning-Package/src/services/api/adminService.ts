// Admin service — staff approval queues + org directory. Real impl hits the endpoints; MSW
// intercepts in mock mode (paginating/filtering to mirror the Flask admin routes).
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  AdminOrgUpdate,
  OrgApproval,
  OrgDirectoryEntry,
  PageMeta,
  PendingRegistration,
  SeatRequest,
} from '@/types';

export type QueueStatus = 'pending' | 'approved' | 'rejected';

export interface RegistrationsQuery {
  status: QueueStatus;
  page?: number;
  perPage?: number;
  email?: string;
}
export interface RegistrationsResponse {
  records: PendingRegistration[];
  page: number;
  totalPages: number;
  totalItems: number;
  counts: { pending: number; approved: number; rejected: number };
}
export interface OrgApprovalsResponse {
  records: OrgApproval[];
  page: number;
  totalPages: number;
  totalItems: number;
  counts: { pending: number; approved: number; rejected: number };
  seatRequests: SeatRequest[];
}
export interface MessageResult {
  success: boolean;
  message: string;
}
export interface OrganizationsListData {
  activeOrgs: { name: string; slug: string }[];
  deletedOrgs: OrgDirectoryEntry[];
}

export interface AdminService {
  getRegistrations(query: RegistrationsQuery): Promise<RegistrationsResponse>;
  approveUser(id: string): Promise<MessageResult>;
  rejectUser(id: string, reason: string): Promise<MessageResult>;
  deleteUser(id: string): Promise<MessageResult>;
  getOrgApprovals(query: RegistrationsQuery): Promise<OrgApprovalsResponse>;
  approveOrganization(id: string): Promise<MessageResult>;
  rejectOrganization(id: string, reason: string): Promise<MessageResult>;
  approveOrgUpdate(id: string): Promise<MessageResult>;
  rejectOrgUpdate(id: string): Promise<MessageResult>;
  getOrgUpdates(status?: string): Promise<{ items: AdminOrgUpdate[] }>;
  getOrganizations(): Promise<OrganizationsListData>;
  restoreOrganization(id: string): Promise<MessageResult>;
}

function listQuery(query: RegistrationsQuery): string {
  return new URLSearchParams({
    status: query.status,
    page: String(query.page ?? 1),
    per_page: String(query.perPage ?? 10),
    ...(query.email ? { email: query.email } : {}),
  }).toString();
}

// Phase 11: list endpoints put the array in `data` and pagination/counts (+ seatRequests) in `meta`;
// mutations carry the toast in `message`. These re-assemble the existing service interfaces so the
// admin pages barely change. Failures throw (the global handler surfaces them).
async function mutate(path: string, init?: RequestInit): Promise<MessageResult> {
  const env = await http.full(path, { method: 'POST', ...init });
  return { success: true, message: env.message ?? '' };
}

export const adminService: AdminService = {
  getRegistrations: async (query) => {
    const env = await http.full<PendingRegistration[]>(
      `${endpoints.admin.pendingRegistrationsData}?${listQuery(query)}`,
    );
    const meta = (env.meta ?? {}) as {
      pagination?: PageMeta;
      counts?: RegistrationsResponse['counts'];
    };
    const p = meta.pagination ?? ({} as PageMeta);
    return {
      records: env.data,
      page: p.page,
      totalPages: p.totalPages,
      totalItems: p.totalItems,
      counts: meta.counts as RegistrationsResponse['counts'],
    };
  },
  approveUser: (id) => mutate(endpoints.admin.approveUser(id)),
  rejectUser: (id, reason) =>
    mutate(endpoints.admin.rejectUser(id), { body: JSON.stringify({ rejection_reason: reason }) }),
  deleteUser: (id) => mutate(endpoints.admin.deleteUser(id)),
  getOrgApprovals: async (query) => {
    const env = await http.full<OrgApproval[]>(
      `${endpoints.admin.orgApprovalsData}?${listQuery(query)}`,
    );
    const meta = (env.meta ?? {}) as {
      pagination?: PageMeta;
      counts?: OrgApprovalsResponse['counts'];
      seatRequests?: SeatRequest[];
    };
    const p = meta.pagination ?? ({} as PageMeta);
    return {
      records: env.data,
      page: p.page,
      totalPages: p.totalPages,
      totalItems: p.totalItems,
      counts: meta.counts as OrgApprovalsResponse['counts'],
      seatRequests: (meta.seatRequests ?? []) as SeatRequest[],
    };
  },
  approveOrganization: (id) => mutate(endpoints.admin.approveOrganization(id)),
  rejectOrganization: (id, reason) =>
    mutate(endpoints.admin.rejectOrganization(id), { body: JSON.stringify({ reason }) }),
  approveOrgUpdate: (id) => mutate(endpoints.admin.approveOrgUpdate(id)),
  rejectOrgUpdate: (id) => mutate(endpoints.admin.rejectOrgUpdate(id)),
  getOrgUpdates: async (status) => ({
    items: await http<AdminOrgUpdate[]>(
      `${endpoints.admin.orgUpdatesData}${status ? `?status=${status}` : ''}`,
    ),
  }),
  getOrganizations: () => http<OrganizationsListData>(endpoints.admin.organizationsData),
  restoreOrganization: (id) => mutate(endpoints.admin.restoreOrganization(id)),
};
