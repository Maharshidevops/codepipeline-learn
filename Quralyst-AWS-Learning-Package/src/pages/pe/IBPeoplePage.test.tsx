// IB People (F34.4): renders the professional grid from MSW fixtures with inferred-email marking;
// bank filter is client-side (Replit: load-all-once); axe finds no violations.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import IBPeoplePage from './IBPeoplePage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/ib/people']}>
        <IBPeoplePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('IBPeoplePage', () => {
  it('renders the people grid with inferred-email marking', async () => {
    renderPage();
    const grid = await screen.findByTestId('ib-people-grid');
    expect(await within(grid).findByText('Alice Anderson')).toBeInTheDocument();
    expect(within(grid).getByText('Bob Brown')).toBeInTheDocument();
    // Only Bob's email is inferred.
    expect(within(grid).getAllByTestId('inferred-email')).toHaveLength(1);
    // Alice's confirmed email carries no inferred marker but is a mailto link.
    expect(
      within(grid).getByRole('link', { name: /alice\.anderson@evercore\.com/i }),
    ).toHaveAttribute('href', 'mailto:alice.anderson@evercore.com');
  });

  it('filters the grid by bank client-side', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Alice Anderson');

    const bankSelect = screen.getByRole('combobox', { name: /filter by bank/i });
    await user.click(bankSelect);
    const option = await within(bankSelect).findByRole('option', { name: 'Moelis & Company' });
    await user.click(option);

    expect(await screen.findByTestId('ppl-empty')).toBeInTheDocument();
    expect(screen.queryByText('Alice Anderson')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByText('Alice Anderson');
    expect(await axe(container)).toHaveNoViolations();
  });
});
