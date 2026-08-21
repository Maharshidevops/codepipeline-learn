// Connect-your-mailbox nudge (Tier B / B9 / F21). Shows once on result pages when no mailbox is
// connected and the user hasn't dismissed it. Dismiss persists server-side. Renders nothing while
// loading, when a mailbox is connected, when already dismissed, or when no provider is configured.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { emailSyncService } from '@/services/api';
import { paths } from '@/routes/paths';

export default function EmailNudgeBanner() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['email-sync-status'],
    queryFn: () => emailSyncService.getStatus(),
    staleTime: 5 * 60_000,
  });

  if (!data) return null;
  const anyConnected = data.gmail.connected || data.outlook.connected;
  const anyConfigured = data.configured.gmail || data.configured.outlook;
  if (anyConnected || data.nudgeDismissed || !anyConfigured || !data.connectionsAllowed)
    return null;

  const dismiss = async () => {
    try {
      await emailSyncService.dismissNudge();
    } catch {
      /* ignore */
    }
    void qc.invalidateQueries({ queryKey: ['email-sync-status'] });
  };

  return (
    <div
      className="alert alert-info d-flex align-items-center justify-content-between gap-2"
      role="note"
    >
      <div>
        <i className="bi bi-envelope-paper me-2" aria-hidden="true" />
        Connect your mailbox to see which of these companies you&apos;ve already emailed.{' '}
        <Link to={paths.emailSync}>Connect Gmail / Outlook</Link>
      </div>
      <button type="button" className="btn-close" aria-label="Dismiss" onClick={dismiss} />
    </div>
  );
}
