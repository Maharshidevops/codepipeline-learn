// IB Transactions (F34.4): Advisory League + global feed from MSW fixtures.
// League is a ranked bar list (data-testid="ib-league"), not a table. Feed filters are client-side
// (Replit load-all-once). Axe finds no violations.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import IBTransactionsPage from './IBTransactionsPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/ib/transactions']}>
        <IBTransactionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('IBTransactionsPage — league table', () => {
  it('ranks banks by dealCount descending', async () => {
    renderPage();
    const league = await screen.findByTestId('ib-league');
    // Evercore has 2 deals, Moelis 1 → Evercore ranks first.
    const rows = await within(league).findAllByTestId('league-row');
    expect(rows.length).toBe(2);
    expect(within(rows[0]).getByRole('link')).toHaveTextContent('Evercore');
    expect(within(rows[0]).getByTestId('league-deal-count')).toHaveTextContent('2');
    expect(within(rows[1]).getByRole('link')).toHaveTextContent('Moelis & Company');
    expect(within(rows[1]).getByTestId('league-deal-count')).toHaveTextContent('1');
  });

  it('respects the league sector filter', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('ib-league');
    const sectorSelect = screen.getByRole('combobox', { name: /league sector filter/i });
    await user.click(sectorSelect);
    const option = await within(sectorSelect).findByRole('option', { name: 'Healthcare' });
    await user.click(option);

    await vi.waitFor(() => {
      const rows = within(screen.getByTestId('ib-league')).getAllByTestId('league-row');
      expect(rows.length).toBe(1);
      expect(within(rows[0]).getByRole('link')).toHaveTextContent('Moelis & Company');
    });
  });
});

describe('IBTransactionsPage — feed', () => {
  it('renders the global feed and filters by deal type client-side', async () => {
    const user = userEvent.setup();
    renderPage();

    const feed = await screen.findByTestId('ib-transactions-table');
    expect(await within(feed).findByText('Acme acquires Beta Corp')).toBeInTheDocument();

    const dealTypeSelect = screen.getByRole('combobox', { name: /filter by deal type/i });
    await user.click(dealTypeSelect);
    const option = await within(dealTypeSelect).findByRole('option', { name: 'Restructuring' });
    await user.click(option);

    // Client-side filter — M&A deal drops, Restructuring remains.
    await vi.waitFor(() =>
      expect(screen.queryByText('Acme acquires Beta Corp')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Gamma restructuring')).toBeInTheDocument();
  });
});

describe('IBTransactionsPage — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByTestId('ib-league');
    expect(await axe(container)).toHaveNoViolations();
  });
});
