// Admin fixtures (dummy-data mode). Registrations + org approvals span all three queue statuses;
// plus seat requests, org-updates, and the active/deleted org directory.
import type {
  AdminOrgUpdate,
  OrgApproval,
  OrgDirectoryEntry,
  PendingRegistration,
  SeatRequest,
} from '@/types';

export const mockRegistrations: PendingRegistration[] = [
  {
    id: 'r1',
    name: 'Priya Nair',
    email: 'priya@northstar.io',
    jobTitle: 'Analyst',
    phone: '+1 5551230001',
    organization: {
      name: 'NorthStar Capital',
      domain: 'northstar.io',
      website: 'https://northstar.io',
      teamSize: '11-50',
    },
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-02-05T09:00:00Z',
  },
  {
    id: 'r2',
    name: 'Carlos Mendez',
    email: 'carlos@vertexpe.com',
    jobTitle: 'Associate',
    phone: '+1 5551230002',
    organization: {
      name: 'Vertex PE',
      domain: 'vertexpe.com',
      website: 'https://vertexpe.com',
      teamSize: '1-10',
    },
    createdAt: '2026-02-04T14:00:00Z',
    updatedAt: '2026-02-04T14:00:00Z',
  },
  {
    id: 'r3',
    name: 'Aisha Bello',
    email: 'aisha@meridian.co',
    jobTitle: 'VP',
    phone: '+44 7700900003',
    organization: {
      name: 'Meridian Advisors',
      domain: 'meridian.co',
      website: 'https://meridian.co',
      teamSize: '51-200',
    },
    createdAt: '2026-02-03T11:00:00Z',
    updatedAt: '2026-02-03T11:00:00Z',
  },
  {
    id: 'r4',
    name: 'Tom Becker',
    email: 'tom@harborhill.com',
    jobTitle: 'Partner',
    organization: { name: 'Harbor Hill', domain: 'harborhill.com', teamSize: '11-50' },
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-01-22T10:00:00Z',
    approvedAt: '2026-01-22T10:00:00Z',
    approvedBy: 'admin@quralyst.ai',
  },
  {
    id: 'r5',
    name: 'Lena Fischer',
    email: 'lena@altus.de',
    jobTitle: 'Director',
    organization: { name: 'Altus Group', domain: 'altus.de', teamSize: '201-500' },
    createdAt: '2026-01-18T10:00:00Z',
    updatedAt: '2026-01-19T10:00:00Z',
    approvedAt: '2026-01-19T10:00:00Z',
    approvedBy: 'admin@quralyst.ai',
  },
  {
    id: 'r6',
    name: 'Spam Bot',
    email: 'spam@bad.example',
    jobTitle: '-',
    organization: { name: 'Bad Co', domain: 'bad.example', teamSize: '1-10' },
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-11T10:00:00Z',
    rejectionReason: 'Disposable email domain; could not verify company.',
  },
];

export const mockOrgApprovals: OrgApproval[] = [
  {
    id: 'o1',
    name: 'NorthStar Capital',
    slug: 'northstar-capital',
    joinCode: 'QR-NRTHST',
    ownerEmail: 'priya@northstar.io',
    maxSeats: 5,
    flaggedForReview: false,
    createdAt: '2026-02-05T09:05:00Z',
    updatedAt: '2026-02-05T09:05:00Z',
  },
  {
    id: 'o2',
    name: 'Vertex PE',
    slug: 'vertex-pe',
    joinCode: 'QR-VRTXPE',
    ownerEmail: 'carlos@vertexpe.com',
    maxSeats: 3,
    flaggedForReview: true,
    flagReason: 'Free email domain on owner account.',
    createdAt: '2026-02-04T14:05:00Z',
    updatedAt: '2026-02-04T14:05:00Z',
  },
  {
    id: 'o3',
    name: 'Meridian Advisors',
    slug: 'meridian-advisors',
    joinCode: 'QR-MERIDN',
    ownerEmail: 'aisha@meridian.co',
    maxSeats: 10,
    flaggedForReview: false,
    createdAt: '2026-01-19T11:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z',
    approvedAt: '2026-01-20T11:00:00Z',
    approvedBy: 'admin@quralyst.ai',
  },
  {
    id: 'o4',
    name: 'Shell Org',
    slug: 'shell-org',
    joinCode: 'QR-SHELL0',
    ownerEmail: 'noreply@shell.example',
    maxSeats: null,
    flaggedForReview: true,
    flagReason: 'Suspected duplicate.',
    createdAt: '2026-01-08T11:00:00Z',
    updatedAt: '2026-01-09T11:00:00Z',
    rejectionReason: 'Duplicate of an existing organization.',
  },
];

export const mockSeatRequests: SeatRequest[] = [
  {
    id: 's1',
    orgName: 'Meridian Advisors',
    orgSlug: 'meridian-advisors',
    requesterEmail: 'aisha@meridian.co',
    requestedSeats: 5,
    currentMax: 10,
    note: 'Onboarding a new deal team.',
    createdAt: '2026-02-06T09:00:00Z',
  },
  {
    id: 's2',
    orgName: 'Quralyst',
    orgSlug: 'quralyst',
    requesterEmail: 'jchoudhary@indago-research.com',
    requestedSeats: 10,
    currentMax: 5,
    note: 'Q2 expansion.',
    createdAt: '2026-02-05T16:00:00Z',
  },
];

export const mockAdminOrgUpdates: AdminOrgUpdate[] = [
  {
    id: 'au1',
    summary: 'Meridian Advisors requested +5 seats.',
    updateType: 'seat_increase_requested',
    status: 'pending',
    organizationId: 'o3',
  },
  {
    id: 'au2',
    summary: 'Quralyst requested +10 seats.',
    updateType: 'seat_increase_requested',
    status: 'pending',
    organizationId: 'org_quralyst',
  },
  {
    id: 'au3',
    summary: 'NorthStar Capital plan changed to Growth.',
    updateType: 'plan_change',
    status: 'completed',
    organizationId: 'o1',
  },
];

export const mockActiveOrgs: { name: string; slug: string }[] = [
  { name: 'Quralyst', slug: 'quralyst' },
  { name: 'Meridian Advisors', slug: 'meridian-advisors' },
  { name: 'NorthStar Capital', slug: 'northstar-capital' },
];

export const mockDeletedOrgs: OrgDirectoryEntry[] = [
  { id: 'd1', name: 'Legacy Holdings', slug: 'legacy-holdings', deletedAt: '2026-01-15T00:00:00Z' },
  { id: 'd2', name: 'Test Org', slug: 'test-org', deletedAt: '2025-12-30T00:00:00Z' },
];
