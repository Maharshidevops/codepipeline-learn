// Admin provider budgets page (F35.3): loads caps + overview from MSW; save + clear round-trip;
// verbatim 400 messages; axe clean.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { err } from '@/test/mocks/envelope';
import { endpoints } from '@/services/endpoints';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import AdminProviderBudgetsPage from './AdminProviderBudgetsPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/admin/provider-budgets']}>
          <AdminProviderBudgetsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('AdminProviderBudgetsPage', () => {
  it('renders budget rows and by-user overview', async () => {
    renderPage();
    const row = await screen.findByTestId('admin-budget-apollo_api_key');
    expect(within(row).getByText('Apollo')).toBeInTheDocument();
    expect(within(row).getByText('Suppressed')).toBeInTheDocument();

    expect(await screen.findByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('saves a new cap and shows success toast', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('admin-budget-openai_api_key');

    const input = screen.getByTestId('limit-input-openai_api_key');
    await user.clear(input);
    await user.type(input, '250');
    await user.click(screen.getByTestId('save-budget-openai_api_key'));

    expect(await screen.findByText(/Saved budget for openai_api_key/i)).toBeInTheDocument();
  });

  it('confirms before clearing and posts cleared action', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    renderPage();
    await screen.findByTestId('admin-budget-openai_api_key');

    const input = screen.getByTestId('limit-input-openai_api_key');
    await user.clear(input);
    await user.click(screen.getByTestId('save-budget-openai_api_key'));

    expect(window.confirm).toHaveBeenCalled();
    expect(await screen.findByText(/Cleared budget for openai_api_key/i)).toBeInTheDocument();
  });

  it('surfaces verbatim 400 messages from the API', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(endpoints.admin.providerBudgets, () => err(400, 'limit_usd must be a number')),
    );
    renderPage();
    await screen.findByTestId('admin-budget-serper_api_key');

    const input = screen.getByTestId('limit-input-serper_api_key');
    await user.clear(input);
    await user.type(input, '12');
    await user.click(screen.getByTestId('save-budget-serper_api_key'));

    expect(await screen.findByText('limit_usd must be a number')).toBeInTheDocument();
  });

  it('has no axe violations once loaded', async () => {
    const { container } = renderPage();
    await screen.findByTestId('admin-budget-openai_api_key');
    expect(await axe(container)).toHaveNoViolations();
  });
});
