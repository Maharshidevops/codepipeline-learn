// BD Scoring page (F36.3): templates + companies from MSW; drawer live score; axe.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import BdScoringPage from './BdScoringPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/bd-scoring']}>
          <BdScoringPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('BdScoringPage', () => {
  it('lists companies from MSW and opens the live-score drawer', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByTestId('bd-company-c1', undefined, { timeout: 3000 }),
    ).toHaveTextContent('Acme Industrial');
    expect(screen.getByTestId('bd-company-c2')).toHaveTextContent('disqualified');

    await user.click(screen.getByTestId('bd-add-company'));
    const drawer = await screen.findByTestId('bd-scoring-drawer');
    expect(within(drawer).getByTestId('bd-live-score')).toBeInTheDocument();

    await user.click(within(drawer).getByTestId('dq-dq_active_process'));
    expect(within(drawer).getByTestId('bd-live-score')).toHaveTextContent('disqualified');
  });

  it('shows templates and editor tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('bd-tab-templates'));
    expect(await screen.findByText(/Sell-Side Mandate/i)).toBeInTheDocument();
    expect(screen.getByTestId('bd-generate-panel')).toBeInTheDocument();
    await user.click(screen.getByTestId('bd-tab-editor'));
    expect(screen.getByTestId('bd-template-editor')).toBeInTheDocument();
  });

  it('filters companies by tier dropdown', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('bd-company-c1');
    const tierSelect = screen.getByTestId('bd-tier');
    expect(tierSelect.tagName).toBe('SELECT');
    await user.selectOptions(tierSelect, 'disqualified');
    expect(await screen.findByTestId('bd-company-c2')).toBeInTheDocument();
    expect(screen.queryByTestId('bd-company-c1')).not.toBeInTheDocument();
  });

  it('generates a template draft into the editor', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('bd-tab-templates'));
    const brief =
      'Sell-side scoring for HVAC contractors with revenue, ownership, and geography criteria.';
    await user.click(screen.getByTestId('bd-gen-brief'));
    await user.paste(brief);
    await user.click(screen.getByTestId('bd-gen-submit'));
    expect(await screen.findByTestId('bd-template-editor')).toBeInTheDocument();
    expect((screen.getByTestId('bd-editor-json') as HTMLTextAreaElement).value).toContain(
      'revenue_range',
    );
  });

  it('has no axe violations on companies tab', async () => {
    const { container } = renderPage();
    await screen.findByTestId('bd-company-c1');
    expect(await axe(container)).toHaveNoViolations();
  });
});
