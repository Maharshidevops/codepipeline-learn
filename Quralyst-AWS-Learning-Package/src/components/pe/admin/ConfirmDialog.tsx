// ConfirmDialog (F28.2) — the shared confirm gate for every destructive/bulk admin action.
// Built on the in-house Modal. States scope + irreversibility in the body; an optional
// `typedConfirm` string forces the operator to type an exact token (used for the dedup merge)
// before the confirm button enables. Fires `onConfirm` exactly once per confirm click.
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Button, Modal, TextInput } from '@/components/ui';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  /** When set, the operator must type this exact string to enable the confirm button. */
  typedConfirm?: string;
  typedConfirmLabel?: string;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  danger = false,
  pending = false,
  typedConfirm,
  typedConfirmLabel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const inputId = useId();

  // Reset the typed token whenever the dialog opens/closes so a reopen starts clean.
  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const typedOk = !typedConfirm || typed.trim() === typedConfirm;

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="mb-3">{children}</div>

      {typedConfirm && (
        <div className="mb-3">
          <TextInput
            id={inputId}
            label={typedConfirmLabel ?? `Type “${typedConfirm}” to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>
      )}

      <div className="d-flex gap-2 justify-content-end">
        <Button variant="popup-secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant={danger ? 'stop' : 'popup-primary'}
          onClick={onConfirm}
          disabled={pending || !typedOk}
          loading={pending}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
