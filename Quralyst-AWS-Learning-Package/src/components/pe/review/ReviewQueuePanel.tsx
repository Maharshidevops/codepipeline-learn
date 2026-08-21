// ReviewQueuePanel (F27.3) — the filterable review-item table. Filters: status (default pending),
// recordType (server-side) and reason (client-side — the backend list endpoint has no reason
// param). Newest-first. Row selection drives BULK-APPROVE behind a count-confirm ConfirmDialog; a
// row opens the detail drawer (diff view + approve/reject/edit). Resolving refreshes the list AND
// the stats header. Access is the router-level pe:dataset gate (this panel adds no extra gate).
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peReviewService } from '@/services/api';
import { Badge, Button, Checkbox, Select, Spinner } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import type { PEReviewItem, PEReviewResolveStatus, PEReviewStatus } from '@/types';
import ConfirmDialog from '@/components/pe/admin/ConfirmDialog';
import { peReviewKeys } from './peReviewKeys';
import ReviewDetailDrawer from './ReviewDetailDrawer';

const STATUS_OPTIONS: { value: PEReviewStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'edited', label: 'Edited' },
];

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function ReviewQueuePanel() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<PEReviewStatus>('pending');
  const [recordType, setRecordType] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerItem, setDrawerItem] = useState<PEReviewItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: peReviewKeys.list(status, recordType || null),
    queryFn: () => peReviewService.listReviewItems({ status, recordType: recordType || null }),
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  // recordType + reason option lists are derived from the loaded rows (the backend has no
  // enum endpoint); reason is applied client-side.
  const recordTypeOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.recordType && set.add(i.recordType));
    return Array.from(set).sort();
  }, [items]);

  const reasonOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.reason && set.add(i.reason));
    return Array.from(set).sort();
  }, [items]);

  const visible = useMemo(
    () => (reason ? items.filter((i) => i.reason === reason) : items),
    [items, reason],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: peReviewKeys.list(status, recordType || null) });
    void queryClient.invalidateQueries({ queryKey: peReviewKeys.stats });
  };

  const resolve = useMutation({
    mutationFn: ({
      id,
      resolveStatus,
      notes,
    }: {
      id: string;
      resolveStatus: PEReviewResolveStatus;
      notes: string | null;
    }) => peReviewService.resolveReviewItem(id, resolveStatus, notes),
    onSuccess: (_res, { resolveStatus }) => {
      setDrawerItem(null);
      toast.success(`Item ${resolveStatus}.`);
      invalidate();
    },
    onError: () => toast.error('Could not resolve the item.'),
  });

  const bulkApprove = useMutation({
    mutationFn: (ids: string[]) => peReviewService.bulkApprove(ids),
    onSuccess: (result) => {
      setBulkOpen(false);
      setSelected(new Set());
      toast.success(`Approved ${result.approved} item(s).`);
      invalidate();
    },
    onError: () => toast.error('Bulk approve failed.'),
  });

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIds = useMemo(
    () => visible.filter((i) => selected.has(i.id)).map((i) => i.id),
    [visible, selected],
  );
  const allVisibleSelected = visible.length > 0 && selectedIds.length === visible.length;

  const toggleAll = () => {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        visible.forEach((i) => next.delete(i.id));
        return next;
      }
      const next = new Set(prev);
      visible.forEach((i) => next.add(i.id));
      return next;
    });
  };

  return (
    <section className="card p-3 mb-4" aria-labelledby="pe-review-queue-heading">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 id="pe-review-queue-heading" className="h5 mb-0">
          Review items
        </h2>
        <Button
          variant="popup-primary"
          onClick={() => setBulkOpen(true)}
          disabled={selectedIds.length === 0}
        >
          Bulk approve ({selectedIds.length})
        </Button>
      </div>

      <div className="d-flex gap-3 flex-wrap mb-3">
        <div style={{ minWidth: 160 }}>
          <span id="pe-review-status-label" className="form-label small text-muted d-block mb-1">
            Status
          </span>
          <Select
            value={status}
            onChange={(v) => {
              setStatus(v as PEReviewStatus);
              setSelected(new Set());
            }}
            options={STATUS_OPTIONS}
            aria-labelledby="pe-review-status-label"
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <span id="pe-review-type-label" className="form-label small text-muted d-block mb-1">
            Record type
          </span>
          <Select
            value={recordType}
            onChange={(v) => {
              setRecordType(v);
              setSelected(new Set());
            }}
            options={[
              { value: '', label: 'All types' },
              ...recordTypeOptions.map((t) => ({ value: t, label: t })),
            ]}
            aria-labelledby="pe-review-type-label"
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <span id="pe-review-reason-label" className="form-label small text-muted d-block mb-1">
            Reason
          </span>
          <Select
            value={reason}
            onChange={setReason}
            options={[
              { value: '', label: 'All reasons' },
              ...reasonOptions.map((r) => ({ value: r, label: r })),
            ]}
            aria-labelledby="pe-review-reason-label"
          />
        </div>
      </div>

      {isPending || !data ? (
        <Spinner />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">
                  <Checkbox
                    id="pe-review-select-all"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    disabled={visible.length === 0 || status !== 'pending'}
                    aria-label="Select all visible items"
                  />
                </th>
                <th scope="col">Type</th>
                <th scope="col">Reason</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Checkbox
                      id={`pe-review-select-${item.id}`}
                      checked={selected.has(item.id)}
                      onChange={() => toggleRow(item.id)}
                      disabled={item.status !== 'pending'}
                      aria-label={`Select item ${item.id}`}
                    />
                  </td>
                  <td>{item.recordType || '—'}</td>
                  <td>{item.reason ? <Badge tone="warning">{item.reason}</Badge> : '—'}</td>
                  <td>
                    <Badge tone={item.status === 'pending' ? 'info' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="text-muted small">{shortDate(item.createdAt)}</td>
                  <td className="text-end">
                    <Button variant="popup-secondary" onClick={() => setDrawerItem(item)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted">
                    No items match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ReviewDetailDrawer
        item={drawerItem}
        open={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        onResolve={(id, resolveStatus, notes) => resolve.mutate({ id, resolveStatus, notes })}
        pending={resolve.isPending}
      />

      <ConfirmDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={() => bulkApprove.mutate(selectedIds)}
        title="Approve selected items?"
        confirmLabel={`Approve ${selectedIds.length} item(s)`}
        pending={bulkApprove.isPending}
      >
        <p className="mb-0">
          {selectedIds.length} item(s) will be approved. Each holding item&apos;s proposed payload
          is applied and its review flag cleared.
        </p>
      </ConfirmDialog>
    </section>
  );
}
