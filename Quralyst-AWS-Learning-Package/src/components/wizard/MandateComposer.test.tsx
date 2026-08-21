// MandateComposer (F11) — parsing a pasted mandate stores the prefill and navigates to the wizard.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { paths } from '@/routes/paths';
import { takeComposerPrefill } from '@/features/research/composerPrefill';
import MandateComposer from './MandateComposer';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  sessionStorage.clear();
});
afterAll(() => server.close());

function renderComposer() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[paths.processPreference]}>
        <Routes>
          <Route path={paths.processPreference} element={<MandateComposer />} />
          <Route path={paths.targetList} element={<div>TARGET WIZARD</div>} />
          <Route path={paths.strategic} element={<div>STRATEGIC WIZARD</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('MandateComposer', () => {
  it('parses pasted text, stores the prefill, and navigates to the Target wizard', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(
      screen.getByLabelText('Mandate text'),
      'Acquire HVAC services firms, $5-15M revenue.',
    );
    await user.click(screen.getByRole('button', { name: /parse & prefill/i }));

    // Navigated to the target wizard...
    expect(await screen.findByText('TARGET WIZARD')).toBeInTheDocument();
    // ...and the parsed prefill was stashed for the wizard to consume.
    const stored = takeComposerPrefill();
    expect(stored?.industry).toBe('Financial Services');
    expect(stored?.revenue_min).toBe(5000000);
  });

  it('blocks parsing when nothing was provided', async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.click(screen.getByRole('button', { name: /parse & prefill/i }));
    expect(
      await screen.findByText(/paste some text, add a file, or a url first/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('TARGET WIZARD')).not.toBeInTheDocument();
  });
});
