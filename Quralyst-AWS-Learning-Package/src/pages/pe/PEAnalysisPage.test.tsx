// PE Analysis Dashboard page (F32.2): renders every card + stat tile from MSW fixtures; a window/segment
// control change re-fetches with the new params (MSW spy) and updates the cards' descriptions; the
// geographic scope toggle swaps US states ↔ countries; empty rows render without crashing; hold-period
// thin-data stats are surfaced; and axe finds no violations. Charts via ApexCharts (Q20 parity).
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ok } from '@/test/mocks/envelope';
import { endpoints } from '@/services/endpoints';
import PEAnalysisPage from './PEAnalysisPage';

// ApexCharts is heavy/SVG-dependent in jsdom — stub the chart mount; wrappers still
// expose data-categories for assertions.
vi.mock('react-apexcharts', () => ({
  default: () => <div data-testid="apex-chart-stub" />,
}));

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Capture analytics GETs so tests can assert the forwarded window/segment/scope query params.
function trackRequests() {
  const seen: { url: string }[] = [];
  const onStart = ({ request }: { request: Request }) => {
    if (request.url.includes('/api/pe/analytics/')) seen.push({ url: request.url });
  };
  server.events.on('request:start', onStart);
  return seen;
}

function lastMatching(seen: { url: string }[], predicate: (u: string) => boolean) {
  return [...seen].reverse().find((r) => predicate(r.url));
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/pe/analysis']}>
        <PEAnalysisPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PEAnalysisPage — cards', () => {
  it('renders the summary tiles + every card from the MSW fixtures', async () => {
    renderPage();

    // Summary tiles. The tile always renders (showing "—" while loading), so wait for the value.
    const newInvestmentsTile = screen.getByTestId('stat-New investments');
    expect(
      await within(newInvestmentsTile).findByText('42', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('stat-Exits')).toHaveTextContent('11');
    expect(screen.getByTestId('stat-Active firms')).toHaveTextContent('8');
    expect(screen.getByTestId('stat-Unique companies')).toHaveTextContent('39');
    // Q20 shows 4 KPI tiles; eligible-firms count lives in the footnote.
    expect(await screen.findByText(/120 eligible firms/i)).toBeInTheDocument();

    // Most-active firms: ranked, firm links, size-focus blurb. Each card resolves its own query, so
    // await the content rather than the (immediately-present) card wrapper.
    const activeCard = screen.getByTestId('card-most-active');
    expect(
      await within(activeCard).findByRole('link', { name: 'Vista Equity Partners' }),
    ).toHaveAttribute('href', '/pe/firms/pef1');
    expect(within(activeCard).getByText(/EBITDA \$10–75M/)).toBeInTheDocument();

    // Most exits.
    expect(
      await within(screen.getByTestId('card-most-exits')).findByText('Thoma Bravo'),
    ).toBeInTheDocument();

    // Top sectors + activity trend are charts (Q20 parity) — categories ride on data-* hooks.
    expect(await screen.findByTestId('chart-top-sectors')).toHaveAttribute(
      'data-categories',
      expect.stringContaining('Healthcare IT'),
    );
    expect(await screen.findByTestId('chart-activity-trend')).toHaveAttribute(
      'data-categories',
      expect.stringContaining('2026-06'),
    );

    // Recent-by-sector groups with invested/exited kind chips.
    const recentCard = screen.getByTestId('card-recent-by-sector');
    await within(recentCard).findAllByTestId('kind-chip');
    const kinds = within(recentCard)
      .getAllByTestId('kind-chip')
      .map((c) => c.getAttribute('data-kind'));
    expect(kinds).toContain('invested');
    expect(kinds).toContain('exited');
  });

  it('surfaces the hold-period thin-data stats', async () => {
    renderPage();
    const card = await screen.findByTestId('card-hold-periods');
    const stats = await within(card).findByTestId('hold-stats');
    expect(stats).toHaveTextContent('Median exited hold: 3.5y');
    expect(stats).toHaveTextContent('avg current age: 2.1y');
    expect(within(card).getByTestId('chart-hold-periods')).toHaveAttribute(
      'data-categories',
      expect.stringContaining('2-4y'),
    );
  });
});

