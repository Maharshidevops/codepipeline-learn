// F20 — NotificationBell: unread badge, dropdown list, mark-all-read (MSW-backed).
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { resetNotifications } from '@/test/mocks/handlers/notifications';
import NotificationBell from './NotificationBell';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetNotifications();
});
afterAll(() => server.close());

function renderBell() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NotificationBell', () => {
  it('shows the unread badge and lists notifications', async () => {
    renderBell();
    // Seed has 1 unread → badge "1".
    expect(await screen.findByText('1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(await screen.findByText(/you were mentioned on acme/i)).toBeInTheDocument();
  });

  it('marks all read and clears the badge', async () => {
    const user = userEvent.setup();
    renderBell();
    await user.click(await screen.findByRole('button', { name: /notifications/i }));
    await user.click(await screen.findByRole('button', { name: /mark all read/i }));
    // Badge (the "1") disappears once everything is read.
    await waitFor(() => expect(screen.queryByText('1')).not.toBeInTheDocument());
  });
});
