// PE Digest page tests (F37.2): topEvents + five category groups, window tabs, importance
// tones at 75/50, tag chips, deep links, manual refetch, empty state, axe.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ok } from '@/test/mocks/envelope';
import { endpoints } from '@/services/endpoints';
import { mockDigestEmpty } from '@/test/mocks/fixtures/peDigest';
import PEDigestPage from './PEDigestPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function trackDigestGets() {
  const seen: string[] = [];
  const onStart = ({ request }: { request: Request }) => {
    if (request.url.includes('/api/pe/digest')) seen.push(request.url);
  };
  server.events.on('request:start', onStart);
  return seen;
}

function renderPage(initialEntry = '/pe/digest') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <PEDigestPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PEDigestPage — feed', () => {
  it('renders topEvents rail and all five category groups', async () => {
    renderPage();
    expect(await screen.findByTestId('digest-top-events')).toBeInTheDocument();
    expect(screen.getByTestId('digest-group-new_investment')).toBeInTheDocument();
    expect(screen.getByTestId('digest-group-rollup_addon')).toBeInTheDocument();
    expect(screen.getByTestId('digest-group-exit')).toBeInTheDocument();
    expect(screen.getByTestId('digest-group-talent_move')).toBeInTheDocument();
    expect(screen.getByTestId('digest-group-portfolio_update')).toBeInTheDocument();
  });

  it('shows High / Notable / Low importance tones at the 75/50 boundaries', async () => {
    renderPage();
    await screen.findByTestId('digest-top-events');
    const tones = screen
      .getAllByTestId('digest-importance')
      .map((el) => el.getAttribute('data-tone'));
    expect(tones).toContain('high');
    expect(tones).toContain('notable');
    expect(tones).toContain('low');
  });

  it('renders enrichment tag chips', async () => {
    renderPage();
    await screen.findByTestId('digest-top-events');
    const tags = screen.getAllByTestId('digest-tag').map((el) => el.getAttribute('data-tag'));
    expect(tags).toContain('Roll-up');
    expect(tags).toContain('Thesis shift');
    expect(tags).toContain('Exit-ready');
    expect(tags).toContain('Watch');
  });

  it('deep-links firm and holding', async () => {
    renderPage();
    await screen.findByTestId('digest-top-events');
    const holdingLinks = screen.getAllByTestId('digest-holding-link');
    expect(holdingLinks[0]).toHaveAttribute('href', '/pe/firms/pef1?holding=h1');
    expect(screen.getAllByRole('link', { name: /Acme Capital/i })[0]).toHaveAttribute(
      'href',
      '/pe/firms/pef1',
    );
  });
});

describe('PEDigestPage — window + refetch', () => {
  it('defaults to 7d and refetches when switching windows', async () => {
    const user = userEvent.setup();
    const seen = trackDigestGets();
    renderPage();
    await screen.findByTestId('digest-top-events');
    expect(seen.some((u) => u.includes('window=7d'))).toBe(true);

    await user.click(screen.getByTestId('digest-window-30d'));
    await screen.findByTestId('digest-top-events');
    expect(seen.some((u) => u.includes('window=30d'))).toBe(true);
  });

  it('manual refresh re-calls the endpoint', async () => {
    const user = userEvent.setup();
    const seen = trackDigestGets();
    renderPage();
    await screen.findByTestId('digest-top-events');
    const before = seen.length;
    await user.click(screen.getByRole('button', { name: /refresh digest/i }));
    await screen.findByTestId('digest-top-events');
    expect(seen.length).toBeGreaterThan(before);
  });

  it('shows empty state when the window has no events', async () => {
    server.use(http.get(endpoints.pe.digest, () => ok(mockDigestEmpty)));
    renderPage('/pe/digest?window=all');
    expect(await screen.findByTestId('digest-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('digest-top-events')).not.toBeInTheDocument();
    expect(screen.queryByTestId('digest-group-exit')).not.toBeInTheDocument();
  });
});

describe('PEDigestPage — a11y', () => {
  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByTestId('digest-top-events');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('importanceTone helper coverage via UI', () => {
  it('ranks rollup as High in the top rail', async () => {
    renderPage();
    const top = await screen.findByTestId('digest-top-events');
    const first = within(top).getAllByTestId('digest-event')[0];
    expect(first).toHaveAttribute('data-category', 'rollup_addon');
    expect(within(first).getByTestId('digest-importance')).toHaveAttribute('data-tone', 'high');
  });
});
