// ConfirmDialog — declarative alternative to useConfirm(). Renders a .popup-confirm overlay when
// `open`. Most call-sites should prefer useConfirm() (imperative Promise); this exists for cases
// that keep confirm state in component props (e.g. a controlled delete flow).
import { useEffect, useId, useState } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [shown, setShown] = useState(false);
  // a11y (Phase 35): name the dialog after its title so SRs announce it (axe: aria-dialog-name).
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const t = window.setTimeout(() => setShown(true), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop click-to-dismiss is a pointer-only convenience; keyboard users dismiss via Escape (document listener above) or the Cancel button.
    <div
      className={`popup-overlay popup-confirm${shown ? ' show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="popup-box popup-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 className="popup-title" id={titleId}>
          {title}
        </h3>
        <p className="popup-message">{message}</p>
        <div className="popup-buttons">
          <button type="button" className="popup-btn popup-btn-primary" onClick={onConfirm}>
            {confirmText}
          </button>
          <button type="button" className="popup-btn popup-btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
