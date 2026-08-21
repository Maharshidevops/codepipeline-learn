// QueuesPanel (F50) — tabbed per-queue view over the seven F46 collections.
//
// What is worth asserting here, in order:
//   1. the tabs exist, one per queue, with the operator's label AND the internal name (the API and
//      logs use the internal one, so showing only "companies" makes a log line unmatchable);
//   2. switching tabs actually refetches THAT queue's jobs — the whole point of the change;
//   3. purge is only offered for terminal statuses, so a mis-click cannot drop live work;
//   4. the operator caveats (pause latency, running jobs not cancelled) reach the screen.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ok } from '@/test/mocks/envelope';
import { endpoints } from '@/services/endpoints';
import {
  mockPeQueuesHealth,
  mockPeQueuesHealthReadError,
  mockPeQueueJobs,
} from '@/test/mocks/fixtures/peAdmin';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { CellModalProvider } from '@/components/ui/Modal/CellModal';
import { MemoryRouter } from 'react-router-dom';
import QueuesPanel from './QueuesPanel';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const LOAD_TIMEOUT = 5000;

/**
 * F65 — the harness now mounts the two providers the panel has always had in the real app but
 * this test omitted: a Router (the per-row "Firm" action is a <Link>) and the cell modal (the
 * Error/Warnings/Firm cells are expandable). Without them the panel rendered only because it
 * happened to use neither; adding either feature would otherwise fail the whole file for a
 * harness gap rather than a real regression.
 */
function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <CellModalProvider>
            <QueuesPanel />
          </CellModalProvider>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/**
 * The tablist renders IMMEDIATELY (it is deliberately not gated on the health query, so the
 * fleet-wide table appears as fast as it did pre-F50) — the per-queue tabs arrive with the health
 * data. So wait for a known queue tab, not merely for the tablist, before querying synchronously.
 */
async function waitForTabs() {
  await screen.findByRole('tab', { name: /companies \(portfolio\)/i }, { timeout: LOAD_TIMEOUT });
  return screen.getByRole('tablist');
}

/**
 * Status buttons carry their count (and sometimes a subset note), so the accessible name is
 * "Failed 2 · 1 permanent" — anchor the start only, never the end. `^failed\b` also keeps this
 * from matching the "Purge failed" op button.
 */
function statusButton(status: string): RegExp {
  return new RegExp(`^${status}\\b`, 'i');
}

/**
 * Open a queue tab, optionally switching off the default `pending` status. The fixtures only carry
 * rows for portfolio+failed, so most assertions here need that second click.
 */
async function openQueueTab(
  user: ReturnType<typeof userEvent.setup>,
  name: RegExp,
  status?: string,
) {
  await waitForTabs();
  await user.click(await screen.findByRole('tab', { name }, { timeout: LOAD_TIMEOUT }));
  if (status) {
    await user.click(
      await screen.findByRole('button', { name: statusButton(status) }, { timeout: LOAD_TIMEOUT }),
    );
  }
}

// ── Tabs ────────────────────────────────────────────────────────────────────

