// Admin Pending Registrations — full-page port of Backup/templates/admin/pending_registrations.html.
// Tabs (Pending/Approved/Rejected) + email search + per-tab DataTable + Pagination. Approve/reject/
// delete actions hit adminService and refetch counts + rows.
import '@/styles/pages/admin-registrations.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DataTable, Pagination, Tabs, Modal, Button } from '@/components/ui';
import type { Column } from '@/components/ui';
import { adminService } from '@/services/api';
import type { PendingRegistration } from '@/types';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { useModal } from '@/hooks/useModal';
import { formatDateTime } from '@/lib/datetime';

type Status = 'pending' | 'approved' | 'rejected';

const DELETE_CONFIRM_MESSAGE =
  'CRITICAL: This will permanently purge this user record from the database. This action CANNOT be undone. Are you sure?';

function fmt(value?: string): string {
  if (!value) return '-';
  return formatDateTime(value);
}

export default function PendingRegistrationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const rejectModal = useModal();

  const [status, setStatus] = useState<Status>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [emailQuery, setEmailQuery] = useState('');
  const [page, setPage] = useState(1);

  const [records, setRecords] = useState<PendingRegistration[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<PendingRegistration | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getRegistrations({
        status,
        page,
        email: emailQuery || undefined,
      });
      setRecords(res.records);
      setTotalPages(res.totalPages);
      setCounts(res.counts);
    } catch {
      toast.error('Unable to load records. Please refresh and try again.');
      setRecords([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [status, page, emailQuery, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Debounced email search (~300ms).
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setEmailQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const changeStatus = (next: string) => {
    if (next === status) return;
    setStatus(next as Status);
    setPage(1);
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await adminService.approveUser(id);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } catch {
      toast.error('Action failed. Please try again.');
    }
    void fetchData();
  };

  const openReject = (record: PendingRegistration) => {
    setRejectTarget(record);
    setRejectReason('');
    rejectModal.show();
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const res = await adminService.rejectUser(rejectTarget.id, rejectReason);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
      rejectModal.close();
      setRejectTarget(null);
      void fetchData();
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Permanently',
      message: DELETE_CONFIRM_MESSAGE,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
      const res = await adminService.deleteUser(id);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } catch {
      toast.error('Action failed. Please try again.');
    }
    void fetchData();
  };

  const pendingColumns: Column<PendingRegistration>[] = [
    {
      key: 'person',
      header: 'Person',
      render: (r) => (
        <>
          <div>{r.name || 'Unknown User'}</div>
          <div className="text-muted small">{r.email}</div>
          {r.jobTitle && <div className="text-muted small">{r.jobTitle}</div>}
          {r.phone && <div className="text-muted small">{r.phone}</div>}
        </>
      ),
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (r) => {
        const org = r.organization;
        const orgName = org?.name || '—';
        const website = org?.website;
        const domain = org?.domain;
        const teamSize = org?.teamSize;
        const emailDomain = (r.email || '').split('@')[1] || '';
        const domainMismatch =
          !!domain && !!emailDomain && !emailDomain.toLowerCase().endsWith(domain.toLowerCase());
        const href = website ? (website.startsWith('http') ? website : `http://${website}`) : '';
        return (
          <>
            <div>
              <strong>{orgName}</strong>
            </div>
            {website && (
              <div className="text-muted small">
                <a href={href} target="_blank" rel="noopener">
                  {website}
                </a>
              </div>
            )}
            {domain && (
              <div className="text-muted small">
                domain: {domain}
                {domainMismatch && <span className="badge bg-warning text-dark"> mismatch</span>}
              </div>
            )}
            {teamSize && <div className="text-muted small">size: {teamSize}</div>}
          </>
        );
      },
    },
    { key: 'signupDate', header: 'Signup Date', render: (r) => fmt(r.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="cell-actions">
          <button
            type="button"
            className="btn btn-approve btn-sm"
            onClick={() => void handleApprove(r.id)}
          >
            <i className="bi bi-check-lg me-1" />
            Approve
          </button>
          <button
            type="button"
            className="btn btn-reject btn-sm ms-2"
            aria-label="Reject"
            onClick={() => openReject(r)}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ),
    },
  ];

  const approvedColumns: Column<PendingRegistration>[] = [
    { key: 'name', header: 'Name', render: (r) => r.name || 'Unknown User' },
    { key: 'email', header: 'Email', render: (r) => r.email },
    {
      key: 'approvedAt',
      header: 'Approved At',
      render: (r) => (r.approvedAt ? fmt(r.approvedAt) : 'Legacy (Migration)'),
    },
    { key: 'approvedBy', header: 'Approved By', render: (r) => r.approvedBy || 'System' },
  ];

  const rejectedColumns: Column<PendingRegistration>[] = [
    { key: 'name', header: 'Name', render: (r) => r.name || 'Unknown User' },
    { key: 'email', header: 'Email', render: (r) => r.email },
    { key: 'rejectedDate', header: 'Rejected Date', render: (r) => fmt(r.updatedAt) },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <span className="reason-text">{r.rejectionReason || 'No reason provided'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="cell-actions">
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            onClick={() => void handleApprove(r.id)}
          >
            Revert to Approve
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm ms-2"
            onClick={() => void handleDelete(r.id)}
          >
            <i className="bi bi-trash me-1" />
            Delete Permanently
          </button>
        </div>
      ),
    },
  ];

  const columns: Column<PendingRegistration>[] =
    status === 'approved'
      ? approvedColumns
      : status === 'rejected'
        ? rejectedColumns
        : pendingColumns;

  const emptyMessage =
    'No records found. Try changing search criteria or switch to another status tab.';

  return (
    <div className="admin-approvals-page container-fluid py-4">
      <section className="approvals-hero mb-4">
        <h1 className="approvals-title">Admin Approvals</h1>
        <p className="approvals-subtitle">
          Review and manage new user signups for the platform. Approve or reject pending requests.
        </p>
      </section>

      <section className="approvals-toolbar card mb-4" aria-label="Admin approvals filters">
        <div className="card-body">
          <div className="toolbar-grid">
            <div className="search-wrap">
              <i className="bi bi-search search-leading-icon" />
              <input
                id="adminEmailSearch"
                type="text"
                className="form-control"
                placeholder="Search by email or username..."
                autoComplete="off"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput.trim() !== '' && (
                <button
                  type="button"
                  className="search-clear-btn"
                  aria-label="Clear search"
                  title="Clear search"
                  onClick={() => setSearchInput('')}
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary search-btn"
              onClick={() => {
                setEmailQuery(searchInput.trim());
                setPage(1);
              }}
            >
              <i className="bi bi-search me-1" />
              Search
            </button>
          </div>
        </div>
      </section>

      <section className="status-tabs mb-4" aria-label="Approval status tabs">
        <Tabs
          tabs={[
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'approved', label: 'Approved', count: counts.approved },
            { id: 'rejected', label: 'Rejected', count: counts.rejected },
          ]}
          active={status}
          onChange={changeStatus}
        />
      </section>

      <section className="approvals-table-shell card" aria-live="polite">
        <DataTable
          columns={columns}
          rows={records}
          loading={loading}
          emptyMessage={emptyMessage}
          stickyHeader={false}
          getRowKey={(r) => r.id}
        />
        <div className="card-footer pagination-footer">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </section>

      <Modal open={rejectModal.open} onClose={rejectModal.close} title={undefined} size="md">
        <div className="modal-header bg-danger text-white">
          <h5 className="modal-title">Reject User: {rejectTarget?.email || ''}</h5>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to decline this registration?</p>
          <div className="mb-3">
            <label className="form-label" htmlFor="rejectionReason">
              Reason (Optional, sent to user):
            </label>
            <textarea
              id="rejectionReason"
              className="form-control"
              name="rejection_reason"
              rows={3}
              placeholder="e.g., Only corporate emails are allowed."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={rejectModal.close}>
            Cancel
          </button>
          <Button
            className="btn btn-danger"
            loading={rejecting}
            onClick={() => void submitReject()}
          >
            Confirm Rejection
          </Button>
        </div>
      </Modal>
    </div>
  );
}
