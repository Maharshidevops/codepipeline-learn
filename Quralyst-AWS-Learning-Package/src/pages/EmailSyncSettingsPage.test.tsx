// F21 — EmailSyncSettingsPage: renders provider status from MSW, gates unconfigured providers,
// and lists recent interactions when a mailbox is connected.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { resetEmailSync, seedConnectedGmail } from '@/test/mocks/handlers/emailSync';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import EmailSyncSettingsPage from './EmailSyncSettingsPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetEmailSync();
});
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ToastProvider>
          <EmailSyncSettingsPage />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EmailSyncSettingsPage', () => {
  it('shows connect for the configured provider and gates the unconfigured one', async () => {
    renderPage();
    // Gmail is configured in the mock → a "Connect Gmail" button appears.
    expect(await screen.findByRole('button', { name: /connect gmail/i })).toBeEnabled();
    // Outlook is not configured → note is shown.
    expect(screen.getByText(/not configured on this server/i)).toBeInTheDocument();
  });

  it('lists recent prior-contact interactions when a mailbox is connected', async () => {
    seedConnectedGmail();
    renderPage();
    // The label appears both as a heading and inside the summary line — assert ≥1 + the summary.
    expect((await screen.findAllByText(/acme cooling llc/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/4 emails with acme cooling/i)).toBeInTheDocument();
  });

  it('does not render the setup-requirements footer', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /connect gmail/i })).toBeInTheDocument();
    expect(screen.queryByText(/setup requirements/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/GOOGLE_CLIENT_ID/i)).not.toBeInTheDocument();
  });
});
