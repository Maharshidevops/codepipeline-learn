// Email Sync (Tier B / B9 / F21) — typed facade over /api/v1/email-sync.
// Connect is a full-page browser redirect (OAuth), so it returns an absolute URL rather than fetching.
// Everything else is a normal fetch. All interaction reads are recipient-scoped server-side.
import { http } from '../http';
import { endpoints } from '../endpoints';
import { config } from '@/config';

export type MailboxProvider = 'gmail' | 'outlook';

export interface MailboxStatus {
  connected: boolean;
  email?: string;
  status?: string;
  errorState?: string;
  connectedAt?: string | null;
  lastSyncedAt?: string | null;
}

export interface EmailSyncStatus {
  gmail: MailboxStatus;
  outlook: MailboxStatus;
  nudgeDismissed: boolean;
  configured: { gmail: boolean; outlook: boolean };
  connectionsAllowed: boolean;
}

export interface EmailInteractionDto {
  id: string;
  provider: MailboxProvider;
  entityType: 'company' | 'person';
  entityId: string;
  entityLabel: string;
  messageCount: number;
  firstMessageDate: string | null;
  lastMessageDate: string | null;
  recentSubjects: string[];
  summary: string;
}

export interface PriorContact {
  name: string;
  matched: boolean;
  messageCount?: number;
  lastMessageDate?: string | null;
  summary?: string;
}

export interface EmailSyncService {
  getStatus(): Promise<EmailSyncStatus>;
  connectUrl(provider: MailboxProvider): string;
  disconnect(provider: MailboxProvider): Promise<void>;
  syncNow(provider: MailboxProvider): Promise<{ status: string }>;
  listInteractions(limit?: number): Promise<EmailInteractionDto[]>;
  matchCompanies(companies: { name: string; website?: string }[]): Promise<PriorContact[]>;
  dismissNudge(): Promise<void>;
}

export const emailSyncService: EmailSyncService = {
  getStatus: () => http<EmailSyncStatus>(endpoints.emailSync.status),
  connectUrl: (provider) => `${config.apiBaseUrl}${endpoints.emailSync.connect(provider)}`,
  disconnect: async (provider) => {
    await http(endpoints.emailSync.disconnect(provider), { method: 'DELETE' });
  },
  syncNow: (provider) =>
    http<{ status: string }>(endpoints.emailSync.sync(provider), { method: 'POST' }),
  listInteractions: async (limit = 50) =>
    (await http<{ interactions: EmailInteractionDto[] }>(endpoints.emailSync.interactions(limit)))
      .interactions ?? [],
  matchCompanies: async (companies) =>
    (
      await http<{ results: PriorContact[] }>(endpoints.emailSync.interactionsBatch, {
        method: 'POST',
        body: JSON.stringify({ companies }),
      })
    ).results ?? [],
  dismissNudge: async () => {
    await http(endpoints.emailSync.nudgeDismiss, { method: 'POST' });
  },
};
