// PE Ask the Market page tests (F39.2).
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import { err, ok } from '@/test/mocks/envelope';
import { mockQaEmpty, mockQaUnsupported } from '@/test/mocks/fixtures/peQa';
import PEAskPage from './PEAskPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PEAskPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PEAskPage', () => {
  it('renders suggestion grid and posts a suggestion', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByTestId('qa-empty')).toBeInTheDocument();
    const suggestions = screen.getAllByTestId('qa-suggestion');
    expect(suggestions.length).toBe(4);
    await user.click(suggestions[0]);
    expect(await screen.findByTestId('qa-answer')).toBeInTheDocument();
    expect(screen.getByTestId('qa-match-count')).toHaveTextContent('2 matches');
    expect(screen.getAllByTestId('qa-citation').length).toBeGreaterThanOrEqual(2);
  });

  it('renders numbered citations with internal and external links', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByTestId('qa-suggestion')[0]);
    await screen.findByTestId('qa-citations');
    const firmLink = screen
      .getAllByRole('link')
      .find((el) => el.getAttribute('href') === '/pe/firms/pef1');
    expect(firmLink).toBeTruthy();
    const person = screen.getByRole('link', { name: /Jane Partner/i });
    expect(person).toHaveAttribute('href', 'https://www.linkedin.com/in/jane-partner');
    expect(person).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Widget Co')).toBeInTheDocument();
  });

  it('shows unsupported reason and refine refills composer', async () => {
    const user = userEvent.setup();
    server.use(http.post(endpoints.pe.qa, () => ok(mockQaUnsupported)));
    renderPage();
    await user.type(screen.getByTestId('qa-input'), 'unsupported question');
    await user.click(screen.getByTestId('qa-send'));
    expect(await screen.findByTestId('qa-unsupported')).toHaveTextContent(/live web data/i);
    await user.click(screen.getByTestId('qa-refine'));
    expect(screen.getByTestId('qa-input')).toHaveValue('unsupported question');
  });

  it('shows empty-result intent line', async () => {
    const user = userEvent.setup();
    server.use(http.post(endpoints.pe.qa, () => ok(mockQaEmpty)));
    renderPage();
    await user.type(screen.getByTestId('qa-input'), 'HVAC in Antarctica');
    await user.click(screen.getByTestId('qa-send'));
    const notice = await screen.findByTestId('qa-unsupported');
    expect(notice).toHaveTextContent(/No records/i);
    expect(notice).toHaveTextContent(/Interpreted as:/i);
  });

  it('renders rate-limit error card', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(endpoints.pe.qa, () =>
        err(429, 'Too many questions — please wait a moment and try again.', {
          retryAfterSeconds: 30,
        }),
      ),
    );
    renderPage();
    await user.type(screen.getByTestId('qa-input'), 'another question');
    await user.click(screen.getByTestId('qa-send'));
    expect(await screen.findByTestId('qa-error')).toHaveTextContent(/Too many questions/i);
  });

  it('disables send while pending', async () => {
    const user = userEvent.setup();
    let release!: (v: ReturnType<typeof ok>) => void;
    const gate = new Promise<ReturnType<typeof ok>>((resolve) => {
      release = resolve;
    });
    server.use(http.post(endpoints.pe.qa, async () => gate));
    renderPage();
    await user.type(screen.getByTestId('qa-input'), 'slow question');
    await user.keyboard('{Enter}');
    expect(await screen.findByTestId('qa-loading')).toBeInTheDocument();
    expect(screen.getByTestId('qa-send')).toBeDisabled();
    release(ok({ answered: true, answer: 'ok', citations: [], recordCount: 0 }));
    await waitFor(() => expect(screen.queryByTestId('qa-loading')).not.toBeInTheDocument());
  });

  it('has no axe violations on empty and populated states', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getAllByTestId('qa-suggestion')[0]);
    await screen.findByTestId('qa-answer');
    expect(await axe(container)).toHaveNoViolations();
  });
});
