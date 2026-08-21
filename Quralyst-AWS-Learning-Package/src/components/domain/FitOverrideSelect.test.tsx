// FitOverrideSelect (F6) — change verdict → rationale modal → save POSTs the override.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { handlers } from '@/test/mocks/handlers';
import { ok } from '@/test/mocks/envelope';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import FitOverrideSelect from './FitOverrideSelect';

let lastBody: { companyName?: string; newFit?: string; rationale?: string } | null = null;
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  lastBody = null;
});
afterAll(() => server.close());

// Runtime handler (server.use) takes priority over the initial ones, so this captures the body.
function captureFitOverride() {
  server.use(
    http.post('/api/results/:id/fit-override', async ({ request }) => {
      lastBody = (await request.json()) as typeof lastBody;
      return ok(
        { oldFit: 'No Fit', newFit: lastBody?.newFit ?? 'Fit', fitOverridden: true },
        {
          message: 'Fit updated.',
        },
      );
    }),
  );
}

function renderCell() {
  return render(
    <ToastProvider>
      <FitOverrideSelect resultId="tl_1" companyName="Acme Corp" value="No Fit" />
    </ToastProvider>,
  );
}

describe('FitOverrideSelect', () => {
  it('changing the verdict opens the rationale modal and saves the override', async () => {
    const user = userEvent.setup();
    captureFitOverride();
    renderCell();

    // Change the dropdown from No Fit → Fit.
    await user.selectOptions(screen.getByLabelText(/fit for acme corp/i), 'Fit');

    // Rationale modal appears.
    const modal = await screen.findByRole('dialog', { name: /confirm fit override/i });
    await user.type(
      within(modal).getByLabelText(/override rationale/i),
      'Recurring revenue is 70%',
    );
    await user.click(within(modal).getByRole('button', { name: /save override/i }));

    // POST fired with the new fit + rationale.
    await waitFor(() => expect(lastBody).not.toBeNull());
    expect(lastBody?.newFit).toBe('Fit');
    expect(lastBody?.rationale).toBe('Recurring revenue is 70%');
    // Modal closes.
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /confirm fit override/i })).toBeNull(),
    );
  });

  it('cancel does not save', async () => {
    const user = userEvent.setup();
    renderCell();
    await user.selectOptions(screen.getByLabelText(/fit for acme corp/i), 'Partial Fit');
    const modal = await screen.findByRole('dialog', { name: /confirm fit override/i });
    await user.click(within(modal).getByRole('button', { name: /cancel/i }));
    expect(lastBody).toBeNull();
  });
});
