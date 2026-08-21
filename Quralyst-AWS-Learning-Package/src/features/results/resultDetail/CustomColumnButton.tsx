import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { customColumnService } from '@/services/api';
import { useToast } from '@/hooks/useToast';

export default function CustomColumnButton({
  resultId,
  onComplete,
  label: buttonLabel = 'Custom column',
}: {
  resultId: string;
  onComplete?: () => void;
  /** Toolbar label; Target List keeps the default. */
  label?: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(async () => {
      try {
        const s = await customColumnService.getStatus(resultId);
        if (!s.found) return;
        const done = (s.done ?? 0) + (s.skipped ?? 0) + (s.failed ?? 0);
        setProgress(`${done} / ${s.total ?? '?'}`);
        if (!s.running) {
          window.clearInterval(id);
          setRunning(false);
          toast.success(s.label ? `Column "${s.label}" ready.` : 'Custom column complete.');
          onComplete?.();
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, [running, resultId, onComplete, toast]);

  const start = async () => {
    if (!label.trim()) {
      toast.error('Column name is required.');
      return;
    }
    setBusy(true);
    try {
      const res = await customColumnService.start({
        resultId,
        label: label.trim(),
        question: question.trim() || label.trim(),
      });
      setOpen(false);
      setLabel('');
      setQuestion('');
      if (res.alreadyRunning) {
        toast.info('A column fill is already in progress.');
      } else {
        toast.info(`Filling column "${res.label || label}"…`);
      }
      setRunning(true);
      setProgress('0 / ?');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not start custom column.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
        disabled={running}
        onClick={() => setOpen(true)}
      >
        {running ? (
          <>
            <Loader2 style={{ width: 14, height: 14 }} />
            Filling… {progress}
          </>
        ) : (
          <>
            <Plus style={{ width: 14, height: 14 }} />
            {buttonLabel}
          </>
        )}
      </button>

      {open && (
        <div
          className="modal fade show d-block"
          style={{ background: 'rgba(0,0,0,.35)' }}
          role="dialog"
          aria-modal
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add a custom column</h5>
                <button type="button" className="btn-close" onClick={() => setOpen(false)} />
              </div>
              <div className="modal-body">
                <p className="small text-muted">
                  Answers are filled from stored row data only — no re-scraping.
                </p>
                <label htmlFor="custom-column-name" className="form-label small fw-semibold">
                  Column name
                </label>
                <input
                  id="custom-column-name"
                  className="form-control form-control-sm mb-2"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. B2B or B2C"
                />
                <label htmlFor="custom-column-question" className="form-label small fw-semibold">
                  Question (optional)
                </label>
                <textarea
                  id="custom-column-question"
                  className="form-control form-control-sm"
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What should we determine for each company?"
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ background: '#282561', borderColor: '#282561' }}
                  disabled={busy}
                  onClick={() => void start()}
                >
                  {busy ? 'Starting…' : 'Fill column'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
