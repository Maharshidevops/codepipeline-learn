import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
// PE firm detail (F23.4; CU.5 added the edit dialog + portfolio-URLs editor): tabs
// render fixture data (overview/criteria/scrape history), edit + replace-all URL
// flows, and an axe audit.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import PEFirmDetailPage from './PEFirmDetailPage';

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

function renderPage(id = 'pef1', user: User = staff) {
  useAuthStore.setState({ currentUser: user, isAuthenticated: true });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/pe/firms/${id}`]}>
          <Routes>
            <Route path="/pe/firms/:id" element={<PEFirmDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PEFirmDetailPage', () => {
  it('renders overview and criteria tabs from fixtures', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: /vista equity partners/i });
    expect(screen.getByText(/enterprise software buyout firm/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /criteria/i }));
    // Both the always-visible CriteriaCard and the Criteria tab show the same ranges.
    const revMatches = screen.getAllByText(/\$100M – \$200M/);
    expect(revMatches.length).toBeGreaterThanOrEqual(1);
    const evMatches = screen.getAllByText(/\$40M – \$280M/);
    expect(evMatches.length).toBeGreaterThanOrEqual(1);
    const sourceMatches = screen.getAllByText(/source: scrape/i);
    expect(sourceMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders scrape history and the firm-scoped holdings tab (F24.3)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: /vista equity partners/i });

    // Default tab is Portfolio Holdings (Q20 parity).
    expect(await screen.findByText('Acme Analytics')).toBeInTheDocument();
    expect(screen.getByText('Cobalt Robotics')).toBeInTheDocument();
    // Beacon Health belongs to pef2 and must not appear in the pef1-scoped view.
    expect(screen.queryByText('Beacon Health')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /scrape history/i }));
    expect(await screen.findByText(/\[permanent\] criteria page unreachable/i)).toBeInTheDocument();
  });

  it('renders the firm-scoped people tab with a scrape trigger (F25.3)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: /vista equity partners/i });

    await user.click(screen.getByRole('tab', { name: /people/i }));
    // pef1 people only — Cara Advisor belongs to pef2 and must not appear.
    expect(await screen.findByText('Ada Partner')).toBeInTheDocument();
    expect(screen.getByText('Ben Operator')).toBeInTheDocument();
    expect(screen.queryByText('Cara Advisor')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scrape people/i })).toBeInTheDocument();
  });

  it('edits the firm through the edit dialog (CU.5)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: /vista equity partners/i });

    await user.click(screen.getByRole('button', { name: /edit firm/i }));
    const nameInput = await screen.findByLabelText(/^name$/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Vista Equity Partners II');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await screen.findByText(/firm updated/i);
    // setQueryData applies the PATCH echo — the heading reflects the new name.
    expect(
      await screen.findByRole('heading', { name: /vista equity partners ii/i }),
    ).toBeInTheDocument();
  });

  it('portfolio-URLs editor saves with replace-all semantics (CU.5)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: /vista equity partners/i });

    await user.click(screen.getByRole('tab', { name: /^overview$/i }));
    const textarea = await screen.findByLabelText(/replaces the whole list/i);
    expect(textarea).toHaveValue('https://vistaequitypartners.com/companies');

    const save = screen.getByRole('button', { name: /save urls/i });
    expect(save).toBeDisabled(); // nothing edited yet

    await user.type(textarea, '\nhttps://vistaequitypartners.com/exits');
    expect(save).toBeEnabled();
    await user.click(save);

    await screen.findByText(/portfolio urls saved \(2\)/i);
  });

  it('shows not-found for an unknown firm', async () => {
    renderPage('missing');
    expect(await screen.findByText(/firm not found/i)).toBeInTheDocument();
  });

  it('renders Auto-Enrichment coverage and posts Run Enrichment (F60 §7)', async () => {
    const user = userEvent.setup();
    let enrichPosted = false;
    server.events.on('request:start', ({ request }) => {
      if (
        request.method === 'POST' &&
        request.url.includes('/enrich') &&
        !request.url.includes('enrichment-status')
      ) {
        enrichPosted = true;
      }
    });

    renderPage();
    await screen.findByRole('heading', { name: /vista equity partners/i });

    const panel = await screen.findByTestId('pe-enrichment-status');
    expect(panel).toHaveTextContent(/url lookup/i);
    expect(panel).toHaveTextContent(/gics classify/i);
    expect(panel).toHaveTextContent(/location/i);
    expect(panel).toHaveTextContent('2 found');
    expect(panel).toHaveTextContent('3 found');
    expect(panel).toHaveTextContent('1 found');

    await user.click(screen.getByTestId('pe-run-enrich'));
    await waitFor(() => expect(enrichPosted).toBe(true));
    await screen.findByText(/enrichment queued/i);
  });

  it('Pause mutation sends status paused, not quarantined (F60 §7)', async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, unknown> | null = null;
    server.events.on('request:start', async ({ request }) => {
      if (
        request.method === 'PATCH' &&
        /\/api\/pe\/firms\/pef1$/.test(new URL(request.url).pathname)
      ) {
        patchBody = (await request.clone().json()) as Record<string, unknown>;
      }
    });

    renderPage();
    await screen.findByRole('heading', { name: /vista equity partners/i });
    await user.click(screen.getByRole('button', { name: /^pause$/i }));
    await waitFor(() => expect(patchBody).toEqual({ status: 'paused' }));
    await screen.findByText(/firm paused/i);
  });

  it('counts null/empty/unknown investment status as Unknown Holdings (F60 §7)', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /vista equity partners/i });
    // Fixture: peh1=current, peh3=unknown (both pef1) → Unknown tile shows 1.
    await waitFor(() => {
      expect(screen.getByTestId('pe-unknown-holdings')).toHaveTextContent('1');
    });
    expect(screen.getByText('Unknown Holdings')).toBeInTheDocument();
  });

  it('hides scrape history tab and portfolio URLs editor for regular non-staff users', async () => {
    const regularUser: User = {
      ...staff,
      isAdmin: false,
      permissions: { 'pe:dataset': true, 'pe:admin': false },
    };
    const user = userEvent.setup();
    renderPage('pef1', regularUser);
    await screen.findByRole('heading', { name: /vista equity partners/i });
    expect(screen.queryByRole('tab', { name: /scrape history/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /overview/i }));
    expect(screen.queryByRole('heading', { name: /portfolio page urls/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save urls/i })).not.toBeInTheDocument();
  });

  it('has no axe violations once loaded', async () => {
    const { container } = renderPage();
    await screen.findByRole('heading', { name: /vista equity partners/i });
    // Wait for async cards (team memory / deal-flow / holdings) to settle.
    await waitFor(() => {
      expect(screen.getByText(/team memory/i)).toBeInTheDocument();
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
