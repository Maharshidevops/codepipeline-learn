// PE People — batch-op modal (F25.2/F25.3). One modal drives all six long-running people ops:
// tag / tag-focus / find-emails / verify-emails / contact-enrich / scrape-batch. Each op POSTs and
// gets back a `202 {processId, processType}` (the provider ops first offer a dry-run preview count);
// the modal then binds the SAME SSE progress seam the research/holdings pipeline uses via
// `usePeopleBatchProgress` (which wraps `progressService.openStream`) to show live percentage, a
// cancel button, and terminal done/error states. Pre-flight failures surface inline: 409 (already
// running) and 400 (missing BYOK key) come back as JSON errors before any SSE stream opens.
import { useEffect, useState } from 'react';
import { peService } from '@/services/api';
import { Button, Modal, Toggle } from '@/components/ui';
import { usePeopleBatchProgress } from '@/hooks/usePeopleBatchProgress';
import type { PEEmailOpBody } from '@/services/api';
import type { ApiError, PEPeopleBatchAccepted } from '@/types';

export type PeopleBatchOp =
  | 'tag'
  | 'tagFocus'
  | 'findEmails'
  | 'verifyEmails'
  | 'contactEnrich'
  | 'scrapeBatch';

interface OpConfig {
  title: string;
  description: string;
  /** Provider ops offer a dry-run preview (eligible count) before spending anything. */
  hasPreview: boolean;
  /** Optional boolean toggle rendered on the confirm step. */
  toggle?: { key: 'retag' | 'reverify'; label: string };
  startLabel: string;
}

const OP_CONFIG: Record<PeopleBatchOp, OpConfig> = {
  tag: {
    title: 'Tag people by role',
    description:
      'Classify untagged people into investment / operations / advisor / other using the LLM.',
    hasPreview: false,
    toggle: { key: 'retag', label: 'Re-tag everyone (not just untagged)' },
    startLabel: 'Start tagging',
  },
  tagFocus: {
    title: 'Assign focus areas',
    description: 'Focus-tag investment-role people that are missing focus areas.',
    hasPreview: false,
    startLabel: 'Start focus tagging',
  },
  findEmails: {
    title: 'Find missing emails (Apollo)',
    description:
      'Look up emails for people who currently have none. Requires an Apollo API key and spends Apollo credits.',
    hasPreview: true,
    startLabel: 'Find emails',
  },
  verifyEmails: {
    title: 'Verify inferred emails (Kickbox)',
    description:
      'Verify inferred email addresses. Undeliverable inferred emails are cleared. Requires a Kickbox API key.',
    hasPreview: true,
    toggle: { key: 'reverify', label: 'Re-verify already-verified emails' },
    startLabel: 'Verify emails',
  },
  contactEnrich: {
    title: 'Enrich contacts (Serper)',
    description:
      'Fill missing bio / LinkedIn / email / phone via web search. Requires a Serper API key.',
    hasPreview: false,
    startLabel: 'Start enrichment',
  },
  scrapeBatch: {
    title: 'Re-scrape low-coverage firms',
    description: 'Sequentially re-scrape people for firms with weak bio coverage.',
    hasPreview: false,
    startLabel: 'Start scraping',
  },
};

function preflightMessage(e: unknown): string {
  const err = e as Partial<ApiError>;
  if (err?.status === 409) return err.message || 'This operation is already running.';
  if (err?.status === 400) return err.message || 'A required API key is missing.';
  return err?.message || 'Could not start the operation.';
}

interface PeopleBatchModalProps {
  op: PeopleBatchOp | null;
  onClose: () => void;
  /** Invalidate people/summary queries once the run completes. */
  onDone: () => void;
}

