// EnrichButton (F14) — starts enrichment, polls status, refreshes rows on completion.
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import EnrichButton from './EnrichButton';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('EnrichButton', () => {
  it('starts enrichment, shows progress, then refreshes on completion', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <ToastProvider>
        <EnrichButton resultId="r1" onComplete={onComplete} />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /enrich contacts/i }));

    // Enters running state (start returned status=running, total=3).
    expect(await screen.findByRole('button', { name: /enriching/i })).toBeInTheDocument();

    // Poll (2s interval) returns completed → onComplete fires and the button resets.
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(await screen.findByRole('button', { name: /enrich contacts/i })).toBeInTheDocument();
  });
});
