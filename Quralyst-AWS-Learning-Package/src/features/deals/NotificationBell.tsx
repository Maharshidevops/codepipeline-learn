// Deal notification bell (Tier B / B1 / F20) — fixed top-right of the authed shell. Polls every 30s
// (TanStack `refetchInterval`), shows an unread badge, and opens a dropdown of recent deal events.
// Clicking one marks it read and navigates to its deal; "Mark all read" clears the badge.
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsService, type DealNotification } from '@/services/api';
import { paths } from '@/routes/paths';
import './notification-bell.css';

const NOTIF_KEY = ['deal-notifications'];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: NOTIF_KEY,
    queryFn: () => notificationsService.list({ limit: 20 }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const items = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const refresh = () => void qc.invalidateQueries({ queryKey: NOTIF_KEY });

  const openNotif = async (n: DealNotification) => {
    if (!n.read) {
      try {
        await notificationsService.markRead(n.id);
      } catch {
        /* best-effort — still navigate */
      }
    }
    setOpen(false);
    refresh();
    navigate(paths.dealWorkspace(n.dealId));
  };

  const markAll = async () => {
    try {
      await notificationsService.markAllRead();
    } catch {
      /* ignore */
    }
    refresh();
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button
        type="button"
        className="notif-bell-btn"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className={`bi ${unread > 0 ? 'bi-bell-fill' : 'bi-bell'}`} aria-hidden="true" />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-panel-head">
            <span className="fw-semibold">Notifications</span>
            {unread > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">No notifications.</div>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notif-item${n.read ? '' : ' unread'}`}
                    onClick={() => openNotif(n)}
                  >
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-meta">
                      {n.dealName}
                      {n.createdAt ? ` · ${new Date(n.createdAt).toLocaleDateString()}` : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
