// PE Holdings (F24.3): the aggregated table renders fixtures via MSW; exercises sort, filter,
// pagination, the suspect-quality view with reason chips, and an axe audit on the loaded surface.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import PEHoldingsPage from './PEHoldingsPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/pe/holdings']}>
          <PEHoldingsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PEHoldingsPage', () => {
  it('renders the aggregated holdings table with a firm link and a status badge', async () => {
    renderPage();
    await screen.findByText('Acme Analytics');
    expect(screen.getByText('Beacon Health')).toBeInTheDocument();
    // Firm column links to the firm detail (multiple rows share the Vista firm).
    expect(screen.getAllByRole('link', { name: /vista equity partners/i }).length).toBeGreaterThan(
      0,
    );
    // Row count reflects the fixture set.
    expect(screen.getByText(/showing 1–3 of 3/i)).toBeInTheDocument();
  });

  it('sends 0-based page + sort + status params to the server', async () => {
    let lastUrl: URL | null = null;
    server.use(
      http.get(endpoints.pe.holdings, ({ request }) => {
        lastUrl = new URL(request.url);
        return Response.json(
          {
            success: true,
            statusCode: 200,
            data: { holdings: [] },
            message: null,
            meta: { total: 0, page: 0, pageSize: 50 },
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    // Wait for the initial fetch.
    await screen.findByText(/no holdings found/i);
    expect(lastUrl!.searchParams.get('page')).toBe('0');
    expect(lastUrl!.searchParams.get('sortBy')).toBe('companyName');

    // Sort by firm.
    await user.click(screen.getByText(/^firm$/i));
    await screen.findByText(/no holdings found/i);
    expect(lastUrl!.searchParams.get('sortBy')).toBe('firmName');
  });

  it('suspect view shows only hasIssue rows with reason chips', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Acme Analytics');

    await user.click(screen.getByRole('button', { name: /data quality|all data quality/i }));
    await user.click(screen.getByRole('option', { name: /suspect/i }));

    // Suspect fixture rows appear; clean rows do not.
    await screen.findByText('Dodgy Domains');
    expect(screen.getByText('Empty Sector Co')).toBeInTheDocument();
    expect(screen.queryByText('Acme Analytics')).not.toBeInTheDocument();

    // Reason chips render (e.g. no_tld).
    const chips = screen.getAllByTestId('quality-reason').map((n) => n.textContent);
    expect(chips).toContain('no_tld');
  });

  it('paginates with 0-based pages', async () => {
    // 60 rows → 2 pages of 50.
    server.use(
      http.get(endpoints.pe.holdings, ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page'));
        const rows = Array.from({ length: page === 0 ? 50 : 10 }).map((_, i) => ({
          id: `p${page}-${i}`,
          firmId: 'pef1',
          firmName: 'Vista Equity Partners',
          companyName: `Co ${page}-${i}`,
          companyKey: `co-${page}-${i}`,
          sector: 'Software',
          subSector: null,
          geography: null,
          city: null,
          state: null,
          country: null,
          investmentStatus: 'current',
          foundingYear: null,
          investmentDate: '2021',
          exitDate: null,
          estimatedInvestmentYear: null,
          estimatedInvestmentMonth: null,
          estimatedInvestmentConfidence: null,
          description: null,
          aiDescription: null,
          aiKeywords: [],
          keyProductsServices: [],
          websiteUrl: null,
          peDetailUrl: null,
          logoUrl: null,
          pendingReview: false,
          manuallyCurated: false,
          qualityScore: 1,
          sources: {},
          firstSeenAt: null,
          lastSeenAt: null,
          createdAt: '2026-06-01T09:00:00Z',
          quality: { overallTier: 'valid', hasIssue: false, fields: {} },
        }));
        return Response.json(
          {
            success: true,
            statusCode: 200,
            data: { holdings: rows },
            message: null,
            meta: { total: 30, page, pageSize: 15 },
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/page 1 of 2/i);
    await user.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText(/page 2 of 2/i);
    expect(screen.getByText(/showing 16–30 of 30/i)).toBeInTheDocument();
  });

  it('has no axe violations once loaded', async () => {
    const { container } = renderPage();
    await screen.findByText('Acme Analytics');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('suspect view has no axe violations', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByText('Acme Analytics');
    await user.click(screen.getByRole('button', { name: /data quality|all data quality/i }));
    await user.click(screen.getByRole('option', { name: /suspect/i }));
    await screen.findByText('Dodgy Domains');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('does not crash rendering the firm-link cell for realized rows', async () => {
    renderPage();
    const beacon = await screen.findByText('Beacon Health');
    // Its row carries the realized status badge.
    const row = beacon.closest('tr')!;
    expect(within(row).getByText('realized')).toBeInTheDocument();
  });

  // ── Deal team (F66 Unit 4) ──────────────────────────────────────────────────
  it('expands a row to reveal the deal team and collapses it again', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Acme Analytics');
    const toggle = screen.getByRole('button', { name: /show the deal team for acme analytics/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(await screen.findByText(/deal team \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText('Dana Director')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /hide the deal team for acme analytics/i }),
    ).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: /hide the deal team/i }));
    expect(screen.queryByText('Dana Director')).not.toBeInTheDocument();
  });

  it('keeps only one row expanded at a time', async () => {
    // Each panel fires its own request, so leaving every opened row mounted would fan out a
    // query per row on a 50-row page.
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Acme Analytics');
    await user.click(
      screen.getByRole('button', { name: /show the deal team for acme analytics/i }),
    );
    await screen.findByText('Dana Director');
    await user.click(screen.getByRole('button', { name: /show the deal team for beacon health/i }));
    await screen.findByText('Lee Lead');
    expect(screen.queryByText('Dana Director')).not.toBeInTheDocument();
  });

  it('shows the team indicator only on rows the backend flagged', async () => {
    renderPage();
    const acme = await screen.findByText('Acme Analytics');
    const beacon = screen.getByText('Beacon Health');
    // Fixture: hasTeam is true on Acme only. The indicator must not appear on every row —
    // that is the whole reason hasTeam excludes the always-available firm-lead fallback.
    expect(
      within(acme.closest('tr')!).getByLabelText(/has linked deal-team members/i),
    ).toBeInTheDocument();
    expect(
      within(beacon.closest('tr')!).queryByLabelText(/has linked deal-team members/i),
    ).not.toBeInTheDocument();
  });

  it('expanded row has no axe violations', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByText('Acme Analytics');
    await user.click(
      screen.getByRole('button', { name: /show the deal team for acme analytics/i }),
    );
    await screen.findByText('Dana Director');
    expect(await axe(container)).toHaveNoViolations();
  });
});
