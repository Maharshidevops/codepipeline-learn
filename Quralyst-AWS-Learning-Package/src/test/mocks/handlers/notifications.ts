// MSW handlers for Deal Notifications (Tier B / B1 / F20) — in-memory store, recipient = mock user "u1".
import { http } from 'msw';
import { ok, err } from '@/test/mocks/envelope';

interface MockNotification {
  id: string;
  dealId: string;
  dealName: string;
  companyRecordId: string;
  type: 'mention' | 'terminal_stage_move' | 'new_comment_on_owned_record' | 'added_to_deal';
  message: string;
  read: boolean;
  actorUserId: string;
  actorName: string;
  createdAt: string | null;
}

let notifications: MockNotification[] = [];

export function resetNotifications() {
  notifications = [
    {
      id: 'ntf_1',
      dealId: 'deal_1',
      dealName: 'Project Falcon',
      companyRecordId: 'rec_1',
      type: 'mention',
      message: 'You were mentioned on Acme in “Project Falcon”.',
      read: false,
      actorUserId: 'u2',
      actorName: 'Amit',
      createdAt: '2026-07-23T09:00:00Z',
    },
    {
      id: 'ntf_2',
      dealId: 'deal_1',
      dealName: 'Project Falcon',
      companyRecordId: '',
      type: 'added_to_deal',
      message: 'You were added to the deal “Project Falcon”.',
      read: true,
      actorUserId: 'u2',
      actorName: 'Amit',
      createdAt: '2026-07-22T09:00:00Z',
    },
  ];
}
resetNotifications();

const unreadCount = () => notifications.filter((n) => !n.read).length;

export const notificationsHandlers = [
  http.get('/api/v1/notifications', ({ request }) => {
    const url = new URL(request.url);
    const unread = url.searchParams.get('unread') === 'true';
    const rows = unread ? notifications.filter((n) => !n.read) : notifications;
    return ok({ notifications: rows, unreadCount: unreadCount() });
  }),

  http.post('/api/v1/notifications/read-all', () => {
    notifications = notifications.map((n) => ({ ...n, read: true }));
    return ok({ updated: 0 }, { message: 'All notifications marked read.' });
  }),

  http.post('/api/v1/notifications/:id/read', ({ params }) => {
    const n = notifications.find((x) => x.id === String(params.id));
    if (!n) return err(404, 'Notification not found.');
    n.read = true;
    return ok(null, { message: 'Marked read.' });
  }),
];