describe('PEAnalysisPage — controls', () => {
  it('a window change re-fetches every card with window=24m', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await screen.findByTestId('stat-New investments');

    await user.click(screen.getByRole('combobox', { name: /time window/i }));
    await user.click(await screen.findByRole('option', { name: 'Last 24 months' }));

    await vi.waitFor(() => {
      expect(
        lastMatching(seen, (u) => u.includes('summary') && u.includes('window=24m')),
      ).toBeTruthy();
      expect(
        lastMatching(seen, (u) => u.includes('most-active-firms') && u.includes('window=24m')),
      ).toBeTruthy();
    });
    // Activity-trend description echoes the new window (Q20 pattern).
    expect(
      within(screen.getByTestId('card-trend')).getByText(/last 24 months/i),
    ).toBeInTheDocument();
  });

  it('a segment change re-fetches with segment=middle-market', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await screen.findByTestId('stat-New investments');

    await user.click(screen.getByRole('combobox', { name: /size segment/i }));
    await user.click(await screen.findByRole('option', { name: 'Middle market' }));

    await vi.waitFor(() => {
      expect(
        lastMatching(seen, (u) => u.includes('top-sectors') && u.includes('segment=middle-market')),
      ).toBeTruthy();
    });
  });

  it('the geographic scope toggle swaps US states for countries', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();

    // Default scope = us: chart categories include US states.
    const geoCard = await screen.findByTestId('card-geo');
    expect(await within(geoCard).findByTestId('chart-geo')).toHaveAttribute(
      'data-categories',
      expect.stringContaining('CA'),
    );

    await user.click(within(geoCard).getByRole('combobox', { name: /geographic scope/i }));
    await user.click(await screen.findByRole('option', { name: 'Countries' }));

    await vi.waitFor(() => {
      expect(
        lastMatching(seen, (u) => u.includes('geographic-clusters') && u.includes('scope=global')),
      ).toBeTruthy();
    });
    expect(await within(geoCard).findByTestId('chart-geo')).toHaveAttribute(
      'data-categories',
      expect.stringContaining('United Kingdom'),
    );
    expect(within(geoCard).getByTestId('chart-geo').getAttribute('data-categories')).not.toContain(
      'CA',
    );
  });
});

describe('PEAnalysisPage — empty states', () => {
  it('renders every card without crashing when rows are empty', async () => {
    // Force all list endpoints to empty; summary/hold-periods still return a shape.
    server.use(
      http.get(endpoints.pe.analyticsMostActiveFirms, ({ request }) => {
        const url = new URL(request.url);
        return ok({
          window: url.searchParams.get('window') ?? '12m',
          segment: url.searchParams.get('segment') ?? 'all',
          rows: [],
        });
      }),
      http.get(endpoints.pe.analyticsMostExits, () =>
        ok({ window: '12m', segment: 'all', rows: [] }),
      ),
      http.get(endpoints.pe.analyticsTopSectors, () =>
        ok({ window: '12m', segment: 'all', rows: [] }),
      ),
      http.get(endpoints.pe.analyticsActivityTrend, () =>
        ok({ window: '12m', segment: 'all', rows: [] }),
      ),
      http.get(endpoints.pe.analyticsRecentBySector, () =>
        ok({ window: '12m', segment: 'all', rows: [] }),
      ),
      http.get(endpoints.pe.analyticsGeographicClusters, () =>
        ok({ window: '12m', segment: 'all', scope: 'us', rows: [] }),
      ),
      http.get(endpoints.pe.analyticsHoldPeriods, () =>
        ok({
          window: '12m',
          segment: 'all',
          rows: [],
          stats: {
            currentCount: 0,
            exitedCount: 0,
            avgExitedYears: null,
            avgCurrentYears: null,
            medianExitedYears: null,
          },
        }),
      ),
    );

    renderPage();
    // Cards render their empty state text rather than crashing.
    const emptyCells = await screen.findAllByText(/no data for this window/i);
    expect(emptyCells.length).toBeGreaterThan(0);
  });
});

describe('PEAnalysisPage — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByTestId('stat-New investments');
    expect(await axe(container)).toHaveNoViolations();
  });
});
