// PE Action Queue page (F64 unit 6): the queue view split out of the eight-panel admin console,
// behind the SAME staff-only gate. Pins that the page renders both panels, that the queue view an
// operator watches is the one that got its own route, and an axe audit.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CellModalProvider } from '@/components/ui/Modal/CellModal';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ok } from '@/test/mocks/envelope';
import { endpoints } from '@/services/endpoints';
import { mockPeAdminPauseEnvOverride } from '@/test/mocks/fixtures/peAdmin';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import PEActionQueuePage from './PEActionQueuePage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const LOAD_TIMEOUT = 15_000;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter>
          {/* F65 — the queue tables' Error/Warnings/Firm cells expand into the app-wide cell
              modal, which App.tsx provides in the real tree. */}
          <CellModalProvider>
            <PEActionQueuePage />
          </CellModalProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PEActionQueuePage', () => {
  it('renders the queue view and the pause control together', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /action queue/i, level: 1 })).toBeInTheDocument();
    // Pause ships with the queue deliberately: it is the action you take *because of* what the
    // queue shows, and splitting them would put a two-click gap in the one urgent workflow.
    await screen.findByRole('heading', { name: /queues/i }, { timeout: LOAD_TIMEOUT });
    await screen.findByRole('heading', { name: /pause/i }, { timeout: LOAD_TIMEOUT });
  });

  it('says the view refreshes on its own', async () => {
    renderPage();
    // The jobs query polled at no interval at all before F64.6, so the table was only ever as
    // fresh as the last mount. Saying so is what stops an operator hammering F5.
    expect(screen.getByText(/refreshes automatically/i)).toBeInTheDocument();
  });

  // ── Moved here from PEAdminPage.test.tsx with the panels themselves (F64.6). The behaviour is
  // unchanged; only the page it lives on is. ──────────────────────────────────────────────────

  it('renders the fleet queue fixtures behind the status filter', async () => {
    const user = userEvent.setup();
    renderPage();
    // The fleet-wide status filter (F50.2: the counts ARE the filter) + a job row.
    await screen.findByText(/pending 1/i, {}, { timeout: LOAD_TIMEOUT });
    // The table defaults to `pending`, so reaching the running fixture row means switching status —
    // which doubles as an end-to-end check that the filter really refetches.
    // findByRole, not getByRole: this page renders two panels rather than the admin
    // console's eight, so a synchronous query can lose a race the slower page hid.
    await user.click(
      await screen.findByRole('button', { name: /^running 1/i }, { timeout: LOAD_TIMEOUT }),
    );
    expect(await screen.findByText('worker-1', {}, { timeout: LOAD_TIMEOUT })).toBeInTheDocument();
  });

  it('shows firm names and warnings on the DEFAULT "All queues" tab', async () => {
    // F64 regression: the default landing tab renders the legacy QueuePanel, a different component
    // from the per-queue table. Units 4 and 5 updated only the latter, so an operator opening the
    // page saw bare ObjectIds and no warnings — the columns were "added" to a view nobody lands on.
    renderPage();
    // The legacy table lands on `pending`, so this is the row an operator actually sees first.
    expect(
      await screen.findByText('Accord Asset Partners', {}, { timeout: LOAD_TIMEOUT }),
    ).toBeInTheDocument();
    // ...and its warning badge, which was the other half of the report.
    expect(screen.getByTitle(/low_coverage:website/)).toHaveTextContent('1');
  });

  it('round-trips the pause toggle', async () => {
    const user = userEvent.setup();
    renderPage();
    // F52.2: the label is "Scraper not paused", never "Scraper running" — this endpoint knows only
    // the pause FLAG and has no idea whether a worker process exists, so "running" rendered green
    // for a scraper that was never deployed. Liveness lives in the Queues panel.
    const toggle = await screen.findByRole(
      'switch',
      { name: /scraper not paused/i },
      { timeout: LOAD_TIMEOUT },
    );
    expect(toggle).not.toBeDisabled();
    await user.click(toggle);
    // Exact string (with period) matches the toast only, not the toggle label "Scraper paused".
    expect(await screen.findByText('Scraper paused.')).toBeInTheDocument();
  });

  it('disables the pause toggle with an explanation under an env override', async () => {
    server.use(http.get(endpoints.peAdmin.scraperPause, () => ok(mockPeAdminPauseEnvOverride)));
    renderPage();
    const toggle = await screen.findByRole(
      'switch',
      { name: /scraper paused/i },
      { timeout: LOAD_TIMEOUT },
    );
    expect(toggle).toBeDisabled();
    expect(screen.getByText(/environment override is forcing/i)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByRole('heading', { name: /queues/i }, { timeout: LOAD_TIMEOUT });
    expect(await axe(container)).toHaveNoViolations();
  });
});
