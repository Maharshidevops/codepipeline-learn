// FitOverrideSelect (Tier A / A6 / F6) — per-row editable Fit verdict for a result row.
// Changing the value opens an optional-rationale modal; on save it POSTs the override, which
// persists the new label and teaches scoring memory (analyst + firm memory for buyer lists).
// Optimistic with revert-on-failure. Self-contained: drop into a result-table cell.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { resultsService, type FitLabel } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import './fit-override.css';

const FIT_LABELS: FitLabel[] = ['Fit', 'Partial Fit', 'No Fit', 'Insufficient Info'];

interface Props {
  resultId: string;
  companyName: string;
  value: string; // current fit text from the row (may be blank/non-standard)
  onChange?: (next: FitLabel) => void;
}

export default function FitOverrideSelect({ resultId, companyName, value, onChange }: Props) {
  const toast = useToast();
  const [current, setCurrent] = useState(value);
  const [pending, setPending] = useState<FitLabel | null>(null);
  const [rationale, setRationale] = useState('');
  const [saving, setSaving] = useState(false);

  // Always allow selecting the 4 labels; keep the current (possibly non-standard) value visible.
  const options =
    current && !FIT_LABELS.includes(current as FitLabel) ? [current, ...FIT_LABELS] : FIT_LABELS;

  const openConfirm = (next: string) => {
    if (next === current) return;
    setPending(next as FitLabel);
    setRationale('');
  };

  const confirm = async () => {
    if (!pending) return;
    const prev = current;
    setCurrent(pending);
    setSaving(true);
    try {
      await resultsService.saveFitOverride(resultId, {
        companyName,
        newFit: pending,
        rationale: rationale.trim() || undefined,
      });
      toast.success('Fit updated.');
      onChange?.(pending);
      setPending(null);
    } catch (err) {
      setCurrent(prev); // never show a value that didn't persist
      toast.error((err as { message?: string })?.message ?? 'Failed to override fit.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setPending(null);
    setRationale('');
  };

  return (
    <>
      <select
        className="form-select form-select-sm"
        aria-label={`Fit for ${companyName}`}
        value={current}
        disabled={saving}
        onChange={(e) => openConfirm(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      {pending &&
        // Portal to <body>: the modal must escape the table's transformed/sticky ancestors
        // (tables.css row-hover `transform`) — a position:fixed overlay nested inside a
        // transformed cell re-anchors to that cell and flickers as hover transforms toggle.
        createPortal(
          <div className="modal-backdrop-inline" role="dialog" aria-label="Confirm fit override">
            <div className="fit-override-modal">
              <h6 className="mb-2">
                Override fit for <strong>{companyName || 'this company'}</strong>
              </h6>
              <p className="text-muted small mb-2">
                Changing to <strong>{pending}</strong>. Add an optional reason — it teaches the AI
                why.
              </p>
              <textarea
                className="form-control mb-3"
                rows={3}
                placeholder="Optional: why is this the right verdict? (e.g. recurring revenue is 70%)"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                aria-label="Override rationale"
              />
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-standard"
                  onClick={cancel}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={confirm}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save override'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
