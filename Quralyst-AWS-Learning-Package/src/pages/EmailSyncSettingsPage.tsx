// Email Sync settings (Tier B / B9 / F21) — connect/disconnect Gmail & Outlook, run a sync now, and
// review indexed company interactions. Layout mirrors the Replit reference (privacy banner, provider
// cards, indexed list) without the server setup-requirements footer. Connect is a full-page OAuth
// redirect; the callback returns here with ?emailSync=connected|error|no_refresh.
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Spinner } from '@/components/ui';
import {
  emailSyncService,
  type MailboxProvider,
  type MailboxStatus,
  type EmailInteractionDto,
} from '@/services/api';
import { useToast } from '@/hooks/useToast';
import '@/styles/pages/email-sync.css';

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
        fill="#EA4335"
      />
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="13" height="13" x="1" y="1" rx="2" fill="#0078D4" />
      <rect width="13" height="13" x="10" y="10" rx="2" fill="#50D9FF" />
      <path d="M1 10h13v4H1z" fill="#0078D4" />
      <path d="M10 1h13v4H10z" fill="#50D9FF" />
    </svg>
  );
}

function ProviderCard({
  label,
  icon,
  description,
  status,
  configured,
  connectionsAllowed,
  onConnect,
  onSync,
  onDisconnect,
  syncing,
  disconnecting,
}: {
  label: string;
  icon: ReactNode;
  description: string;
  status: MailboxStatus;
  configured: boolean;
  connectionsAllowed: boolean;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  syncing: boolean;
  disconnecting: boolean;
}) {
  const canConnect = configured && connectionsAllowed;
  const hasError = status.connected && (status.status === 'error' || !!status.errorState);

  return (
    <div className="criteria-card criteria-card--white mb-0">
      <div className="email-sync-provider">
        <div className="email-sync-provider__icon">{icon}</div>
        <div className="email-sync-provider__body">
          <div className="email-sync-provider__head">
            <h3 className="email-sync-provider__name">{label}</h3>
            {status.connected ? (
              hasError ? (
                <Badge tone="danger">
                  <i className="bi bi-exclamation-triangle" aria-hidden />
                  Reconnect required
                </Badge>
              ) : (
                <Badge tone="success">
                  <i className="bi bi-check-circle" aria-hidden />
                  Connected
                </Badge>
              )
            ) : (
              <Badge tone="secondary">
                <i className="bi bi-x-circle" aria-hidden />
                Not connected
              </Badge>
            )}
          </div>
          <p className="email-sync-provider__desc">{description}</p>

          {hasError && (
            <div className="email-sync-provider__error" role="alert">
              <i className="bi bi-exclamation-triangle" aria-hidden />
              <div>
                <strong>Reconnect required.</strong> The connection to this account has expired or
                been revoked. Click <strong>Disconnect</strong> and reconnect to restore syncing.
                {status.errorState ? ` (${status.errorState})` : ''}
              </div>
            </div>
          )}

          {status.connected && (
            <div className="email-sync-provider__meta">
              {status.email && (
                <p>
                  <strong>Account:</strong> {status.email}
                </p>
              )}
              <p>
                <strong>Connected:</strong> {formatDate(status.connectedAt)}
              </p>
              <p>
                <strong>Last synced:</strong>{' '}
                {syncing
                  ? 'Syncing…'
                  : status.lastSyncedAt
                    ? formatDate(status.lastSyncedAt)
                    : 'Never'}
              </p>
            </div>
          )}

          <div className="email-sync-provider__actions">
            {!status.connected ? (
              <Button
                className="rounded-pill btn-sm"
                disabled={!canConnect}
                title={configured ? '' : `${label} is not configured on this server.`}
                onClick={onConnect}
              >
                <i className="bi bi-envelope me-1" aria-hidden />
                Connect {label}
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm rounded-pill"
                  onClick={onSync}
                  disabled={syncing || disconnecting}
                >
                  {syncing ? (
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden
                    />
                  ) : (
                    <i className="bi bi-arrow-repeat me-1" aria-hidden />
                  )}
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm rounded-pill"
                  onClick={onDisconnect}
                  disabled={disconnecting || syncing}
                >
                  {disconnecting ? (
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden
                    />
                  ) : (
                    <i className="bi bi-plug me-1" aria-hidden />
                  )}
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </>
            )}
          </div>
          {!configured && (
            <p className="email-sync-provider__hint">Not configured on this server yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InteractionRow({ ix }: { ix: EmailInteractionDto }) {
  return (
    <div className="email-sync-ix">
      <div className="email-sync-ix__avatar" aria-hidden>
        <i className="bi bi-building" />
      </div>
      <div className="min-w-0 flex-grow-1">
        <div className="email-sync-ix__tags">
          <span className="email-sync-ix__name">{ix.entityLabel || ix.entityId}</span>
          <span className={`q-badge email-sync-badge--entity`}>
            {ix.entityType === 'person' ? 'Person' : 'Company'}
          </span>
          <span
            className={`q-badge ${
              ix.provider === 'gmail' ? 'email-sync-badge--gmail' : 'email-sync-badge--outlook'
            }`}
          >
            {ix.provider === 'gmail' ? 'Gmail' : 'Outlook'}
          </span>
        </div>
        {ix.summary && <p className="email-sync-ix__summary">{ix.summary}</p>}
        <div className="email-sync-ix__meta">
          <span>
            <i className="bi bi-envelope" aria-hidden />
            {ix.messageCount} email{ix.messageCount !== 1 ? 's' : ''}
          </span>
          {ix.lastMessageDate && (
            <span>
              <i className="bi bi-calendar3" aria-hidden />
              {formatDate(ix.lastMessageDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmailSyncSettingsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [syncingProvider, setSyncingProvider] = useState<MailboxProvider | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<MailboxProvider | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['email-sync-status'],
    queryFn: () => emailSyncService.getStatus(),
    refetchInterval: 15_000,
  });

  const hasAnyConnected = !!(status?.gmail.connected || status?.outlook.connected);

  const { data: interactions, isLoading: interactionsLoading } = useQuery({
    queryKey: ['email-sync-interactions'],
    queryFn: () => emailSyncService.listInteractions(50),
    enabled: hasAnyConnected,
    refetchInterval: hasAnyConnected ? 30_000 : false,
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['email-sync-status'] });
    void qc.invalidateQueries({ queryKey: ['email-sync-interactions'] });
  };

  const handleSync = async (provider: MailboxProvider) => {
    setSyncingProvider(provider);
    try {
      const res = await emailSyncService.syncNow(provider);
      toast.success(
        res.status === 'ok'
          ? `${provider === 'gmail' ? 'Gmail' : 'Outlook'} sync complete`
          : `Sync: ${res.status}`,
      );
      refresh();
    } catch {
      toast.error('Sync failed.');
    } finally {
      setSyncingProvider(null);
    }
  };

  // Surface the OAuth-callback outcome once, then clear the query param.
  // On success, kick off a first sync for any mailbox that has never synced.
  useEffect(() => {
    const r = params.get('emailSync');
    if (!r) return;
    params.delete('emailSync');
    setParams(params, { replace: true });

    if (r === 'connected') {
      toast.success('Mailbox connected.');
      void (async () => {
        try {
          await qc.invalidateQueries({ queryKey: ['email-sync-status'] });
          const s = await emailSyncService.getStatus();
          for (const provider of ['gmail', 'outlook'] as const) {
            if (s[provider].connected && !s[provider].lastSyncedAt) {
              await handleSync(provider);
            }
          }
        } catch {
          // Status refresh / first sync is best-effort; user can click Sync now.
        }
      })();
    } else if (r === 'no_refresh') {
      toast.error('Connected, but no offline access was granted. Try again and allow access.');
      void qc.invalidateQueries({ queryKey: ['email-sync-status'] });
    } else {
      toast.error('Could not connect the mailbox. Please try again.');
      void qc.invalidateQueries({ queryKey: ['email-sync-status'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDisconnect = async (provider: MailboxProvider) => {
    const label = provider === 'gmail' ? 'Gmail' : 'Outlook';
    if (
      !window.confirm(
        `Disconnect ${label}? All indexed email interaction data for this provider will be permanently deleted.`,
      )
    ) {
      return;
    }
    setDisconnectingProvider(provider);
    try {
      await emailSyncService.disconnect(provider);
      toast.success('Disconnected.');
      refresh();
    } catch {
      toast.error('Disconnect failed.');
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const rows = interactions ?? [];

  return (
    <div className="email-sync-page" data-testid="email-sync-page">
      <div>
        <h1 className="email-sync-page__title">Email Inbox Sync</h1>
        <p className="email-sync-page__desc">
          Connect your inbox to index company email interactions.
        </p>
      </div>

      <div className="email-sync-privacy" role="note">
        <i className="bi bi-info-circle email-sync-privacy__icon" aria-hidden />
        <div>
          <p className="email-sync-privacy__title">Privacy first</p>
          <p className="email-sync-privacy__body">
            Only email subject lines and brief previews are ever processed — never full body text.
            No raw email content is stored. The platform generates a one-sentence AI summary per
            company interaction and stores only that.
          </p>
        </div>
      </div>

      {status && !status.connectionsAllowed && (
        <div className="alert alert-warning mb-0">
          Your organization has disabled personal mailbox connections.
        </div>
      )}

      {statusLoading || !status ? (
        <div className="org-tab-loading criteria-card criteria-card--white mb-0">
          <Spinner />
          <span className="ms-2 text-muted small">Loading connection status…</span>
        </div>
      ) : (
        <div className="email-sync-providers">
          <ProviderCard
            label="Gmail"
            icon={<GmailIcon />}
            description="Connect your Gmail account to index email interactions with PE firms, portfolio companies, and banks."
            status={status.gmail}
            configured={status.configured.gmail}
            connectionsAllowed={status.connectionsAllowed}
            onConnect={() => {
              window.location.href = emailSyncService.connectUrl('gmail');
            }}
            onSync={() => void handleSync('gmail')}
            onDisconnect={() => void handleDisconnect('gmail')}
            syncing={syncingProvider === 'gmail'}
            disconnecting={disconnectingProvider === 'gmail'}
          />
          <ProviderCard
            label="Outlook"
            icon={<OutlookIcon />}
            description="Connect your Outlook or Microsoft 365 account to index email interactions."
            status={status.outlook}
            configured={status.configured.outlook}
            connectionsAllowed={status.connectionsAllowed}
            onConnect={() => {
              window.location.href = emailSyncService.connectUrl('outlook');
            }}
            onSync={() => void handleSync('outlook')}
            onDisconnect={() => void handleDisconnect('outlook')}
            syncing={syncingProvider === 'outlook'}
            disconnecting={disconnectingProvider === 'outlook'}
          />
        </div>
      )}

      {hasAnyConnected && (
        <div>
          <div className="email-sync-interactions__head">
            <div>
              <h2 className="email-sync-interactions__title">Indexed Interactions</h2>
              <p className="email-sync-interactions__desc">
                Companies the platform has detected in your email history.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill"
              onClick={() => void qc.invalidateQueries({ queryKey: ['email-sync-interactions'] })}
            >
              <i className="bi bi-arrow-repeat me-1" aria-hidden />
              Refresh
            </button>
          </div>

          {interactionsLoading ? (
            <div className="org-tab-loading criteria-card criteria-card--white mb-0">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <div className="criteria-card criteria-card--white mb-0">
              <div className="email-sync-empty">
                <i className="bi bi-envelope email-sync-empty__icon" aria-hidden />
                <p className="email-sync-empty__title">No interactions indexed yet.</p>
                <p className="email-sync-empty__body">
                  The initial sync runs automatically after connecting — check back shortly.
                </p>
              </div>
            </div>
          ) : (
            <div className="criteria-card criteria-card--white mb-0 p-0 overflow-hidden">
              <div className="email-sync-interactions__count">
                {rows.length} compan{rows.length !== 1 ? 'ies' : 'y'} matched
              </div>
              <div className="px-4">
                {rows.map((ix) => (
                  <InteractionRow key={ix.id} ix={ix} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasAnyConnected && !statusLoading && (
        <div className="criteria-card criteria-card--white mb-0">
          <div className="email-sync-empty">
            <i className="bi bi-envelope email-sync-empty__icon" aria-hidden />
            <p className="email-sync-empty__title">No inbox connected</p>
            <p className="email-sync-empty__body">
              Connect Gmail or Outlook above to start indexing your email interactions with
              portfolio companies, PE firms, and banks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
