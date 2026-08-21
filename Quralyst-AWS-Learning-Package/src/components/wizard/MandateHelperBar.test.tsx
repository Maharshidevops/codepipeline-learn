// MandateHelperBar (F10) — website + PDF description helpers feed the wizard via callbacks.
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import MandateHelperBar from './MandateHelperBar';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderBar(overrides?: {
  onDescription?: (t: string) => void;
  onSuggestedIndustry?: (i: string) => void;
}) {
  const onDescription = overrides?.onDescription ?? vi.fn();
  const onSuggestedIndustry = overrides?.onSuggestedIndustry ?? vi.fn();
  render(
    <ToastProvider>
      <MandateHelperBar onDescription={onDescription} onSuggestedIndustry={onSuggestedIndustry} />
    </ToastProvider>,
  );
  return { onDescription, onSuggestedIndustry };
}

describe('MandateHelperBar', () => {
  it('describes from an inline website URL and returns a description + suggested industry', async () => {
    const user = userEvent.setup();
    const onDescription = vi.fn();
    const onSuggestedIndustry = vi.fn();
    renderBar({ onDescription, onSuggestedIndustry });

    await user.type(screen.getByLabelText(/company website url/i), 'https://acme.example.com');
    await user.click(screen.getByRole('button', { name: /from website/i }));

    await waitFor(() => expect(onDescription).toHaveBeenCalledTimes(1));
    expect(onDescription.mock.calls[0][0]).toMatch(/vertical saas/i);
    expect(onSuggestedIndustry).toHaveBeenCalledWith('Software');
  });

  it('describes from an uploaded PDF', async () => {
    const user = userEvent.setup();
    const onDescription = vi.fn();
    renderBar({ onDescription });

    const file = new File(['%PDF-1.4 ...'], 'mandate.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/upload a pdf to describe/i), file);

    await waitFor(() => expect(onDescription).toHaveBeenCalledTimes(1));
    expect(onDescription.mock.calls[0][0]).toMatch(/uploaded pdf/i);
  });

  it('does not call the backend when the URL is blank', async () => {
    const user = userEvent.setup();
    const onDescription = vi.fn();
    renderBar({ onDescription });

    // Button is disabled when the URL is blank — still assert no description is written.
    expect(screen.getByRole('button', { name: /from website/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /from website/i }));
    expect(onDescription).not.toHaveBeenCalled();
  });
});
