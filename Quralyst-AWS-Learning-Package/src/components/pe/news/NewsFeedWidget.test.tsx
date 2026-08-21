// NewsFeedWidget tests (F41.2).
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import {
  mockMarketNewsEmpty,
  mockMarketNewsMissingKey,
  mockMarketNewsUpstreamError,
} from '@/test/mocks/fixtures/peNews';
import NewsFeedWidget from '@/components/pe/news/NewsFeedWidget';
import { DEFAULT_MARKET_NEWS_QUERY } from '@/types/peNews';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderWidget(props: React.ComponentProps<typeof NewsFeedWidget> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NewsFeedWidget {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NewsFeedWidget', () => {
  it('renders feed items as external links with source and age', async () => {
    renderWidget();
    expect(await screen.findByTestId('news-list')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /PE firm buys Midwest HVAC/i });
    expect(link).toHaveAttribute('href', 'https://example.com/hvac-deal');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/example.com/)).toBeInTheDocument();
    expect(screen.getByText(/3 hours ago/)).toBeInTheDocument();
    expect(screen.getByText(/news.example.org/)).toBeInTheDocument();
  });

  it('shows connect-key empty state', async () => {
    server.use(http.get(endpoints.pe.news, () => ok(mockMarketNewsMissingKey)));
    renderWidget();
    expect(await screen.findByTestId('news-missing-key')).toHaveTextContent(/News API key/i);
    expect(screen.getByRole('link', { name: /Open preferences/i })).toHaveAttribute(
      'href',
      '/settings/api-keys',
    );
  });

  it('shows no-headlines empty state', async () => {
    server.use(http.get(endpoints.pe.news, () => ok(mockMarketNewsEmpty)));
    renderWidget();
    expect(await screen.findByTestId('news-empty')).toHaveTextContent(/No headlines/i);
  });

  it('shows upstream error with retry', async () => {
    server.use(http.get(endpoints.pe.news, () => ok(mockMarketNewsUpstreamError)));
    renderWidget();
    expect(await screen.findByTestId('news-error')).toHaveTextContent(/News API error 429/i);
  });

  it('refresh button force-fetches with refresh=1', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.get(endpoints.pe.news, ({ request }) => {
        calls += 1;
        const url = new URL(request.url);
        return ok({
          cachedAt: Date.now(),
          distribution: 'weekly',
          page: 1,
          pageSize: 15,
          hasMore: false,
          items: [
            {
              title: `Headline ${calls}${url.searchParams.get('refresh') ? '-fresh' : ''}`,
              url: `https://ex.com/${calls}`,
              source: 'ex.com',
              snippet: '',
              age: null,
            },
          ],
        });
      }),
    );
    renderWidget();
    expect(await screen.findByText('Headline 1')).toBeInTheDocument();
    await user.click(screen.getByTestId('news-refresh'));
    expect(await screen.findByText('Headline 2-fresh')).toBeInTheDocument();
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('shows filters and paginates when query handlers provided', async () => {
    const user = userEvent.setup();
    let latestPage = 1;

    server.use(
      http.get(endpoints.pe.news, ({ request }) => {
        const url = new URL(request.url);
        latestPage = Number(url.searchParams.get('page') || 1);
        if (latestPage === 2) {
          return ok({
            cachedAt: Date.now(),
            distribution: 'weekly',
            page: 2,
            pageSize: 15,
            hasMore: false,
            items: [
              {
                title: 'Page two headline',
                url: 'https://example.com/page-two',
                source: 'example.com',
                snippet: '',
                age: null,
              },
            ],
          });
        }
        return ok({
          cachedAt: Date.now(),
          distribution: 'weekly',
          page: 1,
          pageSize: 15,
          hasMore: true,
          items: [
            {
              title: 'Page one headline',
              url: 'https://example.com/page-one',
              source: 'example.com',
              snippet: '',
              age: null,
            },
          ],
        });
      }),
    );

    function ControlledWidget() {
      const [query, setQuery] = React.useState({ ...DEFAULT_MARKET_NEWS_QUERY });
      return <NewsFeedWidget query={query} onQueryChange={setQuery} />;
    }

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ControlledWidget />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId('news-filters')).toBeInTheDocument();
    expect(await screen.findByText('Page one headline')).toBeInTheDocument();
    await user.click(screen.getByTestId('news-next'));
    expect(await screen.findByText('Page two headline')).toBeInTheDocument();
    expect(screen.getByTestId('news-page-label')).toHaveTextContent('Page 2');
    expect(latestPage).toBe(2);
  });

  it('has no axe violations on feed and missing-key states', async () => {
    const { container, unmount } = renderWidget();
    await screen.findByTestId('news-list');
    expect(await axe(container)).toHaveNoViolations();
    unmount();

    server.use(http.get(endpoints.pe.news, () => ok(mockMarketNewsMissingKey)));
    const again = renderWidget();
    await screen.findByTestId('news-missing-key');
    expect(await axe(again.container)).toHaveNoViolations();
  });
});
