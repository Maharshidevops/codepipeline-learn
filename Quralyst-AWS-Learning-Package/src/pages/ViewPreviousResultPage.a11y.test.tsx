// ViewPreviousResultPage (result Data tab) axe audit (Phase 35 a11y automation): render the
// heaviest data surface against MSW (result detail + summary meta + comments, same pattern as
// CommentModal.test.tsx), and assert zero axe-core violations.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { CellModalProvider } from '@/components/ui';
import ViewPreviousResultPage from './ViewPreviousResultPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

function renderDataTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <CellModalProvider>
          <MemoryRouter initialEntries={['/quralyst-research/result/tl_1/data']}>
            <Routes>
              <Route
                path="/quralyst-research/result/:resultId/data"
                element={<ViewPreviousResultPage />}
              />
            </Routes>
          </MemoryRouter>
        </CellModalProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ViewPreviousResultPage (Data tab) a11y', () => {
  it('has no axe violations with the results table rendered', async () => {
    const { container } = renderDataTab();

    // Table data loaded (fixture rows are "Acme N Inc.").
    await screen.findAllByText(/acme 1 inc/i);

    expect(await axe(container)).toHaveNoViolations();
  }, 30000);
});
