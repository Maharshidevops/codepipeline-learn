// ToastProvider dialog axe audit (Phase 35 a11y automation): open a confirm popup via the
// useConfirm() hook (same path the app uses) and assert the rendered dialog has zero axe-core
// violations (aria-modal, aria-labelledby title, focusable buttons).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { ToastProvider } from './ToastProvider';
import { useConfirm } from '@/hooks/useConfirm';

function ConfirmTrigger() {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={() =>
        void confirm({
          title: 'Delete this result?',
          message: 'This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
        })
      }
    >
      open confirm
    </button>
  );
}

describe('ToastProvider dialogs a11y', () => {
  it('renders a confirm dialog with no axe violations', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ConfirmTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /open confirm/i }));
    const dialog = await screen.findByRole('dialog');

    expect(await axe(dialog)).toHaveNoViolations();
  });
});