describe('QueuesPanel tabs', () => {
  it('renders one tab per registered queue plus an All tab', async () => {
    renderPanel();
    const tablist = await waitForTabs();
    const tabs = within(tablist).getAllByRole('tab');
    // 7 queues + "All queues"
    expect(tabs).toHaveLength(mockPeQueuesHealth.queues.length + 1);
    expect(within(tablist).getByRole('tab', { name: /all queues/i })).toBeInTheDocument();
  });

  it('labels each tab with the operator name AND the internal queue name', async () => {
    // Both matter: "companies" is what an operator says, "portfolio" is what the API and the log
    // lines use — showing only one makes the other unsearchable.
    renderPanel();
    const tablist = await waitForTabs();
    expect(
      within(tablist).getByRole('tab', { name: /companies \(portfolio\)/i }),
    ).toBeInTheDocument();
    expect(
      within(tablist).getByRole('tab', { name: /fv projection \(projection\)/i }),
    ).toBeInTheDocument();
    expect(
      within(tablist).getByRole('tab', { name: /semantics \(semantic\)/i }),
    ).toBeInTheDocument();
  });

  it('shows the pending count on each queue tab', async () => {
    renderPanel();
    const tablist = await waitForTabs();
    // portfolio has pending: 2 in the fixture
    const tab = within(tablist).getByRole('tab', { name: /companies \(portfolio\)/i });
    expect(tab).toHaveTextContent('2');
  });

  it('defaults to the All tab, which keeps the fleet-wide table', async () => {
    renderPanel();
    await waitForTabs();
    expect(screen.getByRole('tab', { name: /all queues/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // The fleet-wide status filter from the embedded legacy panel — its counts are the F28
    // meta.counts, now rendered as the filter buttons rather than as a separate badge row.
    await screen.findByText(/pending 1/i, {}, { timeout: LOAD_TIMEOUT });
  });

  it('fetches only the selected queue when a tab is chosen', async () => {
    const seen: string[] = [];
    server.use(
      http.get(`/api/pe/admin/queues/:queue/jobs`, ({ params, request }) => {
        const url = new URL(request.url);
        seen.push(`${String(params.queue)}:${url.searchParams.get('status')}`);
        return ok({ jobs: [] }, { meta: { total: 0, page: 1, pageSize: 25 } });
      }),
    );
    const user = userEvent.setup();
    renderPanel();

    await openQueueTab(user, /people \(people\)/i);
    await screen.findByText(/no pending jobs in this queue/i, {}, { timeout: LOAD_TIMEOUT });

    // Only the chosen queue is queried — the tab is a filter, not a client-side slice of everything.
    expect(seen).toEqual(['people:pending']);
  });
});

// ── F57 §2.4.3: pagination + page-reset-on-status-change ──────────────────────
// The default MSW handler returns `total: jobs.length`, which is always ≤ pageSize, so the
// Pagination control (rendered only when total > pageSize) NEVER appeared in a test — the coverage
// hole. This serves a `total` larger than the page so pagination renders, then pins the two
// behaviours: Next advances the page in the request, and switching status resets to page 1.

describe('QueuesPanel pagination', () => {
  function serveManyJobs() {
    const seen: Array<{ status: string; page: string }> = [];
    server.use(
      http.get(`/api/pe/admin/queues/:queue/jobs`, ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page') ?? '1';
        seen.push({ status: url.searchParams.get('status') ?? '', page });
        // 60 total over a page size of 25 → 3 pages, so Pagination renders.
        return ok(
          { jobs: mockPeQueueJobs.slice(0, 2) },
          { meta: { total: 60, page: Number(page), pageSize: 25 } },
        );
      }),
    );
    return seen;
  }

  it('renders pagination when the total exceeds one page', async () => {
    serveManyJobs();
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i);

    // The "N job(s)" summary and the Pagination nav appear.
    expect(
      await screen.findByText(/60 pending job\(s\)/i, {}, { timeout: LOAD_TIMEOUT }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('advances the requested page on Next, and resets to page 1 when the status changes', async () => {
    const seen = serveManyJobs();
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i);
    await screen.findByRole('navigation', { name: /pagination/i }, { timeout: LOAD_TIMEOUT });

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() =>
      expect(seen.some((r) => r.status === 'pending' && r.page === '2')).toBe(true),
    );

    // Switching status must reset to page 1 — otherwise the operator lands on an out-of-range page
    // of a different status.
    await user.click(screen.getByRole('button', { name: statusButton('failed') }));
    await waitFor(() =>
      expect(seen.some((r) => r.status === 'failed' && r.page === '1')).toBe(true),
    );
  });
});

// ── The combined counts-as-filter control ───────────────────────────────────

describe('QueuesPanel status filter', () => {
  it('states each count exactly once, as the filter button itself', async () => {
    // The regression this guards: counts used to render twice — a read-only badge row AND a
    // separate filter row below it.
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i);

    const pending = await screen.findByRole(
      'button',
      { name: statusButton('pending') },
      { timeout: LOAD_TIMEOUT },
    );
    expect(pending).toHaveTextContent('Pending 2');
    // One element carries "Pending 2" — a badge saying the same thing would make this two.
    expect(screen.getAllByText(/^Pending 2$/)).toHaveLength(1);
  });

  it('lands on pending, not failed', async () => {
    // `failed` was the old default and opened on an empty table whenever the queue was healthy.
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i);
    const pending = await screen.findByRole(
      'button',
      { name: statusButton('pending') },
      { timeout: LOAD_TIMEOUT },
    );
    expect(pending).toHaveAttribute('aria-pressed', 'true');
  });

  it('resets to pending when another queue tab is opened', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'completed');
    await openQueueTab(user, /people \(people\)/i);
    const pending = await screen.findByRole(
      'button',
      { name: statusButton('pending') },
      { timeout: LOAD_TIMEOUT },
    );
    expect(pending).toHaveAttribute('aria-pressed', 'true');
  });

  it('folds the subset diagnostics into the status they belong to', async () => {
    // `retrying` is a subset of pending and `permanentFailures` of failed, so as standalone badges
    // they were uninterpretable — 3 failed / 2 permanent means something, "Permanent 2" alone does
    // not.
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i);

    const pending = await screen.findByRole(
      'button',
      { name: statusButton('pending') },
      { timeout: LOAD_TIMEOUT },
    );
    expect(pending).toHaveTextContent(/1 retrying/i);
    expect(screen.getByRole('button', { name: statusButton('failed') })).toHaveTextContent(
      /1 permanent/i,
    );
  });

  it('keeps every count all-status while the rows are filtered', async () => {
    // The counts are the control, so they must not narrow to the selection — otherwise the chosen
    // button reports its own filter and every other reads 0.
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'completed');

    const strip = await screen.findByLabelText(
      /companies queue health/i,
      {},
      { timeout: LOAD_TIMEOUT },
    );
    expect(strip).toHaveTextContent('Pending 2');
    expect(strip).toHaveTextContent('Failed 2');
    expect(strip).toHaveTextContent('Completed 30');
  });
});

