// PE Review Queue page (F27.3): the pending list + filters render, the detail drawer's diff view
// marks changed fields, approve/reject/edit hit the PATCH endpoint with notes + refresh stats,
// bulk-approve posts the selected ids, an error envelope surfaces a toast (no crash), and axe.
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
import PEReviewQueuePage from './PEReviewQueuePage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/pe/review-queue']}>
          <PEReviewQueuePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PEReviewQueuePage', () => {
  it('renders the stats header and the pending items list', async () => {
    renderPage();
    // Stats: pending tile + a byReason badge.
    expect(await screen.findByText(/review queue overview/i)).toBeInTheDocument();
    expect(await screen.findByText(/stale_removal 4/i)).toBeInTheDocument();
    // Pending rows (3 pending fixtures).
    const reviewBtns = await screen.findAllByRole('button', { name: /^review$/i });
    expect(reviewBtns).toHaveLength(3);
  });

  it('filters by reason client-side', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('button', { name: /^review$/i });
    // Reason combobox → exit_check leaves one row.
    await user.click(screen.getByRole('combobox', { name: /reason/i }));
    await user.click(await screen.findByRole('option', { name: 'exit_check' }));
    expect(screen.getAllByRole('button', { name: /^review$/i })).toHaveLength(1);
  });

  it('opens the diff view and marks the changed field', async () => {
    const user = userEvent.setup();
    renderPage();
    const [firstReview] = await screen.findAllByRole('button', { name: /^review$/i });
    await user.click(firstReview);
    await screen.findByRole('heading', { name: /^review item$/i });
    // companyName differs before→after → highlighted changed cell present.
    expect(screen.getByTestId('diff-changed-companyName')).toBeInTheDocument();
    // sector is unchanged (before===after) → not marked changed.
    expect(screen.queryByTestId('diff-changed-sector')).not.toBeInTheDocument();
  });

  it('approves an item with notes via PATCH and refreshes', async () => {
    const user = userEvent.setup();
    let patched: { url: string; body: unknown } | null = null;
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PATCH' && request.url.includes('/api/pe/review-queue/')) {
        patched = { url: request.url, body: await request.clone().json() };
      }
    });

    renderPage();
    const [firstReview] = await screen.findAllByRole('button', { name: /^review$/i });
    await user.click(firstReview);
    await screen.findByRole('heading', { name: /^review item$/i });
    await user.type(screen.getByLabelText(/reviewer notes/i), 'looks correct');
    await user.click(screen.getByRole('button', { name: /^approve$/i }));

    expect(await screen.findByText(/item approved\./i)).toBeInTheDocument();
    expect(patched).not.toBeNull();
    expect(patched!.url).toContain('/api/pe/review-queue/ri1');
    expect(patched!.body).toMatchObject({ status: 'approved', reviewerNotes: 'looks correct' });
  });

  it('rejects an item via PATCH with status rejected', async () => {
    const user = userEvent.setup();
    let body: { status?: string } | null = null;
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PATCH' && request.url.includes('/api/pe/review-queue/')) {
        body = (await request.clone().json()) as { status?: string };
      }
    });
    renderPage();
    const [firstReview] = await screen.findAllByRole('button', { name: /^review$/i });
    await user.click(firstReview);
    await screen.findByRole('heading', { name: /^review item$/i });
    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(await screen.findByText(/item rejected\./i)).toBeInTheDocument();
    expect(body!.status).toBe('rejected');
  });

  it('sends status edited when the Edit action is used', async () => {
    const user = userEvent.setup();
    let body: { status?: string } | null = null;
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PATCH' && request.url.includes('/api/pe/review-queue/')) {
        body = (await request.clone().json()) as { status?: string };
      }
    });
    renderPage();
    const [firstReview] = await screen.findAllByRole('button', { name: /^review$/i });
    await user.click(firstReview);
    await screen.findByRole('heading', { name: /^review item$/i });
    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.click(screen.getByRole('button', { name: /save edit/i }));
    expect(await screen.findByText(/item edited\./i)).toBeInTheDocument();
    expect(body!.status).toBe('edited');
  });

  it('bulk-approves selected ids behind a count-confirm dialog', async () => {
    const user = userEvent.setup();
    let bulkBody: { ids?: string[] } | null = null;
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/api/pe/review-queue/bulk-approve')) {
        bulkBody = (await request.clone().json()) as { ids?: string[] };
      }
    });

    renderPage();
    await screen.findAllByRole('button', { name: /^review$/i });
    // Select first item's checkbox.
    await user.click(screen.getByRole('checkbox', { name: /select item ri1/i }));
    await user.click(screen.getByRole('button', { name: /bulk approve \(1\)/i }));
    // Confirm dialog.
    await screen.findByRole('heading', { name: /approve selected items\?/i });
    await user.click(screen.getByRole('button', { name: /approve 1 item/i }));
    expect(await screen.findByText(/approved 1 item/i)).toBeInTheDocument();
    expect(bulkBody!.ids).toEqual(['ri1']);
  });

  it('surfaces a toast (not a crash) on an error envelope', async () => {
    const user = userEvent.setup();
    server.use(http.patch('/api/pe/review-queue/:id', () => err(500, 'boom')));
    renderPage();
    const [firstReview] = await screen.findAllByRole('button', { name: /^review$/i });
    await user.click(firstReview);
    await screen.findByRole('heading', { name: /^review item$/i });
    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    expect(await screen.findByText(/could not resolve the item\./i)).toBeInTheDocument();
  });

  it('has no axe violations once loaded', async () => {
    const { container } = renderPage();
    await screen.findAllByRole('button', { name: /^review$/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});
