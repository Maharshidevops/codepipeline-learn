// Deal workspace (F17) — loads a deal, shows tabs, and (as lead) can add a member in Settings.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { resetDealsStore } from '@/test/mocks/handlers/deals';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import DealWorkspacePage from './DealWorkspacePage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetDealsStore();
});
afterAll(() => server.close());

function renderWorkspace() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/deals/deal_1']}>
        <Routes>
          <Route path="/deals/:dealId" element={<DealWorkspacePage />} />
          <Route path="/deals" element={<div>ALL DEALS</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('DealWorkspacePage', () => {
  it('loads the deal and shows the pipeline stages + tabs', async () => {
    renderWorkspace();
    expect(await screen.findByRole('heading', { name: 'Project Falcon' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /buyer log/i })).toBeInTheDocument(); // sell-side
  });

  it('lets the lead add a member by searching name/email (Fix 2)', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Project Falcon' });

    await user.click(screen.getByRole('button', { name: /settings/i }));
    const settings = screen.getByRole('dialog', { name: /deal settings/i });
    // Search by name → pick from the dropdown (no raw user id needed).
    await user.type(screen.getByLabelText(/add member — search by name or email/i), 'Karan');
    await user.click(await screen.findByRole('button', { name: /karan parmar/i }));

    // Display name appears in the settings members list (not the raw user id).
    expect(await within(settings).findByText('Karan Parmar')).toBeInTheDocument();
  });
});