// ── The All-queues tab gets the same control ────────────────────────────────

describe('QueuesPanel All tab', () => {
  it('filters the fleet-wide table server-side, defaulting to pending', async () => {
    // Server-side on purpose: the counts are fleet-wide totals but only ~50 rows are fetched, so a
    // client-side slice would show "Failed 3" beside an empty table whenever those failures are
    // older than the 50 newest jobs.
    const seen: (string | null)[] = [];
    server.use(
      http.get('/api/pe/admin/scrape-queue', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('status'));
        return ok(
          { jobs: [], pause: { paused: false, dbPaused: false, envOverride: false } },
          { meta: { counts: { pending: 4, running: 0, completed: 9, failed: 1 } } },
        );
      }),
    );
    renderPanel();

    await screen.findByText(/no pending jobs across the fleet/i, {}, { timeout: LOAD_TIMEOUT });
    expect(seen).toContain('pending');
  });

  it('refetches the fleet-wide table when a status is chosen', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get('/api/pe/admin/scrape-queue', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('status'));
        return ok(
          { jobs: [], pause: { paused: false, dbPaused: false, envOverride: false } },
          { meta: { counts: { pending: 4, running: 0, completed: 9, failed: 1 } } },
        );
      }),
    );
    const user = userEvent.setup();
    renderPanel();

    await screen.findByText(/no pending jobs across the fleet/i, {}, { timeout: LOAD_TIMEOUT });
    await user.click(screen.getByRole('button', { name: statusButton('failed') }));
    await screen.findByText(/no failed jobs across the fleet/i, {}, { timeout: LOAD_TIMEOUT });
    expect(seen).toContain('failed');
  });

  it('does not repeat the fleet totals in the panel header', async () => {
    // They are the All tab's own filter bar now.
    renderPanel();
    await waitForTabs();
    expect(screen.queryByText(/^Fleet:/)).not.toBeInTheDocument();
    expect(screen.getByText(/oldest pending anywhere/i)).toBeInTheDocument();
  });
});

// ── Per-queue health ────────────────────────────────────────────────────────

describe('QueuesPanel health strip', () => {
  it('shows the health metrics for the selected queue', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i);

    const strip = await screen.findByLabelText(
      /companies queue health/i,
      {},
      { timeout: LOAD_TIMEOUT },
    );
    expect(strip).toHaveTextContent('Pending 2');
    expect(strip).toHaveTextContent('Running 1');
    expect(strip).toHaveTextContent('Failed 2');
    // The permanent-failure count only appears when non-zero, and now rides on the Failed button
    // rather than standing alone as its own badge.
    expect(strip).toHaveTextContent(/1 permanent/i);
    expect(strip).toHaveTextContent(/oldest pending/i);
    expect(strip).toHaveTextContent(/failure rate: 10\.0%/i);
  });

  it('renders a dash, not 0s, when nothing is pending', async () => {
    // `oldestPendingAgeSeconds: null` means "nothing is waiting" — 0s would read as "the head of
    // the queue is fresh", which is a different state.
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /investment banks \(ib_scrape\)/i);

    const strip = await screen.findByLabelText(
      /investment banks queue health/i,
      {},
      { timeout: LOAD_TIMEOUT },
    );
    expect(strip).toHaveTextContent(/oldest pending:\s*—/i);
  });
});

