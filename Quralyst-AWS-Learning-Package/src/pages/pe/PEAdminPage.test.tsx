// PE Admin Ops console (F28.2): renders the stats/not-found/quality fixtures via MSW, every
// destructive action shows its confirm dialog and fires exactly one request on confirm / none on
// cancel, the dedup preview→select→confirm→merge flow shows the result summary, and an axe audit.
//
// F64.6: the queue view and the pause toggle moved to /pe/action-queue; their tests moved with
// them to PEActionQueuePage.test.tsx rather than being dropped.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import PEAdminPage from './PEAdminPage';

// F57 §2.5: the per-file `vi.setConfig({ testTimeout: 30_000 })` that used to live here is now a
// repo-wide policy in vitest.config.ts (the console fans out to many concurrent MSW round-trips
// and exceeds vitest's 5 s default under parallel load). The LOAD_TIMEOUT below still extends the
// individual findBy waits.

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * CI runs the full suite in parallel — panels need longer than the default 1s findBy timeout.
 * Raised from 5 s for F50: the console now composes NINE panels, so one render fans out to that
 * many concurrent MSW round-trips and the legacy queue table (which `waitForPageLoaded` keys on)
 * settles later than it did when it was one of seven.
 */
const LOAD_TIMEOUT = 20_000;

// F64.6: this used to key on the queue status filter, but the pause + queue panels moved to
// /pe/action-queue (their tests moved with them). It now keys on the monitoring tiles, the
// slowest thing still on THIS page.
async function waitForPageLoaded() {
  await screen.findByText(/peak in-flight/i, {}, { timeout: LOAD_TIMEOUT });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/pe/admin']}>
          <PEAdminPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** The `.card` container for a trigger/dedup card, found via its heading text. */
function cardFor(name: RegExp): HTMLElement {
  const heading = screen.getByRole('heading', { name });
  const card = heading.closest('.card');
  if (!card) throw new Error(`no .card ancestor for ${String(name)}`);
  return card as HTMLElement;
}

describe('PEAdminPage — access grants + talent flow (CU.5)', () => {
  it('lists grants, grants by user id, and revokes with confirm', async () => {
    const user = userEvent.setup();
    renderPage();

    const panel = await screen.findByTestId('access-grants', {}, { timeout: LOAD_TIMEOUT });
    expect(await within(panel).findByText('analyst@client.com')).toBeInTheDocument();

    // Grant by id.
    await user.type(within(panel).getByLabelText(/user id to grant/i), 'u9');
    await user.click(within(panel).getByTestId('pe-grant-submit'));
    await screen.findByText(/access granted to u9@client.com/i);

    // Revoke goes through the confirm dialog (the MSW mock echoes `<userId>@client.com`).
    await user.click(within(panel).getAllByRole('button', { name: /^revoke$/i })[0]);
    await user.click(await screen.findByRole('button', { name: /revoke access/i }));
    await screen.findByText(/access revoked from u2@client.com/i);
  });

  it('runs the talent-flow tile through its confirm dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    // ActionGrid cards render from static config — don't gate on the scrape-queue fetch.
    await screen.findByRole('heading', { name: /run talent flow/i }, { timeout: LOAD_TIMEOUT });
    const card = cardFor(/run talent flow/i);
    await user.click(within(card).getByRole('button', { name: /^run$/i }));
    // Confirm dialog → fire once (generic /:op MSW trigger covers run-talent-flow).
    await user.click(await screen.findByRole('button', { name: /enqueue job/i }));
    await screen.findByText(/run talent flow: job enqueued \(trig-run-talent-flow\)/i);
  });
});

describe('PEAdminPage', () => {
  it('renders stats and quality fixtures', async () => {
    // F64.6: the queue half of this test (status filter -> job row) moved to
    // PEActionQueuePage.test.tsx along with the panel itself.
    renderPage();
    await waitForPageLoaded();
    expect(await screen.findByText(/peak in-flight/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /portfolio-companies quality/i }),
    ).toBeInTheDocument();
  });

  it('fires no request when a destructive action is cancelled, one when confirmed', async () => {
    const user = userEvent.setup();
    let cleanHoldingsCalls = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/api/pe/admin/clean-holdings')) {
        cleanHoldingsCalls += 1;
      }
    });

    renderPage();
    await waitForPageLoaded();
    const card = cardFor(/^clean holdings$/i);
    await user.click(within(card).getByRole('button', { name: /^run$/i }));

    // Confirm dialog appears; cancel fires nothing.
    await screen.findByRole('heading', { name: /run “clean holdings”\?/i });
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(cleanHoldingsCalls).toBe(0);

    // Reopen and confirm → exactly one enqueue request + success toast.
    await user.click(within(card).getByRole('button', { name: /^run$/i }));
    await screen.findByRole('heading', { name: /run “clean holdings”\?/i });
    await user.click(screen.getByRole('button', { name: /enqueue job/i }));
    expect(await screen.findByText(/job enqueued/i)).toBeInTheDocument();
    expect(cleanHoldingsCalls).toBe(1);
  });

  it('runs the dedup preview → select → typed-confirm → merge flow', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPageLoaded();

    await screen.findByRole('heading', { name: /host key:/i }, { timeout: LOAD_TIMEOUT });
    const card = cardFor(/host key:/i);
    await user.click(within(card).getByRole('button', { name: /merge 1 into survivor/i }));

    // Typed-confirm gate: the merge button stays disabled until the host key is typed.
    await screen.findByRole('heading', { name: /merge duplicate firms\?/i });
    const mergeBtn = screen.getByRole('button', { name: /merge firms/i });
    expect(mergeBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/type the host key/i), 'acme-capital.com');
    expect(mergeBtn).not.toBeDisabled();
    await user.click(mergeBtn);

    // Result summary replaces the group form (re-pointed counts).
    expect(await screen.findByText(/holdings moved 4/i)).toBeInTheDocument();
    expect(screen.getByText(/corrections recorded 1/i)).toBeInTheDocument();
  });

  it('shows near-miss name clusters as read-only (no merge control)', async () => {
    renderPage();
    await waitForPageLoaded();
    const heading = await screen.findByRole(
      'heading',
      { name: /near-miss name matches/i },
      { timeout: LOAD_TIMEOUT },
    );
    const card = heading.closest('.card') as HTMLElement;
    expect(within(card).queryByRole('button')).toBeNull();
  });

  it('has no axe violations once loaded', async () => {
    const { container } = renderPage();
    await waitForPageLoaded();
    await screen.findByRole(
      'heading',
      { name: /portfolio-companies quality/i },
      { timeout: LOAD_TIMEOUT },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
