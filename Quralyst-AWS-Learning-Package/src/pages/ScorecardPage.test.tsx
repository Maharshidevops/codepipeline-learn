// ScorecardPage (Tier A / A5) — renders the enriched Outcome Scorecard against the MSW fixture,
// proving the KPI cards, calibration matrix, score-band table, won-rank chips, and per-run table
// all wire up to the scorecard contract.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import ScorecardPage from './ScorecardPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <ScorecardPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('ScorecardPage', () => {
  it('renders the KPI cards, calibration, score bands, win-rank chips and per-run table', async () => {
    renderPage();

    // Title + KPI cards (won=3, lost=2, win rate 60%, progression 50%, 1 run)
    expect(await screen.findByRole('heading', { name: 'Scorecard' })).toBeInTheDocument();
    // Unique KPI-card labels ("Win rate" alone also matches column headers, so assert these).
    expect(screen.getByText('Closed / Won')).toBeInTheDocument();
    expect(screen.getByText('Lost / Dead')).toBeInTheDocument();
    expect(screen.getByText('Runs w/ outcomes')).toBeInTheDocument();
    // 60% (win rate) appears in the KPI + matrix + run row — just prove it rendered somewhere.
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0);

    // Calibration matrix rows
    expect(screen.getByText('Predicted: Fit')).toBeInTheDocument();
    expect(screen.getByText('Predicted: No fit')).toBeInTheDocument();

    // Score-band + win-rank sections
    expect(screen.getByText('Outcomes by score band')).toBeInTheDocument();
    expect(screen.getByText('Original rank of eventual wins')).toBeInTheDocument();

    // Per-run table row shows the buyer-list title
    expect(screen.getByText('IT Services — US')).toBeInTheDocument();
  });

  it('expands a run row to reveal its detail + open-buyer-list link', async () => {
    const user = userEvent.setup();
    renderPage();

    const runCell = await screen.findByText('IT Services — US');
    await user.click(runCell);

    // The expanded panel exposes the progression line and a link to the result page.
    expect(await screen.findByText(/Progression rate:/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Open buyer list/i });
    expect(link).toHaveAttribute('href', '/quralyst-research/result/run1/data');
  });
});
