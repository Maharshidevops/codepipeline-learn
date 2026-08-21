// Modal — generic dialog built on the in-house popup system (.popup-overlay/.popup-box from
// alerts.css) since the legacy app had no standalone modal CSS (it used Bootstrap modals + popups).
// Replaces Bootstrap's data-bs-toggle modals with React state toggling the same .show class.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './modal.css';

// Tabbable elements inside the dialog (used for the focus trap + initial focus).
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  hideClose?: boolean;
  children: ReactNode;
}

const SIZE_MAX_WIDTH: Record<NonNullable<ModalProps['size']>, number> = {
  sm: 400,
  md: 500,
  lg: 800,
  xl: 960,
};

export default function Modal({
  open,
  onClose,
  title,
  size = 'md',
  closeOnBackdrop = true,
  hideClose = false,
  children,
}: ModalProps) {
  const [shown, setShown] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // a11y (Phase 35): name the dialog after its title (when present) so SRs announce it.
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const t = window.setTimeout(() => setShown(true), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  // a11y (Phase 17): remember the trigger, move focus into the dialog on open, and restore focus to
  // the trigger on close. The dialog itself (tabIndex -1) is the fallback target.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const node = dialogRef.current;
      if (!node) return;
      const first = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? node).focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      triggerRef.current?.focus?.();
    };
  }, [open]);

  // Esc closes; Tab is trapped so focus cycles within the dialog (Phase 17).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const node = dialogRef.current;
      if (!node) return;
      const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusables.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (!node.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop click-to-dismiss is a pointer-only convenience; keyboard users dismiss via Escape (document listener above) or the close button.
    <div
      className={`popup-overlay${shown ? ' show' : ''}`}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="popup-box app-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        style={{ maxWidth: SIZE_MAX_WIDTH[size] }}
      >
        {!hideClose && (
          <button type="button" className="popup-close" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        )}
        {title && <h3 className="popup-title" id={titleId}>{title}</h3>}
        <div className="popup-message">{children}</div>
      </div>
    </div>
  );
}
