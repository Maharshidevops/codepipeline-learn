// Strategic Step 1 (F10) — "Enhance target description" rewrites targetDescription in place.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import Step1Attributes from './Step1Attributes';
import type { StrategicForm } from '@/types';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function Harness() {
  const form = useForm<StrategicForm>({
    defaultValues: {
      businessQuery: [{ value: '' }],
      industry: '',
      subIndustry: '',
      primaryActivity: '',
      secondaryActivity: '',
      buyerHorizontal: false,
      buyerVertical: false,
      buyerAdjacent: false,
      useRecommendedBuyer: false,
      // preset so the editable targetDescription textarea + Enhance button render
      targetDescription: 'A dental SaaS platform.',
    } as Partial<StrategicForm> as StrategicForm,
  });
  return (
    <ToastProvider>
      <Step1Attributes form={form} />
    </ToastProvider>
  );
}

describe('Strategic Step 1 — enhance target description', () => {
  it('replaces the target description with the enhanced text', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const textarea = screen.getByPlaceholderText(/ideal buyer type/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('A dental SaaS platform.');

    await user.click(screen.getByRole('button', { name: /enhance target description/i }));

    await waitFor(() => expect(textarea.value).toMatch(/expanded with adjacent categories/i));
    expect(textarea.value).toContain('A dental SaaS platform.');
  });
});
