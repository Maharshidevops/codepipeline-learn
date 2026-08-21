// PE People page (F25.3): the coverage summary + paginated/filterable grid render MSW fixtures;
// role filter and offset pagination hit the server with the right params; axe audit on the loaded
// surface. Batch-modal SSE binding is covered in PeopleBatchModal.test.tsx.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { mockPePeople } from '@/test/mocks/fixtures/pe';
import PEPeoplePage from './PEPeoplePage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/pe/people']}>
          <PEPeoplePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PEPeoplePage', () => {
  it('renders the coverage summary and the people grid with provenance badges', async () => {
    renderPage();
    // Grid rows.
    await screen.findByText('Ada Partner');
    expect(screen.getByText('Ben Operator')).toBeInTheDocument();
    // Email provenance labels from the contract (Apollo / Inferred). "Inferred" also appears as a
    // summary-table column header, so assert at least one badge exists rather than a unique node.
    expect(screen.getByText('Apollo')).toBeInTheDocument();
    expect(screen.getAllByText('Inferred').length).toBeGreaterThan(0);
    // Summary stat row + role breakdown.
    expect(screen.getByText('People tracked')).toBeInTheDocument();
    expect(screen.getByText(/role breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/showing 1–3 of 3/i)).toBeInTheDocument();
  });

  it('sends the roleTag filter to the server', async () => {
    let lastUrl: URL | null = null;
    server.use(
      http.get(endpoints.pe.people, ({ request }) => {
        lastUrl = new URL(request.url);
        return Response.json(
          {
            success: true,
            statusCode: 200,
            data: { people: [] },
            message: null,
            meta: { total: 0, limit: 100, offset: 0 },
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/no people found/i);

    await user.click(screen.getByRole('combobox', { name: 'All roles' }));
    await user.click(screen.getByRole('option', { name: 'Investment' }));

    await screen.findByText(/no people found/i);
    expect(lastUrl!.searchParams.get('roleTag')).toBe('investment');
  });

  it('paginates with offset-based pages', async () => {
    server.use(
      http.get(endpoints.pe.people, ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get('offset') ?? '0');
        const count = offset === 0 ? 100 : 50;
        const rows = Array.from({ length: count }).map((_, i) => ({
          ...mockPePeople[0],
          id: `x${offset}-${i}`,
          name: `Person ${offset}-${i}`,
        }));
        return Response.json(
          {
            success: true,
            statusCode: 200,
            data: { people: rows },
            message: null,
            meta: { total: 150, limit: 100, offset },
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Person 0-0');
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText('Person 100-0');
    expect(screen.getByText(/showing 101–150 of 150/i)).toBeInTheDocument();
  });

  it('has no axe violations once loaded', async () => {
    const { container } = renderPage();
    await screen.findByText('Ada Partner');
    expect(await axe(container)).toHaveNoViolations();
  });
});
