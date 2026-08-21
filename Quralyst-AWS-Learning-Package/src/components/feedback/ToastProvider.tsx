// Popup/Toast system — React port of Backup/static/js/components/popups.js (PopupManager).
// Renders the same .popup-overlay / .popup-box markup (alerts.css). Closes on Escape + outside-click;
// success and info auto-hide after 2.5–3s. Public hooks live in src/hooks/useToast.ts + useConfirm.ts.
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { registerErrorToast } from '@/lib/toastBus';
import { ToastContext } from './toastContext';
import './toast-provider.css';

export type PopupType =
  | 'default'
  | 'success'
  | 'error'
  | 'info'
  | 'confirm'
  | 'logout'
  | 'signup-success';

interface PopupButton {
  text: string;
  variant: 'popup-btn-primary' | 'popup-btn-secondary';
  onClick?: () => void;
}

interface PopupConfig {
  id: number;
  title: string;
  message?: string;
  body?: ReactNode; // rich content (signup-success card); overrides message
  type: PopupType;
  buttons: PopupButton[];
  autoHide?: boolean;
  autoHideDelay?: number;
}

export interface SignupUserDetails {
  name: string;
  username: string;
  email: string;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface ToastContextValue {
  success: (title: string, message?: string, autoHide?: boolean) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string, autoHide?: boolean) => void;
  dismiss: () => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  logoutConfirm: (onLogout: () => void) => void;
  signupSuccess: (userDetails: SignupUserDetails) => void;
}

