// PipelineHealthPanel (F50) — Tier-5 data health.
//
// The alert is the reason this panel exists, so it is tested from BOTH directions: F47 decides
// "this firm changed" from read-only timestamps, so a missed signal is otherwise invisible — a firm
// that should have been re-projected looks exactly like one that genuinely did not change. The panel
// must shout when the backend flags it, and must NOT cry wolf when the queue is simply busy.
//
// Every sub-object carries its own `status`; a failing read is `{status:'error'}` with no other
// keys, so the degradation path is tested too.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ok } from '@/test/mocks/envelope';
import { endpoints } from '@/services/endpoints';
import {
  mockPePipelineHealth,
  mockPePipelineHealthMissedSignal,
  mockPePipelineHealthScanStalled,
  mockPePipelineHealthPaused,
} from '@/test/mocks/fixtures/peAdmin';
import PipelineHealthPanel from './PipelineHealthPanel';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const LOAD_TIMEOUT = 5000;

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PipelineHealthPanel />
    </QueryClientProvider>,
  );
}

function servePipelineHealth(payload: unknown) {
  server.use(http.get(endpoints.peAdmin.pipelineHealth, () => ok(payload)));
}

describe('PipelineHealthPanel', () => {
  it('renders the three metric groups', async () => {
    renderPanel();
    await screen.findByText(/projection staleness/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.getByText(/semantic coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/change gating/i)).toBeInTheDocument();
  });

  it('shows staleness numbers and the dirty-reason breakdown', async () => {
    renderPanel();
    await screen.findByText(/projection staleness/i, {}, { timeout: LOAD_TIMEOUT });
    // maxStalenessSeconds 5400 -> 1.5h
    expect(screen.getByText('1.5h')).toBeInTheDocument();
    // Reasons are shown with underscores humanised.
    expect(screen.getByText(/holding change 2/i)).toBeInTheDocument();
    expect(screen.getByText(/firm updated 1/i)).toBeInTheDocument();
  });

  it('shows coverage percentages against the distinct-company denominator', async () => {
    renderPanel();
    await screen.findByText(/semantic coverage/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.getByText(/100 \/ 118 \(84\.7%\)/)).toBeInTheDocument();
    expect(screen.getByText(/2100 \/ 2400 \(87\.5%\)/)).toBeInTheDocument();
  });

  it('shows the change-gating ratio', async () => {
    renderPanel();
    await screen.findByText(/change gating/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.getByText('0.150')).toBeInTheDocument();
  });
});

// ── The alert: both directions ──────────────────────────────────────────────

