// PE People export flow (F25.3): paste URLs → /export/resolve review (matched / partial+warning /
// unmatched) → /export CSV download. The CSV carve-out streams through http.download; in jsdom
// URL.createObjectURL is absent so the download is a no-op, but the success toast + close still fire.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import PeopleExportModal from './PeopleExportModal';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderModal(onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <ToastProvider>
        <PeopleExportModal open onClose={onClose} />
      </ToastProvider>,
    ),
  };
}

describe('PeopleExportModal', () => {
  it('resolves pasted URLs into matched / partial / unmatched groups', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText(/firm urls/i), 'https://vistaequitypartners.com');
    await user.click(screen.getByRole('button', { name: /review/i }));

    expect(await screen.findByText('Matched (1)')).toBeInTheDocument();
    expect(screen.getByText('Partial matches (1)')).toBeInTheDocument();
    expect(screen.getByText(/matched via parent domain/i)).toBeInTheDocument();
    expect(screen.getByText('Unmatched (1)')).toBeInTheDocument();
  });

  it('downloads the CSV and closes on confirm', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.type(screen.getByLabelText(/firm urls/i), 'https://vistaequitypartners.com');
    await user.click(screen.getByRole('button', { name: /review/i }));
    await screen.findByText('Matched (1)');

    await user.click(screen.getByRole('button', { name: /download csv/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('requires at least one URL', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /review/i }));
    expect(await screen.findByText(/paste at least one firm url/i)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderModal();
    expect(await axe(container)).toHaveNoViolations();
  });
});