// ── Job rows ────────────────────────────────────────────────────────────────

describe('QueuesPanel job list', () => {
  it('renders failed jobs with the op and a permanent marker', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'failed');

    await screen.findByText(/\[watchdog\]/i, {}, { timeout: LOAD_TIMEOUT });
    // `params.op` — the field the F28 serializer does not expose, and the fastest triage signal.
    expect(screen.getAllByText('portfolio').length).toBeGreaterThan(0);
    expect(screen.getByText(/^permanent$/i)).toBeInTheDocument();
  });

  it('shows the firm name, keeping the id as a tooltip', async () => {
    // F64 unit 4: triage previously started by copying an ObjectId into another view to find out
    // whose job had failed.
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'failed');
    await screen.findByText(/\[watchdog\]/i, {}, { timeout: LOAD_TIMEOUT });

    const named = screen.getByText('Vista Equity Partners');
    expect(named).toBeInTheDocument();
    expect(named).toHaveAttribute('title', 'pef1');
  });

  it('falls back to the firm id when the name could not be resolved', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'failed');
    await screen.findByText(/\[watchdog\]/i, {}, { timeout: LOAD_TIMEOUT });

    // A deleted firm (or a global job) must not render a blank cell.
    expect(screen.getByText('pef2')).toBeInTheDocument();
  });

  it('flags non-fatal warnings with a count badge and the codes on hover', async () => {
    // F64 unit 5: errorMessage only ever describes a FAILURE, so a job that completed while
    // quietly dropping half a firm's holdings used to look identical to a clean one.
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'failed');
    await screen.findByText(/\[watchdog\]/i, {}, { timeout: LOAD_TIMEOUT });

    // Query by the tooltip, not by the text: a tab's count badge also renders "2". A regex
    // matcher, because the title joins the codes with a newline and an exact-string match on a
    // multi-line attribute is brittle across jsdom versions.
    const badge = screen.getByTitle(/pass_truncated:location_standardize/);
    expect(badge).toHaveTextContent('2');
    expect(badge).toHaveAttribute('title', expect.stringContaining('low_coverage:website'));
  });

  it('offers Requeue only for failed jobs', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'failed');
    await screen.findByText(/\[watchdog\]/i, {}, { timeout: LOAD_TIMEOUT });

    // Two failed fixture rows -> two Requeue buttons.
    expect(screen.getAllByRole('button', { name: /^requeue$/i })).toHaveLength(2);
  });

  it('requeues a job and reports the retry-count reset', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'failed');
    await screen.findByText(/\[watchdog\]/i, {}, { timeout: LOAD_TIMEOUT });

    await user.click(screen.getAllByRole('button', { name: /^requeue$/i })[0]);
    // The reset is the point — a job that spent its single auto-retry would otherwise fail once
    // more and stop again, making the operator action look ineffective.
    await screen.findByText(/retry count reset/i, {}, { timeout: LOAD_TIMEOUT });
  });

  it('shows an empty state per status rather than an error', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'failed');
    await screen.findByText(/\[watchdog\]/i, {}, { timeout: LOAD_TIMEOUT });

    await user.click(screen.getByRole('button', { name: statusButton('running') }));
    await screen.findByText(/no running jobs in this queue/i, {}, { timeout: LOAD_TIMEOUT });
  });
});

// ── Purge guard rail ────────────────────────────────────────────────────────

