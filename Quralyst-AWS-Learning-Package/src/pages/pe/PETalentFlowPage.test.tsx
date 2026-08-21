// PE Talent Flow page (F33.2): renders the moves table with correct confidence badges + from→to firm
// links from MSW fixtures; a confidence-floor change refetches with the new floor while the tier chips
// stay constant (counts are over all moves); the person-name search + firm filter wire the server query
// params; the gainers/losers panels render signed-net rows; clicking a person opens the history drawer
// (tenures + linkedinAnchored badge) and an unknown id shows the "person not found" empty state; and axe
// finds no violations. Tables-first v1 — no chart library. Mirrors PEAnalysisPage.test.tsx.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import PETalentFlowPage from './PETalentFlowPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Capture the moves GETs so tests can assert the forwarded confidence/search/firmId query params.
function trackRequests() {
  const seen: { url: string }[] = [];
  const onStart = ({ request }: { request: Request }) => {
    if (request.url.includes('/api/pe/talent-flow/moves')) seen.push({ url: request.url });
  };
  server.events.on('request:start', onStart);
  return seen;
}

function lastMatching(seen: { url: string }[], predicate: (u: string) => boolean) {
  return [...seen].reverse().find((r) => predicate(r.url));
}

function renderPage(initialEntry = '/pe/talent-flow') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <PETalentFlowPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PETalentFlowPage — moves table', () => {
  it('renders moves with confidence badges + from→to firm links (medium floor default)', async () => {
    renderPage();

    // Default floor is medium → high + medium moves show, low is hidden.
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Raj Patel')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    // Confidence badges present with the right tiers.
    const badges = screen
      .getAllByTestId('confidence-badge')
      .map((b) => b.getAttribute('data-confidence'));
    expect(badges).toContain('high');
    expect(badges).toContain('medium');
    expect(badges).not.toContain('low');

    // From→to firm links deep-link to the firm pages (scope to the moves table — firm names also
    // appear in the gainers/losers panels).
    const movesTable = screen.getByTestId('moves-table');
    expect(within(movesTable).getByRole('link', { name: 'Thoma Bravo' })).toHaveAttribute(
      'href',
      '/pe/firms/pef2',
    );
    expect(
      within(movesTable).getAllByRole('link', { name: 'Vista Equity Partners' })[0],
    ).toHaveAttribute('href', '/pe/firms/pef1');

    // LinkedIn-match indicator: Jane (high) matched, Raj (medium) not.
    const matches = screen
      .getAllByTestId('linkedin-match')
      .map((m) => m.getAttribute('data-match'));
    expect(matches).toContain('true');
    expect(matches).toContain('false');
  });

  it('shows tier-count chips that stay constant when the confidence floor changes', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await screen.findByText('Jane Smith');

    // Tier chips reflect counts over ALL moves (1/1/1).
    expect(within(screen.getByTestId('tier-chip-high')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('tier-chip-medium')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('tier-chip-low')).getByText('1')).toBeInTheDocument();

    // Drop the floor to Low → refetch with confidence=low and the low move appears.
    await user.click(screen.getByRole('combobox', { name: /minimum confidence/i }));
    await user.click(await screen.findByRole('option', { name: 'Low' }));

    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('confidence=low'))).toBeTruthy();
    });
    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    // Chips unchanged (still 1/1/1) despite the wider floor.
    expect(within(screen.getByTestId('tier-chip-low')).getByText('1')).toBeInTheDocument();
  });

  it('wires the person-name search into the server `search` param (debounced)', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await screen.findByText('Jane Smith');

    await user.type(screen.getByRole('textbox', { name: /search by person name/i }), 'Jane');

    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('search=Jane'))).toBeTruthy();
    });
    // Only Jane remains after the server-side filter.
    await vi.waitFor(() => expect(screen.queryByText('Raj Patel')).not.toBeInTheDocument());
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('wires the firm filter into the server `firmId` param', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await screen.findByText('Jane Smith');

    // Firm options come from /firms/options; SelectFilter renders role="option" + label text with no
    // data-value (screenerHelpers.tsx), so pick by label. Selecting Vista Equity Partners (firmId=pef1)
    // must forward firmId=pef1 to the moves query.
    // F59 D3: the F57.2 merge left a second, redundant `options[0]` selection after this one, whose
    // pef1 request the assertion below already saw from THIS click — so that block could not catch a
    // regression and was dead scaffolding. One deterministic label-based selection is the test with
    // teeth. (Earlier F57 §2.6 note: a prior version filtered options by a `data-value` attribute
    // SelectFilter never renders, so it clicked nothing — fixed by selecting via label.)
    await user.click(screen.getByRole('combobox', { name: /filter by firm/i }));
    await user.click(await screen.findByRole('option', { name: 'Vista Equity Partners' }));

    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('firmId=pef1'))).toBeTruthy();
    });
  });
});

describe('PETalentFlowPage — gainers/losers', () => {
  it('renders the top gainers and losers with signed net', async () => {
    renderPage();
    const gainers = await screen.findByTestId('panel-gainers');
    const losers = screen.getByTestId('panel-losers');

    // The panels render "Loading…" until the moves query resolves — await the loaded firm row.
    expect(
      await within(gainers).findByRole('link', { name: 'Vista Equity Partners' }),
    ).toHaveAttribute('href', '/pe/firms/pef1');
    expect(within(gainers).getByText('+3')).toBeInTheDocument();
    expect(within(losers).getByText('−3')).toBeInTheDocument();
    expect(within(losers).getByRole('link', { name: 'Silver Lake' })).toBeInTheDocument();
  });
});

describe('PETalentFlowPage — person history drawer', () => {
  it('opens the drawer with tenures + the linkedinAnchored badge on person click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText('Jane Smith'));

    const timeline = await screen.findByTestId('tenure-timeline');
    expect(within(timeline).getByText('Principal')).toBeInTheDocument();
    expect(within(timeline).getByText('Partner')).toBeInTheDocument();
    const anchored = screen.getByTestId('linkedin-anchored');
    expect(anchored).toHaveAttribute('data-anchored', 'true');
  });

  it('shows the "person not found" empty state on a 404 (deep-linked unknown id)', async () => {
    renderPage('/pe/talent-flow?person=unknown');
    expect(await screen.findByTestId('history-not-found')).toBeInTheDocument();
  });
});

describe('PETalentFlowPage — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByText('Jane Smith');
    expect(await axe(container)).toHaveNoViolations();
  });
});
