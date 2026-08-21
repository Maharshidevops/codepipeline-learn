// Admin types. See REF-DATA-MODEL.md.

export interface PendingRegistration {
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
  phone?: string;
  organization?: { name: string; domain: string; website?: string; teamSize?: string };
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface OrgApproval {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  ownerEmail: string;
  maxSeats: number | null;
  flaggedForReview: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface SeatRequest {
  id: string;
  orgName: string;
  orgSlug: string;
  requesterEmail: string;
  requestedSeats: number;
  currentMax: number | null;
  note?: string;
  createdAt: string;
}

export interface OrgDirectoryEntry {
  id: string;
  name: string;
  slug: string;
  deletedAt?: string;
}

export interface AdminOrgUpdate {
  id: string;
  summary: string;
  updateType: string;
  status: string;
  organizationId: string;
}
