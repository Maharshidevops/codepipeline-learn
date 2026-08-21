// IB Screener (F34.4): renders stats + matching advisors + transaction table from MSW fixtures;
// sector filter narrows advisors; axe finds no violations.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import IBScreenerPage from './IBScreenerPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/ib/screener']}>
        <IBScreenerPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('IBScreenerPage', () => {
  it('renders the stats header + the full advisor ranking by default', async () => {
    renderPage();
    const table = await screen.findByTestId('ib-screener-table');
    const rows = await within(table).findAllByTestId('screener-row');
    expect(rows.length).toBe(2);
    // Evercore (2 deals) ranks above Moelis (1 deal).
    expect(within(rows[0]).getByRole('link')).toHaveTextContent('Evercore');

    const stats = screen.getByTestId('ib-screener-stats');
    expect(within(stats).getByTestId('stat-banks')).toHaveTextContent('3');
    expect(within(stats).getByTestId('stat-tx')).toHaveTextContent('3');
  });

  it('narrows matching advisors when a sector filter is applied', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('ib-screener-table');

    const sectorSelect = screen.getByLabelText(/add sector filter/i);
    await user.selectOptions(sectorSelect, 'Technology');

    await vi.waitFor(() => {
      const rows = within(screen.getByTestId('ib-screener-table')).getAllByTestId('screener-row');
      // Only Evercore advised in Technology (tx1).
      expect(rows.length).toBe(1);
      expect(within(rows[0]).getByRole('link')).toHaveTextContent('Evercore');
    });
  });

  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByTestId('ib-screener-table');
    expect(await axe(container)).toHaveNoViolations();
  });
});
