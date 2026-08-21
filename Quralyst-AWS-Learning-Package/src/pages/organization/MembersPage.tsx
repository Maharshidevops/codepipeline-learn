// MembersPage — status tabs + email search + DataTable + member actions.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrgPageMeta, useOrgSlug } from '@/layouts/orgSettingsMeta';
import { organizationService } from '@/services/api';
import type {
  MemberAction,
  MemberStatus,
  MembersResponse,
} from '@/services/api/organizationService';
import { DataTable, Pagination, Tabs } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { formatDateTime } from '@/lib/datetime';
import { useAuth } from '@/hooks/useAuth';
import type { Member } from '@/types';

const PER_PAGE = 10;

export default function MembersPage() {
  const slug = useOrgSlug();
  useOrgPageMeta('Members', 'Approve join requests and manage people in this organization.');

  const { currentUser, isAdmin } = useAuth();
  const isOwner = currentUser?.orgRole === 'owner' || isAdmin;

  const toast = useToast();
  const confirm = useConfirm();

  const [status, setStatus] = useState<MemberStatus>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [emailQuery, setEmailQuery] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<MembersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const debounceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setEmailQuery((prev) => {
        const next = searchInput.trim();
        if (next !== prev) setPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    organizationService
      .getMembers(slug, { status, page, perPage: PER_PAGE, email: emailQuery || undefined })
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug, status, page, emailQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const changeTab = (id: string) => {
    if (id === status) return;
    setStatus(id as MemberStatus);
    setPage(1);
  };

  const counts = data?.counts ?? { pending: 0, active: 0, inactive: 0 };

  const updateMemberRole = async (member: Member, newRole: string) => {
    setBusyId(member.id);
    try {
      const result = await organizationService.memberAction(slug, {
        user_id: member.id,
        action: 'change_role',
        role: newRole,
      });
      toast.success(result.message || `Role updated to ${newRole}.`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setBusyId(null);
    }
  };

  const runAction = async (member: Member, action: MemberAction, confirmMessage?: string) => {
    if (confirmMessage) {
      const ok = await confirm({ title: confirmMessage });
      if (!ok) return;
    }
    setBusyId(member.id);
    try {
      const result = await organizationService.memberAction(slug, {
        user_id: member.id,
        action,
      });
      toast.success(result.message || 'Done.');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const emailCol: Column<Member> = { key: 'email', header: 'Email' };
  const nameCol: Column<Member> = {
    key: 'name',
    header: 'Name',
    render: (m) => m.name || '—',
  };
  const roleCol: Column<Member> = {
    key: 'role',
    header: 'Role',
    render: (m) => {
      const role = m.orgRole || 'member';
      if (role === 'owner') {
        return <span className="org-role-badge org-role-badge--owner">owner</span>;
      }
      if (isOwner && status === 'active') {
        return (
          <select
            className="org-role-select"
            value={role}
            disabled={busyId === m.id}
            onChange={(e) => updateMemberRole(m, e.target.value)}
            aria-label={`Change role for ${m.name || m.email}`}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
        );
      }
      return <span className="org-role-text">{role}</span>;
    },
  };
  const statusCol: Column<Member> = {
    key: 'status',
    header: 'Status',
    render: (m) => m.orgStatus || '',
  };

  let columns: Column<Member>[];
  if (status === 'active') {
    columns = [
      emailCol,
      nameCol,
      roleCol,
      statusCol,
      {
        key: 'actions',
        header: 'Actions',
        render: (m) => (
          <div className="cell-actions">
            <button
              type="button"
              className="btn btn-outline-standard btn-sm"
              disabled={busyId === m.id}
              onClick={() => runAction(m, 'suspend', 'Suspend this user?')}
            >
              Suspend
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-standard-shape btn-sm"
              disabled={busyId === m.id}
              onClick={() => runAction(m, 'remove', 'Remove this user from the organization?')}
            >
              Remove
            </button>
          </div>
        ),
      },
    ];
  } else if (status === 'inactive') {
    columns = [emailCol, nameCol, roleCol, statusCol];
  } else {
    columns = [
      emailCol,
      nameCol,
      roleCol,
      {
        key: 'requested',
        header: 'Requested',
        render: (m) => (m.createdAt ? formatDateTime(m.createdAt) : '—'),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (m) => (
          <div className="cell-actions">
            <button
              type="button"
              className="btn btn-standard btn-sm"
              disabled={busyId === m.id}
              onClick={() => runAction(m, 'approve')}
            >
              <i className="bi bi-check-lg me-1" />
              Approve
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-standard-shape btn-sm"
              disabled={busyId === m.id}
              onClick={() => runAction(m, 'reject', 'Reject this membership request?')}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        ),
      },
    ];
  }

  return (
    <div className="org-section">
      <div className="org-section-body">
        <div className="org-toolbar">
          <div className="org-search-wrap">
            <i className="bi bi-search org-search-icon" aria-hidden />
            <input
              type="text"
              className="form-control"
              placeholder="Search by email or username..."
              autoComplete="off"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <Tabs
            tabs={[
              { id: 'pending', label: 'Pending', count: counts.pending },
              { id: 'active', label: 'Active', count: counts.active },
              { id: 'inactive', label: 'Inactive', count: counts.inactive },
            ]}
            active={status}
            onChange={changeTab}
          />
        </div>
      </div>

      <div className="org-table-pad">
        <DataTable
          columns={columns}
          rows={data?.records ?? []}
          loading={loading}
          getRowKey={(m) => m.id}
          variant="quiet"
          emptyMessage="No records found. Try changing search criteria or switch to another status tab."
        />
      </div>

      <div className="org-pagination-wrap">
        <Pagination
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
