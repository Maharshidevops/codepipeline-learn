// Analyst Preferences — the "Learned by the system" card lets a user remove a fit correction /
// outcome they disagree with (and clear a whole list). Behavioral frequent-* lists have no delete.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { memoryHandlers, seedMemoryStore, resetMemoryStore } from '@/test/mocks/handlers/memory';
import { err } from '@/test/mocks/envelope';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import AnalystPreferencesPage from './AnalystPreferencesPage';

const server = setupServer(
  ...memoryHandlers,
  // No org for this user → org-memory 403 (page tolerates it via Promise.allSettled).
  http.get('/api/org-memory', () => err(403, 'No organization.')),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMemoryStore();
});
afterAll(() => server.close());

const renderPage = () =>
  render(
    <ToastProvider>
      <AnalystPreferencesPage />
    </ToastProvider>,
  );

describe('Analyst Preferences — Learned by the system', () => {
  it('removes a single fit correction and clears all outcomes', async () => {
    const user = userEvent.setup();
    seedMemoryStore({
      fit_corrections: ['Demoted Fit → No Fit: Acme', 'Promoted No Fit → Fit: Beta'],
      outcome_signals: ['Closed Won: Gamma', 'Closed Lost: Delta'],
      frequent_sectors: ['HVAC'], // has NO delete control
    });
    renderPage();

    // The learned card renders both correction items.
    expect(await screen.findByText('Demoted Fit → No Fit: Acme')).toBeInTheDocument();
    const acme = screen.getByText('Demoted Fit → No Fit: Acme').closest('li') as HTMLElement;

    // Remove just the Acme correction.
    await user.click(
      within(acme).getByRole('button', { name: /remove: demoted fit → no fit: acme/i }),
    );
    await waitFor(() =>
      expect(screen.queryByText('Demoted Fit → No Fit: Acme')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Promoted No Fit → Fit: Beta')).toBeInTheDocument(); // sibling kept

    // Clear all real-world outcomes (the header's flex row holds the label + the Clear-all button).
    const outcomesHeader = screen.getByText('Real-world outcomes').parentElement as HTMLElement;
    await user.click(within(outcomesHeader).getByRole('button', { name: /clear all/i }));
    await waitFor(() => expect(screen.queryByText('Closed Won: Gamma')).not.toBeInTheDocument());
    expect(screen.queryByText('Closed Lost: Delta')).not.toBeInTheDocument();

    // The behavioral frequent-sectors list has no delete/clear affordance.
    const hvac = screen.getByText('HVAC').closest('li') as HTMLElement;
    expect(within(hvac).queryByRole('button')).toBeNull();
  });
});
