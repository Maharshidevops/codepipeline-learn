// PE Corrections page (F27.3): Q20 layout (auto-fix rules + correction history), disabled rules
// are visually distinct, dry-run preview blocks enable until previewed, global apply shows
// per-mechanism counts, staff-only controls hidden for granted non-staff, error toast, axe.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { err } from '@/test/mocks/envelope';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import PECorrectionsPage from './PECorrectionsPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ currentUser: null, isAuthenticated: false });
});
afterAll(() => server.close());

const baseUser: User = {
  id: 'u1',
  email: 'a@b.c',
  profile: {},
  orgRole: 'member',
  isAdmin: false,
  isAuthenticated: true,
  hasPassword: true,
};

function asStaff() {
  useAuthStore.setState({ currentUser: { ...baseUser, isAdmin: true }, isAuthenticated: true });
}
function asGrantedNonStaff() {
  useAuthStore.setState({
    currentUser: { ...baseUser, permissions: { 'pe:dataset': true, 'pe:admin': false } },
    isAuthenticated: true,
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/pe/corrections']}>
          <PECorrectionsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PECorrectionsPage', () => {
  it('renders Q20 chrome, auto-fix rules, and correction history', async () => {
    asStaff();
    renderPage();
    expect(await screen.findByRole('heading', { name: /^corrections$/i })).toBeInTheDocument();
    expect(screen.getByText('Private Equity')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /active auto-fix rules/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /correction history/i })).toBeInTheDocument();
    expect(screen.getByText('acme-capital.com')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('marks the disabled rule row visually distinct', async () => {
    asStaff();
    renderPage();
    const disabledBadge = await screen.findByText('Disabled');
    const row = disabledBadge.closest('tr');
    expect(row).toHaveClass('text-muted');
  });

  it('blocks enable until the dry-run preview loads, then enables the rule', async () => {
    const user = userEvent.setup();
    asStaff();
    let enableCalls = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST' && /\/rules\/.+\/enable$/.test(new URL(request.url).pathname)) {
        enableCalls += 1;
      }
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: /preview & enable/i }));
    await screen.findByRole('heading', { name: /preview correction impact/i });
    expect(await screen.findByText(/total affected/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /enable rule/i }));
    expect(await screen.findByText(/rule enabled\./i)).toBeInTheDocument();
    expect(enableCalls).toBe(1);
  });

  it('runs the global apply and shows per-mechanism fix counts', async () => {
    const user = userEvent.setup();
    asStaff();
    let applyBody: { dryRun?: boolean } | null = null;
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/api/pe/corrections/apply')) {
        applyBody = (await request.clone().json()) as { dryRun?: boolean };
      }
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: /apply to all data/i }));
    await screen.findByRole('heading', { name: /apply corrections across the dataset\?/i });
    const dialogConfirm = screen.getByRole('button', { name: /^apply corrections$/i });
    await user.click(dialogConfirm);
    expect(await screen.findByText(/corrections applied/i)).toBeInTheDocument();
    expect(screen.getByText(/last apply — per-mechanism fixes/i)).toBeInTheDocument();
    expect(applyBody!.dryRun).toBe(false);
  });

  it('hides staff-only controls for a granted non-staff user', async () => {
    asGrantedNonStaff();
    renderPage();
    await screen.findByRole('heading', { name: /active auto-fix rules/i });
    expect(screen.queryByRole('button', { name: /preview & enable/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply to all data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^disable$/i })).not.toBeInTheDocument();
  });

  it('surfaces a toast (not a crash) on an error envelope', async () => {
    const user = userEvent.setup();
    asStaff();
    server.use(http.post('/api/pe/corrections/rules/:id/disable', () => err(500, 'nope')));
    renderPage();
    const disableBtn = await screen.findByRole('button', { name: /^disable$/i });
    await user.click(disableBtn);
    await screen.findByRole('heading', { name: /disable this rule\?/i });
    await user.click(screen.getByRole('button', { name: /disable rule/i }));
    expect(await screen.findByText(/could not disable the rule\./i)).toBeInTheDocument();
  });

  it('has no axe violations once loaded', async () => {
    asStaff();
    const { container } = renderPage();
    await screen.findByRole('heading', { name: /active auto-fix rules/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});
