// IB Banks directory (F34.4): renders the banks table + coverage panel from MSW fixtures; the
// bulk-import modal flow surfaces created/exists/error results; the staff-only ops row is hidden for a
// granted non-staff user and shown for staff (pe:admin); scrape-all surfaces its message; and axe finds
// no violations. Tables-first v1 — no chart library. Mirrors PETalentFlowPage.test.tsx.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import IBBanksPage from './IBBanksPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ currentUser: null, isAuthenticated: false });
});
afterAll(() => server.close());

const base: User = {
  id: 'u1',
  email: 'a@b.c',
  profile: {},
  orgRole: 'member',
  isAdmin: false,
  isAuthenticated: true,
  hasPassword: true,
};

function setUser(u: Partial<User>) {
  useAuthStore.setState({ currentUser: { ...base, ...u }, isAuthenticated: true });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/ib']}>
          <IBBanksPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('IBBanksPage — directory', () => {
  it('renders banks with status/freshness + the coverage breakdown panel', async () => {
    setUser({ permissions: { 'pe:dataset': true } });
    renderPage();

    // Bank rows.
    expect(await screen.findByRole('link', { name: 'Evercore' })).toHaveAttribute(
      'href',
      '/ib/ib1',
    );
    expect(screen.getByRole('link', { name: 'Moelis & Company' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Newco Advisors' })).toBeInTheDocument();

    // Coverage panel with Replit-style segment percentages.
    const panel = screen.getByTestId('coverage-panel');
    expect(within(panel).getByTestId('coverage-pct-withBoth')).toHaveTextContent('33%');
    expect(within(panel).getByTestId('coverage-pct-withTransactions')).toHaveTextContent('33%');
    expect(within(panel).getByTestId('coverage-pct-withNeither')).toHaveTextContent('33%');

    // Actions column is hidden for non-staff.
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('bulk-import modal shows created / exists / error results', async () => {
    const user = userEvent.setup();
    setUser({ isAdmin: true });
    renderPage();
    await screen.findByRole('link', { name: 'Evercore' });

    await user.click(screen.getByTestId('ib-open-bulk-import'));
    const textarea = await screen.findByLabelText('Bank URLs to import');
    await user.type(textarea, 'https://new-bank.com\nhttps://moelis.com\nhttps://bad-url.com');
    await user.click(screen.getByTestId('ib-bulk-import-submit'));

    const results = await screen.findByTestId('ib-bulk-import-results');
    const statuses = within(results)
      .getAllByTestId('bulk-status')
      .map((n) => n.getAttribute('data-status'));
    expect(statuses).toContain('created');
    expect(statuses).toContain('exists');
    expect(statuses).toContain('error');
    // name-from-domain: new-bank.com → "New-bank".
    expect(within(results).getByText('New-bank')).toBeInTheDocument();
  });

  it('surfaces the scrape-all message', async () => {
    const user = userEvent.setup();
    setUser({ isAdmin: true });
    renderPage();
    await screen.findByRole('link', { name: 'Evercore' });

    await user.click(screen.getByTestId('ib-scrape-all'));
    expect(await screen.findByTestId('ib-scrape-msg')).toHaveTextContent(/Queued 2 banks/i);
  });
});

describe('IBBanksPage — staff-only ops gating', () => {
  it('hides the operator tools from a granted non-staff user', async () => {
    setUser({ permissions: { 'pe:dataset': true } }); // pe:dataset but NOT pe:admin
    renderPage();
    await screen.findByRole('link', { name: 'Evercore' });
    expect(screen.queryByTestId('ib-staff-ops')).not.toBeInTheDocument();
  });

  it('shows the operator tools for staff (pe:admin / isAdmin)', async () => {
    setUser({ isAdmin: true }); // staff → legacy fallback grants pe:dataset + pe:admin
    renderPage();
    await screen.findByRole('link', { name: 'Evercore' });
    const ops = await screen.findByTestId('ib-staff-ops');
    expect(within(ops).getByTestId('op-infer-emails')).toBeInTheDocument();
    expect(within(ops).getByTestId('op-rescrape-people')).toBeInTheDocument();
  });

  it('runs a staff op and surfaces its message', async () => {
    const user = userEvent.setup();
    setUser({ isAdmin: true });
    renderPage();
    await screen.findByRole('link', { name: 'Evercore' });

    await user.click(await screen.findByTestId('op-infer-emails'));
    expect(await screen.findByTestId('op-feedback')).toHaveTextContent(/Inferred 4 emails/i);
  });
});

describe('IBBanksPage — add bank + discover + delete (CU.5)', () => {
  it('discovers candidates and creates a bank from one', async () => {
    const user = userEvent.setup();
    setUser({ isAdmin: true });
    renderPage();
    await screen.findByRole('link', { name: 'Evercore' });

    await user.click(screen.getByTestId('ib-open-add-bank'));
    await user.click(await screen.findByTestId('ib-discover-search'));

    const results = await screen.findByTestId('ib-discover-results');
    expect(within(results).getByText(/harbor advisors/i)).toBeInTheDocument();
    await user.click(within(results).getAllByRole('button', { name: /use/i })[0]);

    // Candidate prefilled the form — submit as-is.
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Harbor Advisors (middle market M&A)');
    await user.click(screen.getByTestId('ib-add-submit'));

    await screen.findByText(/created; first scrape queued/i);
  });

  it('delete is staff-only and typed-confirmed; cancel fires nothing', async () => {
    // Granted non-staff: no delete column.
    setUser({ permissions: { 'pe:dataset': true } });
    renderPage();
    await screen.findByRole('link', { name: 'Evercore' });
    expect(screen.queryByTestId('ib-delete-ib1')).not.toBeInTheDocument();
  });

  it('staff can delete a bank via typed confirm', async () => {
    const user = userEvent.setup();
    setUser({ isAdmin: true });
    renderPage();
    await screen.findByRole('link', { name: 'Evercore' });

    await user.click(screen.getByTestId('ib-delete-ib1'));
    const confirm = await screen.findByRole('button', { name: /delete bank/i });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/type “evercore” to confirm/i), 'Evercore');
    await user.click(confirm);

    await screen.findByText(/bank “evercore” deleted/i);
  });
});

describe('IBBanksPage — accessibility', () => {
  it('has no axe violations', async () => {
    setUser({ permissions: { 'pe:dataset': true } });
    const { container } = renderPage();
    await screen.findByRole('link', { name: 'Evercore' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