describe('QueuesPanel purge', () => {
  it('disables purge for live statuses and explains why', async () => {
    const user = userEvent.setup();
    renderPanel();
    // The tab lands on `pending`, which is NOT purgeable. The backend also 400s it; the UI must not
    // even offer it.
    await openQueueTab(user, /companies \(portfolio\)/i);
    const live = await screen.findByRole(
      'button',
      { name: /purge pending/i },
      { timeout: LOAD_TIMEOUT },
    );
    expect(live).toBeDisabled();
    expect(live).toHaveAttribute('title', expect.stringMatching(/only terminal statuses/i));

    // ...and failed is purgeable.
    await user.click(screen.getByRole('button', { name: statusButton('failed') }));
    expect(
      await screen.findByRole('button', { name: /purge failed/i }, { timeout: LOAD_TIMEOUT }),
    ).toBeEnabled();
  });

  it('purges only after the confirm dialog and reports the count', async () => {
    const posts: string[] = [];
    server.use(
      http.post(`/api/pe/admin/queues/:queue/purge`, async ({ params }) => {
        posts.push(String(params.queue));
        return ok({ queue: String(params.queue), status: 'failed', deleted: 2 });
      }),
    );
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'failed');
    await screen.findByText(/\[watchdog\]/i, {}, { timeout: LOAD_TIMEOUT });

    await user.click(screen.getByRole('button', { name: /purge failed/i }));
    // Nothing may be deleted before confirming.
    expect(posts).toEqual([]);

    // Scope to the dialog: the trigger and the confirm share an accessible name by design (the
    // confirm label echoes the action), so an unscoped query is ambiguous.
    const dialog = await screen.findByRole('dialog', {}, { timeout: LOAD_TIMEOUT });
    expect(dialog).toHaveTextContent(/permanently deletes/i);
    expect(dialog).toHaveTextContent(/cannot be purged/i);

    await user.click(within(dialog).getByRole('button', { name: /^purge failed$/i }));
    await screen.findByText(/purged 2 failed job/i, {}, { timeout: LOAD_TIMEOUT });
    expect(posts).toEqual(['portfolio']);
  });
});

// ── Pause ───────────────────────────────────────────────────────────────────

describe('QueuesPanel pause', () => {
  it('pauses one queue and states both operator caveats', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i);

    await user.click(
      await screen.findByTestId('pe-queue-pause-toggle', {}, { timeout: LOAD_TIMEOUT }),
    );
    // Both caveats otherwise look like the toggle failing.
    const toast = await screen.findByText(/worker tick/i, {}, { timeout: LOAD_TIMEOUT });
    expect(toast).toHaveTextContent(/not cancelled/i);
  });

  it('warns that the global pause overrides per-queue state', async () => {
    server.use(
      http.get(endpoints.peAdmin.queues, () =>
        ok({
          ...mockPeQueuesHealth,
          globalPause: { paused: true, dbPaused: true, envOverride: false },
        }),
      ),
    );
    renderPanel();
    // Without this an operator sees an unpaused queue that is not draining and hunts the wrong bug.
    await screen.findByText(/whole scraper is paused/i, {}, { timeout: LOAD_TIMEOUT });
  });

  it('explains the env override cannot be cleared from the UI', async () => {
    server.use(
      http.get(endpoints.peAdmin.queues, () =>
        ok({
          ...mockPeQueuesHealth,
          globalPause: { paused: true, dbPaused: false, envOverride: true },
        }),
      ),
    );
    renderPanel();
    await screen.findByText(/needs a worker restart/i, {}, { timeout: LOAD_TIMEOUT });
  });
});

// ── a11y ────────────────────────────────────────────────────────────────────

