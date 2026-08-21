// Usage dashboard page (F35.3 / Replit parity): metric cards, daily chart, provider
// breakdown, runs list, balances, collapsible budgets; period pills refetch; depletion +
// suppression icons; LLM tokens; Advance Pricing; axe clean.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ok } from '@/test/mocks/envelope';
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { mockUsagePricing, mockUsageSummaryEmpty } from '@/test/mocks/fixtures/usage';
import { resetUsagePricingMock } from '@/test/mocks/handlers/usage';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import UsagePage from './UsagePage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetUsagePricingMock();
});
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/usage']}>
          <UsagePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('UsagePage', () => {
  it('renders tiles, lists, badges, and low-balance alert from MSW', async () => {
    const user = userEvent.setup();
    renderPage();

    await vi.waitFor(() =>
      expect(screen.getByTestId('stat-total-cost')).toHaveTextContent('$12.3456'),
    );
    expect(screen.getByTestId('stat-total-runs')).toHaveTextContent('4');

    const providers = screen.getByTestId('usage-providers');
    expect(await within(providers).findByText('OpenAI')).toBeInTheDocument();

    expect(screen.getByTestId('usage-timeseries')).toBeInTheDocument();
    expect(await screen.findByTestId('depletion-job-depleted')).toBeInTheDocument();
    expect(screen.getByTestId('suppression-job-suppressed')).toBeInTheDocument();
    expect(screen.queryByTestId('depletion-job-clean')).not.toBeInTheDocument();

    expect(screen.getByTestId('usage-balance-alerts')).toHaveTextContent('Serper');
    expect(screen.getByTestId('balance-serper_api_key')).toHaveTextContent('Low');
    expect(screen.getByTestId('balance-openai_api_key')).toHaveTextContent('Unsupported');
    expect(screen.getByTestId('balance-apollo_api_key')).toHaveTextContent('Not configured');

    expect(screen.getByTestId('usage-llm-tokens')).toHaveTextContent('50,000');
    expect(screen.getByTestId('llm-row-openai_api_key')).toHaveTextContent(/50,000 in/);
    expect(screen.getByTestId('usage-user')).toBeInTheDocument();
    expect(screen.getByTestId('usage-llm-trends')).toBeInTheDocument();
    expect(screen.getByTestId('llm-spark-openai_api_key')).toBeInTheDocument();

    await user.click(screen.getByTestId('usage-budget-toggle'));
    const budgetRow = await screen.findByTestId('budget-row-apollo_api_key');
    expect(budgetRow).toHaveClass('is-suppressed');
    expect(within(budgetRow).getByText('125.0%')).toBeInTheDocument();
  });

  it('refetches when the period pill changes', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    const onStart = ({ request }: { request: Request }) => {
      if (request.url.includes('/api/usage/summary')) seen.push(request.url);
    };
    server.events.on('request:start', onStart);

    renderPage();
    await screen.findByTestId('stat-total-cost');

    await user.click(screen.getByTestId('usage-days-7'));
    await vi.waitFor(() => expect(seen.some((u) => u.includes('days=7'))).toBe(true));

    server.events.removeListener('request:start', onStart);
  });

  it('paginates recent runs and requests the next page', async () => {
    const user = userEvent.setup();
    const seenPages: string[] = [];
    const makeRun = (i: number) => ({
      jobId: `job-page-${i}`,
      status: 'completed',
      createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-07-20T10:05:00.000Z',
      estimatedCostUsd: 0.1 * i,
      apiCalls: { openai_api_key: i },
      totalCalls: i,
      depletionProviders: [],
      hasDepletion: false,
      budgetSuppressed: [],
      userId: 'u1',
      userEmail: 'alice@example.com',
      userName: 'Alice',
    });
    const allRuns = Array.from({ length: 12 }, (_, i) => makeRun(i + 1));

    server.use(
      http.get(endpoints.usage.runs, ({ request }) => {
        const url = new URL(request.url);
        const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
        const perPage = Math.max(1, Number(url.searchParams.get('per_page') || 5) || 5);
        seenPages.push(`page=${page}&per_page=${perPage}`);
        const start = (page - 1) * perPage;
        const runs = allRuns.slice(start, start + perPage);
        return ok({
          runs,
          pagination: {
            page,
            perPage,
            total: allRuns.length,
            pages: Math.ceil(allRuns.length / perPage),
          },
          days: 30,
        });
      }),
    );

    renderPage();
    await screen.findByTestId('run-job-page-1');
    expect(screen.getByTestId('usage-runs-page-label')).toHaveTextContent('Page 1 of 3');
    expect(screen.queryByTestId('run-job-page-6')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await vi.waitFor(() =>
      expect(screen.getByTestId('usage-runs-page-label')).toHaveTextContent('Page 2 of 3'),
    );
    expect(await screen.findByTestId('run-job-page-6')).toBeInTheDocument();
    expect(screen.queryByTestId('run-job-page-1')).not.toBeInTheDocument();
    expect(seenPages.some((s) => s.includes('page=2'))).toBe(true);
  });

  it('shows empty states when the org has no usage', async () => {
    server.use(
      http.get(endpoints.usage.summary, () => ok(mockUsageSummaryEmpty)),
      http.get(endpoints.usage.runs, () =>
        ok({ runs: [], pagination: { page: 1, perPage: 20, total: 0, pages: 1 } }),
      ),
      http.get(endpoints.usage.timeseries, () =>
        ok({ days: 30, series: [], pagination: { page: 1, perPage: 50, total: 0, pages: 1 } }),
      ),
    );
    renderPage();
    expect(await screen.findByText(/No API calls recorded in this period/i)).toBeInTheDocument();
    expect(screen.getByText(/No runs recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No activity in this period/i)).toBeInTheDocument();
  });

  it('shows Advance Pricing read-only for members', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(endpoints.usage.pricing, () => ok({ ...mockUsagePricing, canEdit: false })),
    );
    renderPage();
    await screen.findByTestId('stat-total-cost');

    expect(screen.getByTestId('usage-advance-pricing')).toBeInTheDocument();
    await user.click(screen.getByTestId('usage-advance-pricing-toggle'));

    expect(await screen.findByTestId('pricing-llm-openai_api_key')).toBeInTheDocument();
    expect(screen.getByText(/View only/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Organization admins can edit other provider rates/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('pricing-save')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pricing-provider-input-serper_api_key')).not.toBeInTheDocument();
    expect(screen.getByTestId('pricing-provider-serper_api_key')).toHaveTextContent('$0.001');
  });

  it('lets org admins edit other provider rates but not LLM rates', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('stat-total-cost');

    await user.click(screen.getByTestId('usage-advance-pricing-toggle'));
    expect(await screen.findByTestId('pricing-llm-openai_api_key')).toBeInTheDocument();
    expect(screen.queryByTestId('pricing-llm-in-openai_api_key')).not.toBeInTheDocument();
    expect(screen.getByText(/View only/i)).toBeInTheDocument();

    const serperInput = await screen.findByTestId('pricing-provider-input-serper_api_key');
    expect(screen.getByTestId('pricing-save')).toBeDisabled();

    await user.clear(serperInput);
    await user.type(serperInput, '0.002');
    expect(screen.getByTestId('pricing-save')).toBeEnabled();

    await user.click(screen.getByTestId('pricing-save'));
    await vi.waitFor(() =>
      expect(screen.getByTestId('pricing-provider-serper_api_key')).toHaveTextContent('Custom'),
    );
    expect(serperInput).toHaveValue('0.002');
  });

  it('has no axe violations once loaded', async () => {
    const { container } = renderPage();
    await screen.findByTestId('stat-total-cost');
    expect(await axe(container)).toHaveNoViolations();
  });
});