describe('PipelineHealthPanel missed-signal alert', () => {
  it('raises an alert when the backend flags a suspected missed signal', async () => {
    servePipelineHealth(mockPePipelineHealthMissedSignal);
    renderPanel();
    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT });
    expect(alert).toHaveTextContent(/suspected missed change signal/i);
    // It must say what to DO, and that this is a code problem rather than a backlog.
    expect(alert).toHaveTextContent(/enqueue_all_projections/i);
    expect(alert).toHaveTextContent(/not a backlog/i);
  });

  it('does NOT raise it when the projection queue is simply busy', async () => {
    // Same staleness, work queued — a throughput problem, not a missed signal. Crying wolf here
    // would send an operator hunting a detector bug that does not exist.
    renderPanel();
    await screen.findByText(/projection staleness/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ── F53: the detector not RUNNING, vs running and not marking ───────────────

describe('PipelineHealthPanel scan-coverage alert', () => {
  it('reports a stalled sweep rather than the missed-signal copy', async () => {
    // Both booleans are true (the backend ORs coverage into suspectedMissedSignal), but the
    // missed-signal copy claims "the queue is empty and nothing is marked dirty" — which is not
    // what is wrong here, and would send an operator to force a rebuild that cannot help while
    // the sweep is down.
    servePipelineHealth(mockPePipelineHealthScanStalled);
    renderPanel();
    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT });
    expect(alert).toHaveTextContent(/detector is not running/i);
    expect(alert).not.toHaveTextContent(/suspected missed change signal/i);
    // The actionable part: where to look.
    expect(alert).toHaveTextContent(/fv change detection sweep failed/i);
  });

  it('explains that the counts keep reading clean', async () => {
    // The trap this phase exists to close, stated accurately: it is not that no count can see an
    // unscanned firm (one with no state row IS in neverProjected) — it is that after a backfill
    // every firm has a state row, so the affected ones just age invisibly.
    servePipelineHealth(mockPePipelineHealthScanStalled);
    renderPanel();
    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT });
    expect(alert).toHaveTextContent(/state row from an earlier backfill/i);
    expect(alert).toHaveTextContent(/reading clean/i);
  });

  it('stays silent while the estate is paused, and says so', async () => {
    // The detector sits below the worker's pause gate, so a pause stops it by design. Alarming
    // would fire on every maintenance window and tell the on-call to check a worker they paused.
    servePipelineHealth(mockPePipelineHealthPaused);
    renderPanel();
    await screen.findByText(/projection staleness/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('paused')).toBeInTheDocument();
  });

  it('stays quiet while the sweep is keeping up', async () => {
    renderPanel();
    await screen.findByText(/projection staleness/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // 240 s since the last full pass, rendered as a duration.
    expect(screen.getByText('4m')).toBeInTheDocument();
    // 45 s since the last sweep — the number the alert is derived from.
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('shows "not yet" before the first sweep completes instead of a bare dash', async () => {
    servePipelineHealth({
      ...mockPePipelineHealth,
      projectionStaleness: {
        ...mockPePipelineHealth.projectionStaleness,
        secondsSinceFullScan: null,
        expectedFullScanSeconds: null,
        everCompletedFullScan: false,
        scanCoverageStalled: false,
      },
    });
    renderPanel();
    await screen.findByText(/projection staleness/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.getByText('not yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ── Stale vector space + the not-gating hint ────────────────────────────────

describe('PipelineHealthPanel warnings', () => {
  it('flags stale-model vectors as a different vector space, not merely old', async () => {
    servePipelineHealth({
      ...mockPePipelineHealth,
      semanticCoverage: {
        ...mockPePipelineHealth.semanticCoverage,
        staleModelFirms: 4,
        staleModelCompanies: 30,
      },
    });
    renderPanel();
    await screen.findByText(
      /stale model: 4 firm\(s\), 30 company vector\(s\)/i,
      {},
      { timeout: LOAD_TIMEOUT },
    );
    expect(screen.getByText(/different vector space/i)).toBeInTheDocument();
  });

  it('hides the stale-model warning when everything is on the current model', async () => {
    renderPanel();
    await screen.findByText(/semantic coverage/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.queryByText(/stale model/i)).not.toBeInTheDocument();
  });

  it('warns when the change gate is not actually gating', async () => {
    // ~1.0 means every scrape still projects, i.e. F47 is buying nothing.
    servePipelineHealth({
      ...mockPePipelineHealth,
      changeGating: { ...mockPePipelineHealth.changeGating, projectionsPerScrape: 0.98 },
    });
    renderPanel();
    await screen.findByText(/gate not gating/i, {}, { timeout: LOAD_TIMEOUT });
  });

  it('renders a dash for a null ratio rather than implying perfect gating', async () => {
    // No scrapes in the window: "no data" is not "perfectly gated".
    servePipelineHealth({
      ...mockPePipelineHealth,
      changeGating: {
        status: 'ok',
        windowHours: 24,
        portfolioScrapesCompleted: 0,
        projectionsCompleted: 0,
        projectionsPerScrape: null,
      },
    });
    renderPanel();
    await screen.findByText(/change gating/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.queryByText(/gate not gating/i)).not.toBeInTheDocument();
  });
});

// ── Degradation ────────────────────────────────────────────────────────────

describe('PipelineHealthPanel degradation', () => {
  it('renders a note per failed read instead of blanking the panel', async () => {
    // A failing read is {status:'error'} with NO other keys — every field must be optional.
    servePipelineHealth({
      projectionStaleness: { status: 'error' },
      semanticCoverage: { status: 'error' },
      changeGating: { status: 'error' },
    });
    renderPanel();
    await screen.findByText(/could not read projection staleness/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.getByText(/could not read semantic coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/could not read change-gating/i)).toBeInTheDocument();
    // The headings still render, so the operator can see WHICH metric is unavailable. Queried by
    // role — the phrase also appears inside the error note, so a text query is ambiguous.
    expect(screen.getByRole('heading', { name: /projection staleness/i })).toBeInTheDocument();
  });

  it('survives one failing read while the others render', async () => {
    servePipelineHealth({
      ...mockPePipelineHealth,
      semanticCoverage: { status: 'error' },
    });
    renderPanel();
    await screen.findByText(/could not read semantic coverage/i, {}, { timeout: LOAD_TIMEOUT });
    expect(screen.getByText('0.150')).toBeInTheDocument();
  });
});

describe('PipelineHealthPanel a11y', () => {
  it('has no axe violations', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderPanel();
    await screen.findByText(/projection staleness/i, {}, { timeout: LOAD_TIMEOUT });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