describe('QueuesPanel a11y', () => {
  it('has no axe violations with a queue tab open', async () => {
    // Canvas is not implemented in jsdom; axe's colour-contrast rule needs it.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { container } = renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i, 'failed');
    await screen.findByText(/\[watchdog\]/i, {}, { timeout: LOAD_TIMEOUT });

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('associates the tabs with the panel they control', async () => {
    const user = userEvent.setup();
    renderPanel();
    await openQueueTab(user, /companies \(portfolio\)/i);
    const panel = await screen.findByRole('tabpanel', {}, { timeout: LOAD_TIMEOUT });
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-portfolio');
  });
});

// ── F52: worker liveness ────────────────────────────────────────────────────
//
// The tester's first complaint: "the backend itself doesn't know if scraper is running or not."
// Every other number on this panel is derived from JOB ROWS, so an idle worker and a dead one render
// identically — a quiet estate looks healthy whether or not anything is draining. These pin the one
// field that separates them, and pin that it does not cry wolf when liveness is merely unknown.

function serveLiveness(liveness: unknown) {
  server.use(
    http.get(endpoints.peAdmin.queues, () =>
      ok({ ...mockPeQueuesHealth, workerLiveness: liveness }),
    ),
  );
}

describe('QueuesPanel worker liveness', () => {
  it('shouts when no worker has checked in', async () => {
    serveLiveness({
      ...mockPeQueuesHealth.workerLiveness,
      anyAlive: false,
      aliveCount: 0,
      newestTickAgeSeconds: 420,
      workers: [],
    });
    renderPanel();
    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT });
    expect(alert).toHaveTextContent(/nothing is draining/i);
    expect(alert).toHaveTextContent(/7m ago/i);
  });

  it('says so when no worker has EVER reported, rather than showing a bogus age', async () => {
    serveLiveness({
      ...mockPeQueuesHealth.workerLiveness,
      anyAlive: false,
      aliveCount: 0,
      newestTickAgeSeconds: null,
      workers: [],
    });
    renderPanel();
    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT });
    expect(alert).toHaveTextContent(/no worker has ever reported in/i);
    expect(alert).toHaveTextContent(/deployed/i);
    // And specifically NOT a fabricated age.
    expect(alert).not.toHaveTextContent(/last heartbeat/i);
  });

  it('pairs a dead worker with stuck running jobs, because reclaim lives inside the worker', async () => {
    server.use(
      http.get(endpoints.peAdmin.queues, () =>
        ok({
          ...mockPeQueuesHealth,
          totals: { ...mockPeQueuesHealth.totals, running: 3 },
          workerLiveness: {
            ...mockPeQueuesHealth.workerLiveness,
            anyAlive: false,
            aliveCount: 0,
            workers: [],
          },
        }),
      ),
    );
    renderPanel();
    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT });
    expect(alert).toHaveTextContent(/3 job\(s\) are stuck in "running"/i);
  });

  it('distinguishes a deliberate shutdown from a crash', async () => {
    serveLiveness({
      ...mockPeQueuesHealth.workerLiveness,
      anyAlive: false,
      aliveCount: 0,
      workers: [{ ...mockPeQueuesHealth.workerLiveness!.workers[0], alive: false, stopping: true }],
    });
    renderPanel();
    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT });
    expect(alert).toHaveTextContent(/intentional scale-to-zero/i);
  });

  it('stays quiet when a worker is alive', async () => {
    renderPanel();
    await waitForTabs();
    expect(screen.queryByText(/nothing is draining/i)).not.toBeInTheDocument();
  });

  it('does NOT claim the worker is dead when liveness is unknown', async () => {
    // status:'unknown' + anyAlive:null means the liveness READ failed. Rendering that as "dead" would
    // send an operator to restart a perfectly healthy scraper.
    serveLiveness({
      status: 'unknown',
      workers: [],
      aliveCount: 0,
      anyAlive: null,
      newestTickAgeSeconds: null,
      abandonedThreads: 0,
      uncoveredQueues: [],
    });
    renderPanel();
    await waitForTabs();
    expect(screen.queryByText(/nothing is draining/i)).not.toBeInTheDocument();
  });

  it('survives a backend with no workerLiveness field at all', async () => {
    const withoutLiveness = { ...mockPeQueuesHealth };
    delete withoutLiveness.workerLiveness;
    server.use(http.get(endpoints.peAdmin.queues, () => ok(withoutLiveness)));
    renderPanel();
    await waitForTabs();
    expect(screen.queryByText(/nothing is draining/i)).not.toBeInTheDocument();
  });

  it('warns about abandoned handlers holding slots', async () => {
    serveLiveness({ ...mockPeQueuesHealth.workerLiveness, abandonedThreads: 2 });
    renderPanel();
    const note = await screen.findByText(
      /2 abandoned handler\(s\)/i,
      {},
      { timeout: LOAD_TIMEOUT },
    );
    expect(note).toBeInTheDocument();
  });

  it('does not warn about abandoned handlers when there are none', async () => {
    renderPanel();
    await waitForTabs();
    expect(screen.queryByText(/abandoned handler/i)).not.toBeInTheDocument();
  });
});

// ── F55: a failed fleet read must not read as a healthy idle estate ────────────

describe('QueuesPanel failed-read banner', () => {
  it('warns that the numbers are unreliable when the fleet read failed', async () => {
    // On a dead DB the per-queue reads degrade to all-zero, which without status: "error" is
    // indistinguishable from an empty, healthy estate — the console equivalent of the F55 bug.
    server.use(http.get(endpoints.peAdmin.queues, () => ok(mockPeQueuesHealthReadError)));
    renderPanel();
    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT });
    expect(alert).toHaveTextContent(/could not be read — these numbers are not reliable/i);
    expect(alert).toHaveTextContent(/failed-read fallback, not an empty estate/i);
    expect(alert).toHaveTextContent(/criteria, portfolio/i);
  });

  it('shows no failed-read banner on a healthy fleet', async () => {
    renderPanel();
    await waitForTabs();
    expect(screen.queryByText(/could not be read/i)).not.toBeInTheDocument();
  });
});