// Tabbable elements inside a popup dialog (for the focus trap on interactive popups — Phase 17 fix).
const POPUP_FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// One overlay; manages its own enter/exit animation + auto-hide, mirroring PopupManager timings.
function PopupItem({ popup, onClose }: { popup: PopupConfig; onClose: (id: number) => void }) {
  const [shown, setShown] = useState(false);
  // a11y (Phase 35): name the dialog after its title so SRs announce it (axe: aria-dialog-name).
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Trap focus only on interactive popups (confirm/error/logout/etc.); auto-hiding success toasts
  // shouldn't steal focus from the user's flow.
  const trapFocus = !popup.autoHide;

  useEffect(() => {
    const enter = window.setTimeout(() => setShown(true), 10);
    let hide: number | undefined;
    if (popup.autoHide) {
      hide = window.setTimeout(() => onClose(popup.id), popup.autoHideDelay ?? 3000);
    }
    return () => {
      window.clearTimeout(enter);
      if (hide) window.clearTimeout(hide);
    };
  }, [popup, onClose]);

  // a11y (Phase 17 fix): move focus into the dialog on open, restore to the trigger on close.
  useEffect(() => {
    if (!trapFocus) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const box = boxRef.current;
    const first = box?.querySelector<HTMLElement>(POPUP_FOCUSABLE);
    (first ?? box)?.focus();
    return () => {
      triggerRef.current?.focus?.();
    };
  }, [trapFocus]);

  // Trap Tab so focus cycles within the dialog instead of the page behind it.
  useEffect(() => {
    if (!trapFocus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const box = boxRef.current;
      if (!box) return;
      const focusables = Array.from(box.querySelectorAll<HTMLElement>(POPUP_FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusables.length === 0) {
        e.preventDefault();
        box.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (!box.contains(active)) {
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
  }, [trapFocus]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose(popup.id);
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop click-to-dismiss is a pointer-only convenience; keyboard users dismiss via Escape (ToastProvider document listener) or the popup buttons.
    <div
      className={`popup-overlay popup-${popup.type}${shown ? ' show' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={boxRef}
        className={`popup-box popup-${popup.type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h3 className="popup-title" id={titleId}>
          {popup.title}
        </h3>
        {popup.body ? (
          <div className="popup-message">{popup.body}</div>
        ) : (
          <p className="popup-message">{popup.message ?? ''}</p>
        )}
        {popup.buttons.length > 0 && (
          <div className="popup-buttons">
            {popup.buttons.map((btn, i) => (
              <button
                key={i}
                type="button"
                className={`popup-btn ${btn.variant}`}
                onClick={() => {
                  btn.onClick?.();
                  onClose(popup.id);
                }}
              >
                {btn.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const idRef = useRef(0);

  // Exit animation: drop .show, remove from DOM after 300ms (matches popups.js closePopup).
  const closePopup = useCallback((id: number) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const push = useCallback((config: Omit<PopupConfig, 'id'>) => {
    const id = ++idRef.current;
    // PopupManager closes existing popups before showing a new one.
    setPopups([{ ...config, id }]);
    return id;
  }, []);

  // Escape closes all (PopupManager.initializeEventListeners).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopups([]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Expose an imperative error toast to non-React callers (QueryClient global handler / http 401).
  // `push` is stable, so this registers once. See src/lib/toastBus.ts.
  useEffect(() => {
    registerErrorToast(
      (title, message = '') =>
        void push({
          title,
          message,
          type: 'error',
          buttons: [{ text: 'OK', variant: 'popup-btn-primary' }],
        }),
    );
    return () => registerErrorToast(null);
  }, [push]);

  const value: ToastContextValue = {
    success: (title, message = '', autoHide = true) =>
      void push({
        title,
        message,
        type: 'success',
        buttons: [{ text: 'OK', variant: 'popup-btn-primary' }],
        autoHide,
        autoHideDelay: 3000,
      }),
    error: (title, message = '') =>
      void push({
        title,
        message,
        type: 'error',
        buttons: [{ text: 'OK', variant: 'popup-btn-primary' }],
      }),
    info: (title, message = '', autoHide = true) =>
      void push({
        title,
        message,
        type: 'info',
        buttons: [{ text: 'OK', variant: 'popup-btn-primary' }],
        autoHide,
        autoHideDelay: 2500,
      }),
    dismiss: () => setPopups([]),
    confirm: (options) =>
      new Promise<boolean>((resolve) => {
        push({
          title: options.title,
          message: options.message ?? '',
          type: 'confirm',
          buttons: [
            {
              text: options.confirmText ?? 'Confirm',
              variant: 'popup-btn-primary',
              onClick: () => resolve(true),
            },
            {
              text: options.cancelText ?? 'Cancel',
              variant: 'popup-btn-secondary',
              onClick: () => resolve(false),
            },
          ],
        });
      }),
    logoutConfirm: (onLogout) =>
      void push({
        title: 'Confirm Logout',
        message: 'Are you sure you want to log out?',
        type: 'confirm',
        buttons: [
          { text: 'Log Out', variant: 'popup-btn-primary', onClick: onLogout },
          { text: 'Cancel', variant: 'popup-btn-secondary' },
        ],
      }),
    signupSuccess: (userDetails) =>
      void push({
        title: 'Registration Successful!',
        type: 'signup-success',
        body: (
          <div className="signup-success-body">
            <p className="signup-success-intro">
              Welcome to Quralyst! Your registration has been received.
            </p>
            <div className="user-details-card">
              <h4 className="user-details-title">Your Account Details:</h4>
              <div className="signup-success-details">
                <div className="user-detail-item">
                  <span className="user-detail-label">Name:</span>
                  <span className="user-detail-value">{userDetails.name}</span>
                </div>
                <div className="user-detail-item">
                  <span className="user-detail-label">Username:</span>
                  <span className="user-detail-value">{userDetails.username}</span>
                </div>
                <div className="user-detail-item">
                  <span className="user-detail-label">Email:</span>
                  <span className="user-detail-value">{userDetails.email}</span>
                </div>
              </div>
            </div>
            <p className="signup-success-note">
              We will review your registration and approve your account soon. You will receive an
              email notification once approved.
            </p>
          </div>
        ),
        buttons: [
          {
            text: 'Go to Login',
            variant: 'popup-btn-primary',
            onClick: () => {
              window.location.href = '/auth/login';
            },
          },
          { text: 'Close', variant: 'popup-btn-secondary' },
        ],
      }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {popups.map((p) => (
        <PopupItem key={p.id} popup={p} onClose={closePopup} />
      ))}
    </ToastContext.Provider>
  );
}
