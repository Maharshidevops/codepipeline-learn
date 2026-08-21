// ReviewDetailDrawer (F27.3) — per-item detail with a DIFF VIEW (current record vs. the item's
// proposed `payload`, changed fields highlighted) and the approve / reject / edit actions with a
// `reviewerNotes` field. Built on the in-house Modal (parity with ConfirmDialog). Approve/edit write
// the item's ENQUEUED payload server-side (the locked PATCH shape has no payload-override field), so
// "edit" opens the payload read-only for review and captures the operator's adjustment in notes.
import { useEffect, useState } from 'react';
import { Badge, Button, Modal, Textarea } from '@/components/ui';
import type { PEReviewItem, PEReviewResolveStatus } from '@/types';
import { buildDiff, displayValue, payloadMeta } from './reviewDiff';

export interface ReviewDetailDrawerProps {
  item: PEReviewItem | null;
  open: boolean;
  onClose: () => void;
  onResolve: (id: string, status: PEReviewResolveStatus, reviewerNotes: string | null) => void;
  pending: boolean;
}

const ACTION_COPY: Record<PEReviewResolveStatus, { label: string; danger: boolean }> = {
  approved: { label: 'Approve', danger: false },
  edited: { label: 'Save edit', danger: false },
  rejected: { label: 'Reject', danger: true },
};

export default function ReviewDetailDrawer({
  item,
  open,
  onClose,
  onResolve,
  pending,
}: ReviewDetailDrawerProps) {
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<PEReviewResolveStatus | null>(null);

  // Reset the working state whenever a different item opens.
  useEffect(() => {
    setNotes('');
    setMode(null);
  }, [item?.id, open]);

  if (!item) return null;

  const diff = buildDiff(item);
  const meta = payloadMeta(item);
  const resolvable = item.status === 'pending';

  const submit = (status: PEReviewResolveStatus) => {
    onResolve(item.id, status, notes.trim() ? notes.trim() : null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Review item" size="lg">
      <dl className="row mb-3">
        <dt className="col-4 col-sm-3 text-muted small">Type</dt>
        <dd className="col-8 col-sm-9 mb-1">{item.recordType || '—'}</dd>
        <dt className="col-4 col-sm-3 text-muted small">Reason</dt>
        <dd className="col-8 col-sm-9 mb-1">
          {item.reason ? <Badge tone="warning">{item.reason}</Badge> : '—'}
        </dd>
        <dt className="col-4 col-sm-3 text-muted small">Status</dt>
        <dd className="col-8 col-sm-9 mb-1">
          <Badge tone={item.status === 'pending' ? 'info' : 'secondary'}>{item.status}</Badge>
        </dd>
        {item.firmId && (
          <>
            <dt className="col-4 col-sm-3 text-muted small">Firm</dt>
            <dd className="col-8 col-sm-9 mb-1">
              <code>{item.firmId}</code>
            </dd>
          </>
        )}
        {meta.itemType && (
          <>
            <dt className="col-4 col-sm-3 text-muted small">Item type</dt>
            <dd className="col-8 col-sm-9 mb-1">{meta.itemType}</dd>
          </>
        )}
        {meta.detail && (
          <>
            <dt className="col-4 col-sm-3 text-muted small">Detail</dt>
            <dd className="col-8 col-sm-9 mb-1">{meta.detail}</dd>
          </>
        )}
      </dl>

      <h3 className="h6 mb-2">Proposed change</h3>
      {diff.length === 0 ? (
        <p className="text-muted small">
          No field-level payload — approving clears the review flag without changing values.
        </p>
      ) : (
        <div className="table-responsive mb-3">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Current</th>
                <th scope="col">Proposed</th>
              </tr>
            </thead>
            <tbody>
              {diff.map((row) => (
                <tr key={row.key} className={row.changed ? 'table-warning' : undefined}>
                  <td>{row.label}</td>
                  <td className="text-muted">{displayValue(row.current)}</td>
                  <td>
                    {row.changed ? (
                      <strong data-testid={`diff-changed-${row.key}`}>
                        {displayValue(row.proposed)}
                      </strong>
                    ) : (
                      displayValue(row.proposed)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {item.reviewerNotes && !resolvable && (
        <p className="small mb-3">
          <span className="text-muted">Reviewer notes: </span>
          {item.reviewerNotes}
        </p>
      )}

      {resolvable ? (
        <>
          {mode === 'edited' && (
            <p className="text-muted small mb-2">
              Approving as an edit still writes the proposed payload above (the record cannot be
              re-shaped from here). Use the notes to record the adjustment you made.
            </p>
          )}
          <Textarea
            id={`review-notes-${item.id}`}
            label="Reviewer notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Why you approved / rejected / edited this item"
          />

          <div className="d-flex gap-2 justify-content-end mt-3 flex-wrap">
            <Button variant="popup-secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="popup-secondary"
              onClick={() => setMode('edited')}
              disabled={pending}
              aria-pressed={mode === 'edited'}
            >
              Edit
            </Button>
            <Button
              variant="stop"
              onClick={() => submit('rejected')}
              disabled={pending}
              loading={pending && mode === 'rejected'}
            >
              {ACTION_COPY.rejected.label}
            </Button>
            <Button
              variant="popup-primary"
              onClick={() => submit(mode === 'edited' ? 'edited' : 'approved')}
              disabled={pending}
              loading={pending && (mode === 'edited' || mode === null)}
            >
              {mode === 'edited' ? ACTION_COPY.edited.label : ACTION_COPY.approved.label}
            </Button>
          </div>
        </>
      ) : (
        <div className="d-flex justify-content-end mt-3">
          <Button variant="popup-secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}
