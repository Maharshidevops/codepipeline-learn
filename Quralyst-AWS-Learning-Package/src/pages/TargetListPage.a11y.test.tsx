// TargetListPage axe audit (Phase 35 a11y automation): render the wizard at Step 1 (Business
// Criteria — textarea field array, Industry/Sub-Industry custom Selects, radio groups) and assert
// zero axe-core violations. The page probes API-key status on mount (useApiKeyStatus → React Query),
// so it needs a QueryClientProvider; draft comes from localStorage, ToastProvider for the toasts.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'vitest-axe';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import TargetListPage from './TargetListPage';

beforeEach(() => {
  // Wizard drafts persist to localStorage — start each run from the defaults.
  window.localStorage.clear();
});

describe('TargetListPage a11y', () => {
  it('has no axe violations on wizard step 1', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            <TargetListPage />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Step 1 content is on screen.
    await screen.findByText(/what are you looking for/i);

    expect(await axe(container)).toHaveNoViolations();
  });
});
