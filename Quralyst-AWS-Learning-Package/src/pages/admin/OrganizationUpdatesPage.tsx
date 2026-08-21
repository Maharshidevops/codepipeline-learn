// Port of Backup/templates/admin/organization_updates.html — cross-org updates list with an
// optional status filter and a per-item "Approve seats" action for pending seat-increase requests.
import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Spinner } from '@/components/ui';
import type { AdminOrgUpdate } from '@/types';
import '@/styles/pages/admin-registrations.css';

export default function OrganizationUpdatesPage() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<AdminOrgUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getOrgUpdates(status || undefined);
      setItems(data.items);
    } catch {
      toast.error('Failed to load updates');
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (id: string) => {
    try {
      const result = await adminService.approveOrgUpdate(id);
      if (result.success) toast.success(result.message || 'Seats approved');
      else toast.error(result.message || 'Failed to approve seats');
    } catch {
      toast.error('Failed to approve seats');
    }
    void load();
  };

  return (
    <div className="container">
      <h1>Cross-org updates ({status})</h1>

      <select
        className="form-select mb-3 admin-updates-filter"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>

      {loading ? (
        <Spinner />
      ) : (
        <ul className="list-group">
          {items.map((i) => (
            <li
              key={i.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <span>
                {i.summary || i.updateType} · org {i.organizationId}
              </span>
              {i.status === 'pending' && i.updateType === 'seat_increase_requested' && (
                <button className="btn btn-sm btn-primary" onClick={() => void handleApprove(i.id)}>
                  Approve seats
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
