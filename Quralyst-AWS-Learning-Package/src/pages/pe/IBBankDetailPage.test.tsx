import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
// IB Bank detail (F34.4): renders the overview + transactions tab (deal fields) + people tab (cards
// with inferred-email marking) from MSW fixtures; an unknown id shows the "bank not found" state; and
// axe finds no violations. Tables-first v1. Mirrors PETalentFlowPage.test.tsx.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import IBBankDetailPage from './IBBankDetailPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const staff: User = {
  id: 'u1',
  email: 'staff@quralyst.com',
  profile: {},
  orgRole: 'member',
  isAdmin: true,
  isAuthenticated: true,
  hasPassword: true,
};

function renderPage(id = 'ib1') {
  useAuthStore.setState({ currentUser: staff, isAuthenticated: true });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/ib/${id}`]}>
        <Routes>
          <Route path="/ib/:id" element={<IBBankDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('IBBankDetailPage', () => {
  it('renders the overview with editable fields', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Evercore', level: 1 })).toBeInTheDocument();
    const overview = screen.getByTestId('ib-overview');
    expect(within(overview).getByText('Middle-market M&A')).toBeInTheDocument();
    expect(within(overview).getByText('M&A')).toBeInTheDocument();
    expect(within(overview).getByText('Restructuring')).toBeInTheDocument();
    // Edit toggles the editable form (the PATCH field set).
    const user = userEvent.setup();
    await user.click(within(overview).getByTestId('ib-edit'));
    expect(await screen.findByTestId('ib-edit-form')).toBeInTheDocument();
    expect(screen.getByLabelText('Deal focus')).toHaveValue('Middle-market M&A');
  });

  it('shows the transactions tab with deal fields', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Evercore', level: 1 });

    await user.click(screen.getByRole('tab', { name: /Transactions/ }));
    const table = await screen.findByTestId('ib-bank-transactions');
    expect(within(table).getByText('Acme acquires Beta Corp')).toBeInTheDocument();
    expect(within(table).getByText('$500MM')).toBeInTheDocument();
    expect(within(table).getByText('Beta Corp')).toBeInTheDocument();
    // dealDate shown verbatim (ISO-prefixed text, not a datetime).
    expect(within(table).getAllByText('2026-05').length).toBeGreaterThan(0);
  });

  it('shows the people tab with inferred-email marking', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Evercore', level: 1 });

    await user.click(screen.getByRole('tab', { name: /Professionals/ }));
    const grid = await screen.findByTestId('ib-bank-people');
    expect(within(grid).getByText('Alice Anderson')).toBeInTheDocument();
    expect(within(grid).getByText('Bob Brown')).toBeInTheDocument();
    // Exactly one person (Bob) has an inferred email → one "Inferred" marker.
    const inferred = within(grid).getAllByTestId('inferred-email');
    expect(inferred).toHaveLength(1);
  });

  it('shows the "bank not found" state for an unknown id', async () => {
    renderPage('unknown');
    expect(await screen.findByTestId('ib-bank-not-found')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByRole('heading', { name: 'Evercore', level: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });
});
