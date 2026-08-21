// Firm-detail Signals tab (F30.2): renders stat tiles, sector/geo mix tables, the appetite badge, and
// roll-up cards from the bundle fixture; the recentYears selector forwards the query param; an
// empty/undated book shows the coverage state (0 dated of N) not a crash/blank; and axe is clean. Also
// checks the ReadinessChip renders NOTHING for tier "n/a".
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import FirmSignalsTab from './FirmSignalsTab';
import { ReadinessChip } from '@/components/pe/SignalBadges';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function trackRequests() {
  const seen: { url: string }[] = [];
  const onStart = ({ request }: { request: Request }) => {
    if (request.url.includes('/api/pe/signals/firms/')) seen.push({ url: request.url });
  };
  server.events.on('request:start', onStart);
  return seen;
}

function lastMatching(seen: { url: string }[], predicate: (u: string) => boolean) {
  return [...seen].reverse().find((r) => predicate(r.url));
}

function renderTab(firmId = 'pef1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FirmSignalsTab firmId={firmId} />
    </QueryClientProvider>,
  );
}

describe('FirmSignalsTab — bundle', () => {
  it('renders stat tiles, appetite, mix tables and roll-up cards', async () => {
    renderTab();
    // Stat tiles — findBy (not getBy) so a slow MSW round-trip under CI load does not flake.
    expect(await screen.findByText('Median realized hold')).toBeInTheDocument();
    expect(await screen.findByText('6y')).toBeInTheDocument();
    expect(screen.getByText(/from 11 exited/i)).toBeInTheDocument();
    expect(screen.getByText('Dated coverage')).toBeInTheDocument();
    expect(screen.getByText('12 / 15')).toBeInTheDocument();

    // Appetite badge (high).
    const appetite = screen.getByTestId('appetite-badge');
    expect(appetite).toHaveAttribute('data-tier', 'high');

    // Mix tables (tables, not charts) — sector label + pct columns.
    expect(screen.getByText('Sector mix')).toBeInTheDocument();
    expect(screen.getByText('Geography mix')).toBeInTheDocument();
    const softwareCells = screen.getAllByText('Software');
    expect(softwareCells.length).toBeGreaterThan(0);
    expect(screen.getByText('58%')).toBeInTheDocument();

    // Roll-up card.
    const cards = screen.getAllByTestId('rollup-card');
    expect(cards.length).toBe(1);
    expect(within(cards[0]).getByText(/beacon analytics/i)).toBeInTheDocument();
    expect(within(cards[0]).getByText(/active/i)).toBeInTheDocument();
    expect(within(cards[0]).getByText(/likely next add-on/i)).toBeInTheDocument();
  });

  it('forwards the recentYears query param when the selector changes', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderTab();
    await screen.findByText('Median realized hold');
    // Initial fetch uses the default (5).
    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('recentYears=5'))).toBeTruthy();
    });

    await user.click(screen.getByRole('combobox', { name: /recent window in years/i }));
    await user.click(await screen.findByRole('option', { name: 'Last 3 years' }));
    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('recentYears=3'))).toBeTruthy();
    });
  });
});

describe('FirmSignalsTab — empty / undated book', () => {
  it('shows the coverage state (0 dated of N), not zeros or a crash', async () => {
    renderTab('pef-empty');
    expect(await screen.findByText('Dated coverage')).toBeInTheDocument();
    // 0 of 3 current holdings are dated — the coverage is surfaced, not hidden.
    expect(screen.getByText('0 / 3')).toBeInTheDocument();
    // Median hold is unknown (dash), not "0".
    expect(screen.getByText('Median realized hold').closest('.card')).toHaveTextContent('—');
    // No roll-ups → the empty-state message.
    expect(screen.getByText(/no roll-up clusters detected/i)).toBeInTheDocument();
  });

  it('has no axe violations on the bundle view', async () => {
    const { container } = renderTab();
    await screen.findByText('Median realized hold');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ReadinessChip — n/a', () => {
  it('renders nothing for tier "n/a"', () => {
    const { container } = render(<ReadinessChip tier="n/a" score={0} reasons={['x']} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a tier-colored chip with score for an applicable tier', () => {
    render(<ReadinessChip tier="elevated" score={90} reasons={['held long']} />);
    const chip = screen.getByTestId('readiness-chip');
    expect(chip).toHaveAttribute('data-tier', 'elevated');
    expect(within(chip).getByText('90')).toBeInTheDocument();
  });
});
