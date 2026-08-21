// Deals list (F17) — renders member-scoped deals + create flow navigates to the new workspace.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { resetDealsStore } from '@/test/mocks/handlers/deals';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { paths } from '@/routes/paths';
import DealsListPage from './DealsListPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetDealsStore();
});
afterAll(() => server.close());

function renderList() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[paths.deals]}>
        <Routes>
          <Route path={paths.deals} element={<DealsListPage />} />
          <Route path="/deals/:dealId" element={<div>DEAL WORKSPACE</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('DealsListPage', () => {
  it('lists the user’s deals', async () => {
    renderList();
    expect(await screen.findByText('Project Falcon')).toBeInTheDocument();
  });

  it('creates a deal and navigates to its workspace', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText('Project Falcon');

    await user.click(screen.getByRole('button', { name: /new deal/i }));
    await user.type(screen.getByLabelText(/deal name/i), 'Project Owl');
    await user.click(screen.getByRole('button', { name: /^create deal$/i }));

    expect(await screen.findByText('DEAL WORKSPACE')).toBeInTheDocument();
  });
});
