// PE Holdings edit drawer (F24.3): patch payload carries only changed fields; provenance badge
// for operator-edited fields; company-name-required validation; delete confirm; ai-enrich 503
// handling; team panel matchType states incl. the `none` empty-state; axe audit.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { mockPeHoldings } from '@/test/mocks/fixtures/pe';
import type { PEHolding } from '@/types';
import HoldingEditDrawer from './HoldingEditDrawer';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// peh1 (Acme Analytics) has an operator-edited sector in the fixture.
const holding: PEHolding = mockPeHoldings[0];

function renderDrawer(props?: Partial<React.ComponentProps<typeof HoldingEditDrawer>>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = props?.onClose ?? vi.fn();
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <HoldingEditDrawer holding={holding} open onClose={onClose} {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

describe('HoldingEditDrawer', () => {
  it('shows an operator provenance badge on the edited field', async () => {
    renderDrawer();
    // The fixture stamps sources.sector = 'operator'.
    expect(await screen.findByText(/edited by you/i)).toBeInTheDocument();
  });

  it('PATCHes only the changed fields', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${endpoints.pe.holdings}/:id`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return Response.json(
          {
            success: true,
            statusCode: 200,
            data: { ...holding, ...body },
            message: null,
            meta: null,
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    const { onClose } = renderDrawer();
    const geo = await screen.findByLabelText(/geography/i);
    await user.clear(geo);
    await user.type(geo, 'Latin America');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(body).toEqual({ geography: 'Latin America' });
  });

  it('clears a nullable field to null when emptied', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${endpoints.pe.holdings}/:id`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return Response.json(
          { success: true, statusCode: 200, data: holding, message: null, meta: null },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderDrawer();
    const sector = await screen.findByLabelText(/^sector$/i);
    await user.clear(sector);
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(body).toEqual({ sector: null }));
  });

  it('blocks save when company name is empty', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer();
    const name = await screen.findByLabelText(/company name/i);
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText(/company name is required/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and closes', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer();
    await screen.findByLabelText(/company name/i);
    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await user.click(screen.getByRole('button', { name: /confirm delete/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('disables ai-enrich after a 503 not_available', async () => {
    server.use(
      http.post(`${endpoints.pe.holdings}/:id/ai-enrich`, () =>
        Response.json(
          { success: false, statusCode: 503, data: null, message: 'not_available', meta: null },
          { status: 503 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderDrawer();
    const btn = await screen.findByRole('button', { name: /ai enrich/i });
    await user.click(btn);
    await waitFor(() => expect(screen.getByRole('button', { name: /ai enrich/i })).toBeDisabled());
  });

  it('shows the filled-field summary on a successful ai-enrich', async () => {
    const user = userEvent.setup();
    renderDrawer();
    const btn = await screen.findByRole('button', { name: /ai enrich/i });
    await user.click(btn);
    // Appears both in the toast and the in-drawer status line.
    expect((await screen.findAllByText(/ai filled: geography/i)).length).toBeGreaterThan(0);
  });

  it('renders the team panel direct match with the roster', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await user.click(screen.getByRole('tab', { name: /team/i }));
    expect(await screen.findByText(/matched directly/i)).toBeInTheDocument();
    expect(screen.getByText('Dana Director')).toBeInTheDocument();
  });

  it('renders the team none empty-state for a holding without people', async () => {
    const user = userEvent.setup();
    const other = { ...holding, id: 'peh-none' };
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ToastProvider>
          <HoldingEditDrawer holding={other} open onClose={vi.fn()} />
        </ToastProvider>
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole('tab', { name: /team/i }));
    expect(await screen.findByText(/no people scraped for this firm yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no people to show yet/i)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderDrawer();
    await screen.findByLabelText(/company name/i);
    expect(await axe(container)).toHaveNoViolations();
  });
});
