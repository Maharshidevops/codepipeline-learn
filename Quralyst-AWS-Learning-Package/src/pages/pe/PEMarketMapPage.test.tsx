// PE Market Map page tests (F38.2).
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import PEMarketMapPage from './PEMarketMapPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage(entry = '/pe/market-map') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entry]}>
        <PEMarketMapPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PEMarketMapPage', () => {
  it('does not fetch buyers until a sector is chosen', async () => {
    renderPage();
    expect(await screen.findByTestId('mm-pick-sector')).toBeInTheDocument();
    expect(screen.queryByTestId('mm-buyer-row')).not.toBeInTheDocument();
  });

  it('loads ranked buyers when sector is set', async () => {
    renderPage('/pe/market-map?sector=Healthcare');
    expect(await screen.findByTestId('mm-total')).toHaveTextContent('3 buyers');
    expect(screen.getByTestId('mm-consolidators')).toHaveTextContent('1 consolidators');
    const rows = screen.getAllByTestId('mm-buyer-row');
    expect(rows.length).toBe(3);
    expect(within(rows[0]).getByTestId('mm-consolidator')).toHaveTextContent('3 deals');
    expect(within(rows[0]).getByTestId('mm-firm-reasons')).toHaveTextContent(
      /High acquisition appetite/i,
    );
    expect(within(rows[0]).getByTestId('mm-sector-deals')).toHaveTextContent('3');
    expect(within(rows[0]).getByTestId('mm-sector-deals')).toHaveTextContent('90%');
    expect(within(rows[0]).getByTestId('mm-last-buy')).toHaveTextContent('2026');
    expect(within(rows[0]).getByTestId('mm-likelihood')).toBeInTheDocument();
    expect(screen.queryByTestId('mm-fit')).not.toBeInTheDocument();
    expect(screen.getByTestId('mm-screener-link')).toHaveAttribute(
      'href',
      '/pe/screener?sector=Healthcare',
    );
    expect(screen.getByRole('link', { name: 'Active Capital' })).toHaveAttribute(
      'href',
      '/pe/firms/pef1',
    );
  });

  it('shows check-size column when a size segment is selected', async () => {
    renderPage('/pe/market-map?sector=Healthcare&segment=middle-market');
    await screen.findByTestId('mm-total');
    expect(screen.getByRole('columnheader', { name: 'Check-size fit' })).toBeInTheDocument();
    expect(screen.getAllByTestId('mm-fit').length).toBeGreaterThan(0);
  });

  it('shows empty state for no-match geo', async () => {
    renderPage('/pe/market-map?sector=Healthcare&geo=Midwest+US');
    expect(await screen.findByTestId('mm-buyers-empty')).toBeInTheDocument();
  });

  it('renders whitespace grid with intensity classes', async () => {
    renderPage();
    const scores = await screen.findAllByTestId('mm-ws-score');
    expect(scores[0]).toHaveAttribute('data-intensity', 'mm-heat-high');
    expect(scores[1]).toHaveAttribute('data-intensity', 'mm-heat-mid');
    expect(scores[2]).toHaveAttribute('data-intensity', 'mm-heat-low');
  });

  it('has no axe violations on buyers view', async () => {
    const { container } = renderPage('/pe/market-map?sector=Healthcare');
    await screen.findByTestId('mm-total');
    expect(await axe(container)).toHaveNoViolations();
  });
});
