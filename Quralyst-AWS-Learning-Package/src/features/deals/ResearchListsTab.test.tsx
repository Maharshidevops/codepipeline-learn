// F19 — Research Lists tab + Link-to-deal control (MSW-backed).
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { resetDealBriefsLinks } from '@/test/mocks/handlers/deals';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { Deal } from '@/services/api';
import ResearchListsTab from './ResearchListsTab';
import DealLinkControl from './DealLinkControl';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetDealBriefsLinks();
});
afterAll(() => server.close());

const DEAL: Deal = {
  id: 'deal_1',
  name: 'Project Falcon',
  dealType: 'sell_side',
  description: '',
  status: 'active',
  leadUserId: 'u1',
  yourRole: 'lead',
  stages: [],
  members: [{ userId: 'u1', name: 'R', email: '', role: 'lead' }],
  createdAt: null,
  updatedAt: null,
};

function withProviders(ui: React.ReactNode) {
  return (
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );
}

describe('ResearchListsTab', () => {
  it('shows empty states for brief and linked lists', async () => {
    render(withProviders(<ResearchListsTab deal={DEAL} />));
    expect(
      await screen.findByText(/no research lists linked to this deal yet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /attach brief/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /target list/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /strategic buyers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /financial buyers/i })).toBeInTheDocument();
    expect(
      screen.getByText(/lists built here are saved as research under this deal/i),
    ).toBeInTheDocument();
  });
});

describe('DealLinkControl', () => {
  it('links a list to a deal and shows it as already linked', async () => {
    const user = userEvent.setup();
    render(withProviders(<DealLinkControl resultId="res_1" />));

    await user.click(screen.getByRole('button', { name: /link to deal/i }));
    // Deal select populated from the seeded deal.
    expect(await screen.findByRole('combobox')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^link$/i }));

    // After linking, the deal appears under "Already linked to".
    await waitFor(() => expect(screen.getByText(/already linked to/i)).toBeInTheDocument());
    expect(screen.getAllByText(/project falcon/i).length).toBeGreaterThan(0);
  });
});
