// MSW handlers for Email Sync (Tier B / B9 / F21) — in-memory per-user state (mock user "u1").
import { http } from 'msw';
import { ok } from '@/test/mocks/envelope';

interface MockMailbox {
  connected: boolean;
  email?: string;
  status?: string;
  errorState?: string;
  connectedAt?: string | null;
  lastSyncedAt?: string | null;
}

interface State {
  gmail: MockMailbox;
  outlook: MockMailbox;
  nudgeDismissed: boolean;
}

let state: State;

export function resetEmailSync() {
  state = {
    gmail: { connected: false },
    outlook: { connected: false },
    nudgeDismissed: false,
  };
}

/** Seed a connected Gmail mailbox (for settings-page interaction list tests). */
export function seedConnectedGmail(email = 'analyst@example.com') {
  state.gmail = {
    connected: true,
    email,
    status: 'connected',
    connectedAt: '2025-01-10T00:00:00Z',
    lastSyncedAt: '2025-01-20T00:00:00Z',
  };
}

resetEmailSync();

// A couple of seeded interactions for the prior-contact badge + settings list.
const INTERACTIONS = [
  {
    id: 'ei_1',
    provider: 'gmail',
    entityType: 'company',
    entityId: 'acmecooling.com',
    entityLabel: 'Acme Cooling LLC',
    messageCount: 4,
    firstMessageDate: '2024-11-01T00:00:00Z',
    lastMessageDate: '2025-01-20T00:00:00Z',
    recentSubjects: ['Q1 pricing', 'Re: NDA'],
    summary: '4 emails with Acme Cooling LLC, last Jan 2025. Recent: “Q1 pricing”',
  },
];

export const emailSyncHandlers = [
  http.get('/api/v1/email-sync/status', () =>
    ok({
      gmail: state.gmail,
      outlook: state.outlook,
      nudgeDismissed: state.nudgeDismissed,
      configured: { gmail: true, outlook: false },
      connectionsAllowed: true,
    }),
  ),

  http.post('/api/v1/email-sync/:provider/sync', ({ params }) => {
    const p = String(params.provider) as 'gmail' | 'outlook';
    state[p] = { ...state[p], lastSyncedAt: '2025-01-21T00:00:00Z', status: 'connected' };
    return ok({ status: 'ok', entities: 1, messages: 4 }, { message: 'Sync run complete.' });
  }),

  http.delete('/api/v1/email-sync/:provider', ({ params }) => {
    const p = String(params.provider) as 'gmail' | 'outlook';
    state[p] = { connected: false };
    return ok(null, { message: 'Mailbox disconnected.' });
  }),

  http.get('/api/v1/email-sync/interactions', () => ok({ interactions: INTERACTIONS })),

  http.post('/api/v1/email-sync/interactions/batch', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      companies?: { name?: string; website?: string }[];
    };
    const results = (body.companies ?? []).map((c) => {
      const hit =
        (c.website ?? '').includes('acmecooling.com') || (c.name ?? '') === 'Acme Cooling LLC';
      return hit
        ? {
            name: c.name ?? '',
            matched: true,
            messageCount: 4,
            lastMessageDate: '2025-01-20T00:00:00Z',
            summary: INTERACTIONS[0].summary,
          }
        : { name: c.name ?? '', matched: false };
    });
    return ok({ results });
  }),

  http.post('/api/v1/email-sync/nudge/dismiss', () => {
    state.nudgeDismissed = true;
    return ok(null, { message: 'Nudge dismissed.' });
  }),
];
