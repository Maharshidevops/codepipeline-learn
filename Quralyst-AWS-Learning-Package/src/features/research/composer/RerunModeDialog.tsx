// Fresh vs reuse re-run picker — shown when submitting a list that was opened via Edit & Re-run.
import Modal from '@/components/ui/Modal/Modal';

export type RerunMode = 'fresh' | 'reuse';

type Props = {
  open: boolean;
  onClose: () => void;
  onChoose: (mode: RerunMode) => void;
  busy?: boolean;
};

export default function RerunModeDialog({ open, onClose, onChoose, busy }: Props) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="How should we re-run this list?"
      size="md"
      hideClose={!!busy}
      closeOnBackdrop={!busy}
    >
      <p className="text-muted small mb-3">
        This saves a new version of the list — your original stays untouched.
      </p>
      <div className="d-grid gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary text-start p-3"
          disabled={busy}
          onClick={() => onChoose('reuse')}
        >
          <div className="fw-semibold">
            <i className="bi bi-arrow-repeat me-2" />
            Reuse found companies (faster)
          </div>
          <div className="small text-muted mt-1">
            Keeps every company already found and scraped. Only re-scores fit, rewrites rationales,
            and recomputes custom insights with your edited criteria. No new search or website
            scraping.
          </div>
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary text-start p-3"
          disabled={busy}
          onClick={() => onChoose('fresh')}
        >
          <div className="fw-semibold">
            <i className="bi bi-search me-2" />
            Fresh search (full run)
          </div>
          <div className="small text-muted mt-1">
            Runs discovery and enrichment again with your edited criteria — same as a new list, then
            saved as the next version.
          </div>
        </button>
      </div>
      <div className="mt-3 text-end">
        <button type="button" className="btn btn-link" disabled={busy} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

export function RerunBanner({ version, title }: { version?: number; title?: string }) {
  return (
    <div className="rc-rerun-banner">
      <div className="rc-rerun-banner__icon" aria-hidden>
        <i className="bi bi-clock-history" />
      </div>
      <div>
        <p className="rc-rerun-banner__title">
          Re-running {title ? `"${title}"` : 'a previous list'}
          {typeof version === 'number' ? ` (currently v${version})` : ''}
        </p>
        <p className="rc-rerun-banner__body">
          Your criteria are pre-filled below. Edit anything, then run — the result is saved as a new
          version and the original is kept.
        </p>
      </div>
    </div>
  );
}
