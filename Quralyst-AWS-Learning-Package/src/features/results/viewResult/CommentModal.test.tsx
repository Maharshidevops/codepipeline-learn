// CommentModal component test (Phase 29): renders the two slots from MSW data, exercises the
// add flow, author-only gating, and read-only mode.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { commentsHandlers, resetCommentsStore } from '@/test/mocks/handlers/comments';
import { mockUser } from '@/test/mocks/fixtures/users';
import { useAuthStore } from '@/store/authStore';
import CommentModal from './CommentModal';

const server = setupServer(...commentsHandlers);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // The app boots unauthenticated; this UI exercises author-only controls, so seed the current
  // user to the seeded comments' author (slot 1 is authored by mockUser).
  useAuthStore.setState({ currentUser: mockUser, isAuthenticated: true, hydrated: true });
});
afterAll(() => server.close());
beforeEach(() => resetCommentsStore());

function renderModal(companyName: string, readOnly = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CommentModal
        resultId="tl_1"
        companyName={companyName}
        onClose={() => {}}
        readOnly={readOnly}
      />
    </QueryClientProvider>,
  );
}

describe('CommentModal', () => {
  it('renders both slots with the seeded comments and author-only controls', async () => {
    renderModal('Acme 1 Inc.');

    // Slot 1 is authored by the current mock user → Edit/Delete visible.
    expect(await screen.findByText('Strong fit', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Jatin Choudhary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();

    // Slot 2 is Maya's → no editor controls for the current user.
    expect(screen.getByText('Maya Patel')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(1);
  });

  it('adds a comment to an empty slot', async () => {
    const user = userEvent.setup();
    renderModal('Acme 2 Inc.'); // no seeded comments

    const textareas = await screen.findAllByRole('textbox');
    expect(textareas).toHaveLength(2); // both slots empty → both editors shown

    await user.type(textareas[0], 'Fresh internal note');
    await user.click(screen.getAllByRole('button', { name: /^save$/i })[0]);

    await waitFor(() => {
      expect(screen.getByText('Fresh internal note')).toBeInTheDocument();
    });
    // The filled slot now shows the comment card instead of a bare editor.
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('hides every editor control in readOnly mode', async () => {
    renderModal('Acme 1 Inc.', true);

    expect(await screen.findByText('Strong fit', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
