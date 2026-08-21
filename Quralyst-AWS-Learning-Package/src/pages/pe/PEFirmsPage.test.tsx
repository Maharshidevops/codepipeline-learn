// PE firm directory (F23.4; CU.5 added add-firm + staff delete): renders fixtures via
// MSW, search + import modal flow, the add-firm dialog, the typed-confirm delete, and
// an axe audit on the loaded surface.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import PEFirmsPage from './PEFirmsPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ currentUser: null, isAuthenticated: false });
});
afterAll(() => server.close());

const staff: User = {
  id: 'u1',
  email: 'staff@quralyst.com',
  profile: {},
  orgRole: 'member',
  isAdmin: true, // staff → legacy fallback grants pe:dataset + pe:admin
  isAuthenticated: true,
  hasPassword: true,
};

function renderPage(user: User | null = null) {
  if (user) {
    useAuthStore.setState({ currentUser: user, isAuthenticated: true });
  }
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/pe/firms']}>
          <PEFirmsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PEFirmsPage', () => {
  it('renders the firm directory with Q20 columns', async () => {
    renderPage();
    await screen.findByRole('link', { name: /vista equity partners/i });
    expect(screen.getByRole('columnheader', { name: /firm name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /top sectors/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /appetite/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /last scraped/i })).toBeInTheDocument();
    expect(screen.getByText(/software/i)).toBeInTheDocument();
    expect(screen.getByText(/never/i)).toBeInTheDocument();
  });

  it('runs the bulk-import modal flow and shows the summary', async () => {
    const user = userEvent.setup();
    renderPage(staff);
    await screen.findByRole('link', { name: /vista equity partners/i });

    await user.click(screen.getByRole('button', { name: /bulk import/i }));
    const textarea = await screen.findByLabelText(/firm website urls/i);
    await user.type(textarea, 'https://newfirm.example.com{enter}https://junk.example.com');
    await user.click(screen.getByRole('button', { name: /import 2 url/i }));

    await screen.findByText(/1 created · 0 duplicate · 1 quarantined · 0 failed/i);
    expect(screen.getByText(/low confidence this is a PE firm/i)).toBeInTheDocument();
  });

  it('creates a firm through the add-firm dialog (CU.5)', async () => {
    const user = userEvent.setup();
    renderPage(staff);
    await screen.findByRole('link', { name: /vista equity partners/i });

    await user.click(screen.getByRole('button', { name: /^add firm$/i }));
    await user.type(
      await screen.findByLabelText(/firm website url/i),
      'https://newfirm.example.com',
    );
    await user.type(screen.getByLabelText(/name \(optional/i), 'New Firm');
    await user.click(screen.getByTestId('pe-add-firm-submit'));

    await screen.findByText(/firm “new firm” created; scrape queued/i);
  });

  it('add-firm surfaces validation errors accessibly', async () => {
    const user = userEvent.setup();
    renderPage(staff);
    await screen.findByRole('link', { name: /vista equity partners/i });

    await user.click(screen.getByRole('button', { name: /^add firm$/i }));
    await user.type(await screen.findByLabelText(/firm website url/i), 'not-a-url');
    await user.click(screen.getByTestId('pe-add-firm-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter a full url/i);
  });

  it('delete is hidden for non-staff and typed-confirmed for staff (CU.5)', async () => {
    const user = userEvent.setup();
    // Non-staff: no delete buttons at all (backend is staff-only too).
    renderPage();
    await screen.findByRole('link', { name: /vista equity partners/i });
    expect(screen.queryByRole('button', { name: /delete /i })).not.toBeInTheDocument();

    // Staff: delete opens the typed confirm; the button stays disabled until the
    // exact firm name is typed; confirming fires the delete and toasts.
    useAuthStore.setState({ currentUser: staff, isAuthenticated: true });
    renderPage();
    await user.click(await screen.findByRole('button', { name: /delete vista equity partners/i }));

    const confirm = await screen.findByRole('button', { name: /delete firm/i });
    expect(confirm).toBeDisabled();
    await user.type(
      screen.getByLabelText(/type “vista equity partners” to confirm/i),
      'Vista Equity Partners',
    );
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await screen.findByText(/firm “vista equity partners” deleted/i);
  });

  it('exports the firm directory as CSV (F28 Download CSV)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('link', { name: /vista equity partners/i });
    // The button carries the total count and triggers the download without error.
    const btn = await screen.findByRole('button', { name: /download csv/i });
    await user.click(btn);
    await screen.findByText(/firm export downloaded/i);
  });

  it('hides the staff-only toolbar ops for non-staff', async () => {
    renderPage();
    await screen.findByRole('link', { name: /vista equity partners/i });
    expect(screen.queryByRole('button', { name: /pause scraping/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /fill missing criteria/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /force re-scrape all/i })).not.toBeInTheDocument();
  });

  it('shows staff toolbar ops and enqueues a trigger', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ currentUser: staff, isAuthenticated: true });
    renderPage();
    await screen.findByRole('link', { name: /vista equity partners/i });
    // Pause + force + hygiene ops are present for staff.
    expect(screen.getByRole('button', { name: /pause scraping/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /force re-scrape all/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /fill missing criteria/i }));
    await user.click(await screen.findByRole('button', { name: /enqueue job/i }));
    await screen.findByText(/fill missing criteria enqueued/i);
  });

  it('has no axe violations once loaded', async () => {
    const { container } = renderPage();
    await screen.findByRole('link', { name: /vista equity partners/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});
