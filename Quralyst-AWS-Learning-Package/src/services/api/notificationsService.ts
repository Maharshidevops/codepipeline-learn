// Deal Notifications (Tier B / B1 / F20) — typed facade over /api/v1/notifications.
// Poll-based bell: list (with unread count), mark one read, mark all read. All queries are
// recipient-scoped server-side.
import { http } from '../http';
import { endpoints } from '../endpoints';

export type NotificationType =
  | 'mention'
  | 'terminal_stage_move'
  | 'new_comment_on_owned_record'
  | 'added_to_deal';

export interface DealNotification {
  id: string;
  dealId: string;
  dealName: string;
  companyRecordId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  actorUserId: string;
  actorName: string;
  createdAt: string | null;
}

export interface NotificationList {
  notifications: DealNotification[];
  unreadCount: number;
}

export interface NotificationsService {
  list(opts?: { unread?: boolean; limit?: number }): Promise<NotificationList>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export const notificationsService: NotificationsService = {
  list: async ({ unread = false, limit = 50 } = {}) => {
    const data = await http<NotificationList>(endpoints.notifications.list(unread, limit));
    return { notifications: data.notifications ?? [], unreadCount: data.unreadCount ?? 0 };
  },
  markRead: async (id) => {
    await http(endpoints.notifications.read(id), { method: 'POST' });
  },
  markAllRead: async () => {
    await http(endpoints.notifications.readAll, { method: 'POST' });
  },
};
