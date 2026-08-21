// Faithful port of QURALYST-20 AdminApprovals.tsx (+ Pending seat requests tab for our version).
// Source of truth: QURALYST-20/artifacts/pe-scraper/src/pages/quralyst/AdminApprovals.tsx
import '@/styles/pages/admin-registrations.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Button, BaseTable } from '@/components/ui';
import { adminService } from '@/services/api';
import type { PendingRegistration, SeatRequest } from '@/types';
import { useToast } from '@/hooks/useToast';
import { useModal } from '@/hooks/useModal';
import { CheckCircle2, ChevronRight, Loader2, Search, XCircle } from 'lucide-react';

type TabId = 'pending' | 'approved' | 'rejected' | 'seat_requests';

const TABS: { value: TabId; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'seat_requests', label: 'Pending seat requests' },
];

/** Same date format as Replit AdminApprovals.formatDate */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function OrganizationApprovalsPage() {
  const toast = useToast();
  const rejectModal = useModal();

  const [tab, setTab] = useState<TabId>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<PendingRegistration[]>([]);
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<PendingRegistration | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const isSeatTab = tab === 'seat_requests';
  const userStatus = isSeatTab ? 'pending' : tab;

  const fetchData = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (opts?.soft) setFetching(true);
      else setLoading(true);
      try {
        const [usersRes, seatsRes] = await Promise.all([
          adminService.getRegistrations({
            status: userStatus,
            page: 1,
            perPage: isSeatTab ? 1 : 50,
            email: isSeatTab ? undefined : search || undefined,
          }),
          adminService.getOrgApprovals({ status: 'pending', page: 1, perPage: 1 }),
        ]);
        if (!isSeatTab) {
          setRecords(usersRes.records);
          setTotalItems(usersRes.totalItems);
        } else {
          setRecords([]);
          setTotalItems(0);
        }
        setSeatRequests(seatsRes.seatRequests);
      } catch {
        toast.error('Unable to load records. Please refresh and try again.');
        setRecords([]);
        setSeatRequests([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    [isSeatTab, search, toast, userStatus],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredSeats = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return seatRequests;
    return seatRequests.filter(
      (r) =>
        r.orgName.toLowerCase().includes(q) ||
        r.orgSlug.toLowerCase().includes(q) ||
        r.requesterEmail.toLowerCase().includes(q),
    );
  }, [seatRequests, search]);

  const handleApprove = async (id: string) => {
    setActionPending(true);
    try {
      const res = await adminService.approveUser(id);
      if (res.success) toast.success(res.message || 'User approved');
      else toast.error(res.message);
      void fetchData({ soft: true });
    } catch {
      toast.error('Approve failed. Please try again.');
    } finally {
      setActionPending(false);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const res = await adminService.rejectUser(rejectTarget.id, rejectReason.trim());
      if (res.success) toast.success(res.message || 'User rejected');
      else toast.error(res.message);
      setRejectTarget(null);
      setRejectReason('');
      rejectModal.close();
      void fetchData({ soft: true });
    } catch {
      toast.error('Reject failed. Please try again.');
    } finally {
      setRejecting(false);
    }
  };

  const handleSeatApprove = async (id: string) => {
    setActionPending(true);
    try {
      const res = await adminService.approveOrgUpdate(id);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
      void fetchData({ soft: true });
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setActionPending(false);
    }
  };

  const handleSeatReject = async (id: string) => {
    setActionPending(true);
    try {
      const res = await adminService.rejectOrgUpdate(id);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
      void fetchData({ soft: true });
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setActionPending(false);
    }
  };

  const metaCol = tab === 'approved' ? 'Approved' : tab === 'rejected' ? 'Reason' : 'Requested';

  const showFooter =
    !loading && ((isSeatTab && filteredSeats.length > 0) || (!isSeatTab && totalItems > 0));

  const footerText = isSeatTab
    ? `Showing ${filteredSeats.length} of ${filteredSeats.length} pending seat request${filteredSeats.length === 1 ? '' : 's'}`
    : `Showing ${records.length} of ${totalItems} ${tab} user${totalItems === 1 ? '' : 's'}`;

  return (
    <div className="admin-approvals-page" data-testid="admin-approvals-page">
      {/* Header — mirrors Replit */}
      <div className="aa-header">
        <div className="aa-breadcrumb">
          <span>QuraLyst Research</span>
          <ChevronRight className="aa-breadcrumb-sep" aria-hidden />
          <span className="aa-breadcrumb-current">Admin Approvals</span>
        </div>
        <h1 className="aa-title">Admin Approvals</h1>
        <p className="aa-subtitle">
          Review who can access QuraLyst. Approve pending registrations or reject requests.
        </p>
      </div>

      {/* Tabs + search */}
      <div className="aa-controls">
        <div className="aa-tabs" role="tablist" aria-label="Approval status tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              className={`aa-tab${tab === t.value ? ' active' : ''}`}
              onClick={() => setTab(t.value)}
              data-testid={`tab-${t.value}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form
          className="aa-search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <div className="aa-search-field">
            <Search className="aa-search-icon" aria-hidden />
            <input
              type="text"
              placeholder="Search email or username"
              autoComplete="off"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              data-testid="input-search-users"
            />
          </div>
          <button type="submit" className="aa-btn-search">
            Search
          </button>
        </form>
      </div>

      {/* Card + table */}
      <div className="aa-card">
        <div className="aa-card-body">
          {loading ? (
            <div className="aa-state">
              <Loader2 className="aa-spinner" aria-hidden />
            </div>
          ) : isSeatTab ? (
            <BaseTable<SeatRequest>
              columns={[
                {
                  key: 'org',
                  header: 'Organization',
                  width: '20%',
                  render: (r) => (
                    <div>
                      <div className="aa-name">{r.orgName}</div>
                      <div className="aa-meta">{r.orgSlug}</div>
                    </div>
                  ),
                },
                {
                  key: 'requester',
                  header: 'Requester',
                  width: '20%',
                  render: (r) => <div className="aa-meta">{r.requesterEmail}</div>,
                },
                {
                  key: 'seats',
                  header: 'Additional seats',
                  width: '14%',
                  render: (r) => <strong>+{r.requestedSeats}</strong>,
                },
                {
                  key: 'currentCap',
                  header: 'Current cap',
                  width: '12%',
                  cellClass: 'aa-muted',
                  render: (r) => (r.currentMax == null ? '—' : r.currentMax),
                },
                {
                  key: 'note',
                  header: 'Note',
                  width: '14%',
                  render: (r) => <span className="aa-meta">{r.note || '—'}</span>,
                },
                {
                  key: 'requested',
                  header: 'Requested',
                  width: '14%',
                  cellClass: 'aa-muted',
                  render: (r) => formatDate(r.createdAt),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  width: '200px',
                  render: (r) => (
                    <div className="aa-actions">
                      <button
                        type="button"
                        className="aa-btn aa-btn-approve"
                        disabled={actionPending}
                        onClick={() => void handleSeatApprove(r.id)}
                      >
                        <CheckCircle2 className="aa-btn-icon" aria-hidden />
                        Approve
                      </button>
                      <button
                        type="button"
                        className="aa-btn aa-btn-reject"
                        disabled={actionPending}
                        onClick={() => void handleSeatReject(r.id)}
                      >
                        <XCircle className="aa-btn-icon" aria-hidden />
                        Reject
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={filteredSeats}
              getRowKey={(r) => r.id}
              emptyMessage={`No pending seat requests${search ? ` matching "${search}"` : ''}.`}
              fetching={fetching}
            />
          ) : (
            <BaseTable<PendingRegistration>
              columns={[
                {
                  key: 'user',
                  header: 'User',
                  width: '36%',
                  render: (u) => (
                    <div>
                      <div className="aa-name">{u.name || u.email || '—'}</div>
                      <div className="aa-meta">{u.email}</div>
                      {u.jobTitle && <div className="aa-meta">{u.jobTitle}</div>}
                    </div>
                  ),
                },
                {
                  key: 'org',
                  header: 'Organization',
                  width: '34%',
                  render: (u) =>
                    u.organization?.name ? (
                      <div>
                        <div className="aa-org-name">{u.organization.name}</div>
                        {u.organization.domain && (
                          <div className="aa-meta">{u.organization.domain}</div>
                        )}
                      </div>
                    ) : (
                      <span className="aa-muted">—</span>
                    ),
                },
                {
                  key: 'meta',
                  header: metaCol,
                  width: '20%',
                  cellClass: 'aa-muted',
                  render: (u) =>
                    tab === 'rejected' ? (
                      u.rejectionReason || (
                        <span style={{ fontStyle: 'italic' }}>No reason given</span>
                      )
                    ) : tab === 'approved' ? (
                      <div>
                        <div>{formatDate(u.approvedAt)}</div>
                        {u.approvedBy && <div className="aa-meta">by {u.approvedBy}</div>}
                      </div>
                    ) : (
                      formatDate(u.createdAt)
                    ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  width: '210px',
                  render: (u) => (
                    <div className="aa-actions">
                      {tab !== 'approved' && (
                        <button
                          type="button"
                          className="aa-btn aa-btn-approve"
                          disabled={actionPending}
                          onClick={() => void handleApprove(u.id)}
                          data-testid={`button-approve-${u.id}`}
                        >
                          <CheckCircle2 className="aa-btn-icon" aria-hidden />
                          Approve
                        </button>
                      )}
                      {tab !== 'rejected' && (
                        <button
                          type="button"
                          className="aa-btn aa-btn-reject"
                          onClick={() => {
                            setRejectTarget(u);
                            setRejectReason('');
                            rejectModal.show();
                          }}
                          data-testid={`button-reject-${u.id}`}
                        >
                          <XCircle className="aa-btn-icon" aria-hidden />
                          Reject
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
              rows={records}
              getRowKey={(u) => u.id}
              emptyMessage={`No ${tab} users${search ? ` matching "${search}"` : ''}.`}
              fetching={fetching}
            />
          )}
        </div>
      </div>

      {showFooter && (
        <p className="aa-footer">
          {footerText}
          {fetching && <Loader2 className="aa-footer-spin" aria-hidden />}
        </p>
      )}

      <Modal open={rejectModal.open} onClose={rejectModal.close} title={undefined} size="md">
        <div className="modal-header">
          <h5 className="modal-title">Reject {rejectTarget?.name || rejectTarget?.email}?</h5>
        </div>
        <div className="modal-body">
          <p className="text-muted mb-3">
            They won&apos;t be able to log in. The reason below is included in the notification
            email.
          </p>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            data-testid="input-reject-reason"
          />
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-link text-decoration-none"
            onClick={rejectModal.close}
          >
            Cancel
          </button>
          <Button
            className="btn btn-danger"
            loading={rejecting}
            onClick={() => void submitReject()}
            data-testid="button-confirm-reject"
          >
            Reject user
          </Button>
        </div>
      </Modal>
    </div>
  );
}
