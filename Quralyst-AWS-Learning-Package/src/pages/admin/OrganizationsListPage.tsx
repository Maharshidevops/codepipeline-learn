// Port of Backup/templates/admin/organizations_list.html — Active orgs (name, slug) and Deleted
// orgs (name, slug, deletedAt, id) with a confirm-gated "Restore" action per deleted org.
import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { Spinner } from '@/components/ui';
import { formatDateTimeShort } from '@/lib/datetime';
import type { OrgDirectoryEntry } from '@/types';

export default function OrganizationsListPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeOrgs, setActiveOrgs] = useState<{ name: string; slug: string }[]>([]);
  const [deletedOrgs, setDeletedOrgs] = useState<OrgDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getOrganizations();
      setActiveOrgs(data.activeOrgs);
      setDeletedOrgs(data.deletedOrgs);
    } catch {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRestore = async (org: OrgDirectoryEntry) => {
    const ok = await confirm({
      title: 'Restore organization?',
      message: `Restore "${org.name}"?`,
      confirmText: 'Restore',
    });
    if (!ok) return;
    try {
      const result = await adminService.restoreOrganization(org.id);
      if (result.success) toast.success(result.message || 'Organization restored');
      else toast.error(result.message || 'Failed to restore organization');
    } catch {
      toast.error('Failed to restore organization');
    }
    void load();
  };

  if (loading) {
    return (
      <div className="container">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Organizations</h1>

      <h5>Active</h5>
      <ul className="list-group mb-4">
        {activeOrgs.map((o) => (
          <li key={o.slug} className="list-group-item">
            {o.name} · {o.slug}
          </li>
        ))}
      </ul>

      <h5>Deleted</h5>
      <ul className="list-group">
        {deletedOrgs.map((o) => (
          <li key={o.id} className="list-group-item">
            {o.name} — deleted {o.deletedAt ? formatDateTimeShort(o.deletedAt) : ''}
            <form className="d-inline ms-2" onSubmit={(e) => e.preventDefault()}>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => void handleRestore(o)}
              >
                Restore
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