export default function PeopleBatchModal({ op, onClose, onDone }: PeopleBatchModalProps) {
  const progress = usePeopleBatchProgress(onDone);
  const [busy, setBusy] = useState(false);
  const [eligible, setEligible] = useState<number | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [retag, setRetag] = useState(false);
  const [reverify, setReverify] = useState(false);

  // Reset everything whenever the modal opens for a (possibly different) op.
  useEffect(() => {
    if (op) {
      progress.reset();
      setBusy(false);
      setEligible(null);
      setPreflightError(null);
      setRetag(false);
      setReverify(false);
    }
    // progress.reset is stable (useCallback); intentionally keyed on `op` only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);

  if (!op) return null;
  const cfg = OP_CONFIG[op];

  const emailBody = (): PEEmailOpBody => (op === 'verifyEmails' ? { reverify } : {});

  async function runPreview() {
    setBusy(true);
    setPreflightError(null);
    try {
      const res =
        op === 'findEmails'
          ? await peService.previewFindEmails(emailBody())
          : await peService.previewVerifyEmails(emailBody());
      setEligible(res.eligible);
    } catch (e) {
      setPreflightError(preflightMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function startOp() {
    if (!op) return;
    setBusy(true);
    setPreflightError(null);
    try {
      const starters: Record<PeopleBatchOp, () => Promise<PEPeopleBatchAccepted>> = {
        tag: () => peService.tagPeople({ retag }),
        tagFocus: () => peService.tagFocus(),
        findEmails: () => peService.findEmails(emailBody()),
        verifyEmails: () => peService.verifyEmails(emailBody()),
        contactEnrich: () => peService.contactEnrich(),
        scrapeBatch: () => peService.scrapeBatch(),
      };
      const accepted = await starters[op]();
      progress.start(accepted.processId, accepted.processType);
    } catch (e) {
      setPreflightError(preflightMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const running = progress.status === 'running';
  const terminal =
    progress.status === 'done' || progress.status === 'error' || progress.status === 'cancelled';
  // Preview ops must show a count before the (spending) run; non-preview ops start directly.
  const previewPending = cfg.hasPreview && eligible === null;
  const canStart = !cfg.hasPreview || (eligible !== null && eligible > 0);

  return (
    <Modal open onClose={onClose} title={cfg.title} size="md">
      {progress.status === 'idle' && (
        <>
          <p>{cfg.description}</p>

          {cfg.toggle && (
            <div className="mb-3">
              <Toggle
                id={`batch-toggle-${cfg.toggle.key}`}
                label={cfg.toggle.label}
                checked={cfg.toggle.key === 'retag' ? retag : reverify}
                onChange={(e) =>
                  cfg.toggle!.key === 'retag'
                    ? setRetag(e.target.checked)
                    : setReverify(e.target.checked)
                }
              />
            </div>
          )}

          {cfg.hasPreview && eligible !== null && (
            <p className="mb-3" data-testid="batch-eligible">
              {eligible > 0 ? (
                <>
                  <span className="fw-semibold">{eligible.toLocaleString()}</span> eligible.
                </>
              ) : (
                'Nothing to do — no eligible people.'
              )}
            </p>
          )}

          {preflightError && (
            <div className="alert alert-danger" role="alert">
              {preflightError}
            </div>
          )}

          <div className="d-flex gap-2 justify-content-end">
            <Button variant="popup-secondary" onClick={onClose}>
              Cancel
            </Button>
            {previewPending ? (
              <Button onClick={runPreview} disabled={busy}>
                {busy ? 'Checking…' : 'Preview'}
              </Button>
            ) : (
              <Button onClick={startOp} disabled={busy || !canStart}>
                {busy ? 'Starting…' : cfg.startLabel}
              </Button>
            )}
          </div>
        </>
      )}

      {running && (
        <>
          <div className="progress mb-2" style={{ height: 8 }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${progress.percentage}%` }}
              aria-valuenow={progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-muted small">{progress.message || 'Working…'}</p>
          <div className="d-flex justify-content-end">
            <Button variant="popup-secondary" onClick={progress.cancel}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {terminal && (
        <>
          {progress.status === 'done' && (
            <div className="alert alert-success" role="alert">
              {progress.message || 'Complete.'}
            </div>
          )}
          {progress.status === 'error' && (
            <div className="alert alert-danger" role="alert">
              {progress.error || 'The operation failed.'}
            </div>
          )}
          {progress.status === 'cancelled' && (
            <div className="alert alert-warning" role="alert">
              Cancelled. Work already done was saved.
            </div>
          )}
          <div className="d-flex justify-content-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
