// InvitesPage — seat summary + send-invite form + pending-invites table.
import { useCallback, useEffect, useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { useOrgPageMeta, useOrgSlug } from '@/layouts/orgSettingsMeta';
import { organizationService } from '@/services/api';
import type { InvitesData } from '@/services/api/organizationService';
import { Badge, Button, DataTable, Select, Spinner } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { formatDateTimeShort } from '@/lib/datetime';
import type { PendingInvite } from '@/types';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

export default function InvitesPage() {
  const slug = useOrgSlug();
  useOrgPageMeta(
    'Invites',
    <>
      Invite colleagues to <strong>this organization</strong>. Anyone in the org can see seats and
      pending invites; only owners and billing admins can send or revoke billing invites.
    </>,
  );

  const toast = useToast();
  const confirm = useConfirm();

  const [data, setData] = useState<InvitesData | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [sending, setSending] = useState(false);
  const [acceptUrl, setAcceptUrl] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    organizationService
      .getInvites(slug)
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    setAcceptUrl('');
    try {
      const result = await organizationService.sendInvite(slug, { email: trimmed, role });
      toast.success(`Invite sent to ${result.email} (${result.role}).`);
      setAcceptUrl(result.acceptUrl);
      setEmail('');
      setRole('member');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send invite.');
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (invite: PendingInvite) => {
    const ok = await confirm({ title: 'Revoke this invitation?', confirmText: 'Revoke' });
    if (!ok) return;
    try {
      const result = await organizationService.revokeInvite(slug, invite.id);
      toast.success(result.message || 'Invite revoked.');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke invite.');
    }
  };

  if (loading || !data) {
    return (
      <div className="org-tab-loading">
        <Spinner />
      </div>
    );
  }

  const { seats, pendingInvites, isAdmin } = data;

  const columns: Column<PendingInvite>[] = [
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (inv) => <Badge tone="secondary">{inv.orgRole || 'member'}</Badge>,
    },
    {
      key: 'sent',
      header: 'Sent',
      render: (inv) => (
        <span className="small text-muted">
          {inv.createdAt ? formatDateTimeShort(inv.createdAt) : '—'}
        </span>
      ),
    },
    {
      key: 'expires',
      header: 'Expires',
      render: (inv) => (
        <span className="small text-muted">
          {inv.expiresAt ? formatDateTimeShort(inv.expiresAt) : '—'}
        </span>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'revoke',
            header: '',
            render: (inv: PendingInvite) => (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger btn-standard-shape"
                onClick={() => handleRevoke(inv)}
              >
                Revoke
              </button>
            ),
          } as Column<PendingInvite>,
        ]
      : []),
  ];

  return (
    <>
      <div className="org-metrics is-two mb-3">
        <div className="org-metric-card">
          <div className="org-metric-label">
            <Users aria-hidden />
            Seats
          </div>
          <div className="org-metric-value">
            {seats.included === null ? seats.active : `${seats.used} / ${seats.included}`}
          </div>
          <div className="org-metric-sub">
            {seats.included === null
              ? `${seats.pending} pending invites · limit not enforced`
              : `${seats.active} active + ${seats.pending} pending`}
          </div>
        </div>
        <div className="org-metric-card">
          <div className="org-metric-label">
            <UserPlus aria-hidden />
            Pending invites
          </div>
          <div className="org-metric-value">{seats.pending}</div>
          <div className="org-metric-sub">
            {seats.remaining !== null && seats.remaining <= 0
              ? 'All seats taken'
              : 'Awaiting acceptance'}
          </div>
        </div>
      </div>

      <div className="org-section">
        <div className="org-section-header">
          <div>
            <h2 className="org-section-title">Email invitations</h2>
            <p className="org-section-sub">
              Work email only; must match a verified domain. Only owners and billing admins can send
              or revoke.
            </p>
          </div>
        </div>
        <div className="org-section-body">
          {seats.remaining !== null && seats.remaining <= 0 && (
            <p className="text-danger small mb-3">
              All seats taken. Remove a member or upgrade your plan to invite more.
            </p>
          )}

          {isAdmin ? (
            <>
              <form className="org-invite-form" onSubmit={handleSend}>
                <div>
                  <label className="org-label" htmlFor="org-invite-email">
                    Email
                  </label>
                  <input
                    id="org-invite-email"
                    type="email"
                    className="form-control"
                    placeholder="teammate@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="org-label" htmlFor="org-invite-role">
                    Role
                  </label>
                  <Select
                    value={role}
                    onChange={(v) => setRole(v as 'admin' | 'member')}
                    options={ROLE_OPTIONS}
                  />
                </div>
                <Button type="submit" loading={sending}>
                  Send invite
                </Button>
              </form>
              {acceptUrl && (
                <div className="alert alert-success mt-3 mb-0">
                  Invite sent. Share link if needed: {acceptUrl}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted small mb-0">
              Ask your organization owner or billing admin to send email invitations.
            </p>
          )}
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div className="org-section">
          <div className="org-section-header">
            <div>
              <h2 className="org-section-title">Pending invites</h2>
            </div>
          </div>
          <div className="org-section-body is-table">
            <DataTable
              columns={columns}
              rows={pendingInvites}
              getRowKey={(inv) => inv.id}
              variant="quiet"
              emptyMessage="No pending invites."
            />
          </div>
        </div>
      )}
    </>
  );
}
