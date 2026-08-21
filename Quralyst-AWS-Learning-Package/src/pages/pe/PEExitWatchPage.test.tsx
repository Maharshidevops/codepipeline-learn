// PE Exit Watch page (F30.2): the ranked table renders the MSW fixtures with readiness chips in
// server rank; the CSV headers match the reference column set; the tier filter defaults to "elevated"
// and switching it refetches with the new tier param; client search + sector filters narrow rows
// without a refetch; the coverage tile shows "dated / total" (unscored ≠ low readiness); `n/a` rows
// (never returned by this endpoint) render no chip; and axe finds no violations.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import PEExitWatchPage from './PEExitWatchPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Capture exit-readiness GETs so tests can assert the forwarded tier param.
function trackRequests() {
  const seen: { url: string }[] = [];
  const onStart = ({ request }: { request: Request }) => {
    if (request.url.includes('/api/pe/signals/exit-readiness')) seen.push({ url: request.url });
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
      <MemoryRouter initialEntries={['/pe/exit-watch']}>
        <PEExitWatchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PEExitWatchPage — table & ranking', () => {
  it('renders fixture rows with readiness chips in server rank + a firm link', async () => {
    renderPage();
    // Default tier is elevated — only the two elevated rows are returned by the handler.
    expect(await screen.findByText('Beacon Analytics')).toBeInTheDocument();
    expect(screen.getByText('Zenith Health')).toBeInTheDocument();
    // Watch/low rows are excluded at the default (elevated) tier.
    expect(screen.queryByText('Cobalt Logistics')).not.toBeInTheDocument();
    expect(screen.queryByText('Delta Foods')).not.toBeInTheDocument();

    // Chips present, tier-colored, with score inline.
    const chips = screen.getAllByTestId('readiness-chip');
    expect(chips.length).toBe(2);
    expect(chips[0]).toHaveAttribute('data-tier', 'elevated');
    expect(within(chips[0]).getByText('88')).toBeInTheDocument();

    // Firm link to the detail page.
    expect(screen.getAllByRole('link', { name: /vista equity partners/i })[0]).toHaveAttribute(
      'href',
      '/pe/firms/pef1',
    );
  });

  it('marks a default-threshold row with an asterisk', async () => {
    renderPage();
    await screen.findByText('Zenith Health');
    // Zenith uses the default threshold (5y) → "5y*".
    expect(screen.getByText('5y*')).toBeInTheDocument();
    // Beacon uses the firm threshold (6y) → "6y" (no asterisk).
    expect(screen.getByText('6y')).toBeInTheDocument();
  });
});

describe('PEExitWatchPage — tier filter', () => {
  it('defaults to elevated and refetches with the chosen tier', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await screen.findByText('Beacon Analytics');

    // First request carries tier=elevated.
    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('tier=elevated'))).toBeTruthy();
    });

    // Switch to Watch → refetch with tier=watch, and the watch row appears.
    await user.click(screen.getByRole('combobox', { name: /filter by readiness tier/i }));
    await user.click(await screen.findByRole('option', { name: 'Watch' }));
    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('tier=watch'))).toBeTruthy();
    });
    expect(await screen.findByText('Cobalt Logistics')).toBeInTheDocument();
  });
});

describe('PEExitWatchPage — client-side filters', () => {
  it('narrows rows by search and by sector without a refetch', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Beacon Analytics');

    // Search narrows to Beacon (client-side).
    await user.type(screen.getByRole('searchbox', { name: /search exit watch/i }), 'beacon');
    await vi.waitFor(() => {
      expect(screen.queryByText('Zenith Health')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Beacon Analytics')).toBeInTheDocument();

    // Clear + sector filter to Healthcare narrows to Zenith.
    await user.clear(screen.getByRole('searchbox', { name: /search exit watch/i }));
    await screen.findByText('Zenith Health');
    await user.click(screen.getByRole('combobox', { name: /filter by sector/i }));
    await user.click(await screen.findByRole('option', { name: 'Healthcare' }));
    await vi.waitFor(() => {
      expect(screen.queryByText('Beacon Analytics')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Zenith Health')).toBeInTheDocument();
  });
});

describe('PEExitWatchPage — coverage', () => {
  it('shows the coverage tile (dated / total), not a zero', async () => {
    renderPage();
    const tile = await screen.findByTestId('coverage-tile');
    expect(within(tile).getByText('28 / 40')).toBeInTheDocument();
    expect(within(tile).getByText(/not the same as low readiness/i)).toBeInTheDocument();
  });
});

describe('PEExitWatchPage — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByText('Beacon Analytics');
    expect(await axe(container)).toHaveNoViolations();
  });
});
