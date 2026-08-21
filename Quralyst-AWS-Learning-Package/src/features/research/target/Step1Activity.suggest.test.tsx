// Target Step 1 (F10) — blurring the business query auto-suggests an industry when none is set.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import Step1Activity from './Step1Activity';
import { industryList, subIndustryMap } from '@/data/subIndustryMap';
import type { TargetListForm } from '@/types';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function Harness() {
  const { control, setValue, getValues } = useForm<TargetListForm>({
    defaultValues: {
      businessQuery: [{ value: '' }],
      industry: '',
      subIndustry: '',
      primaryActivity: '',
      secondaryActivity: '',
      primaryBusinessOnly: false,
      skipWebsiteScraping: false,
    } as Partial<TargetListForm> as TargetListForm,
  });
  return (
    <ToastProvider>
      <Step1Activity control={control} setValue={setValue} getValues={getValues} />
    </ToastProvider>
  );
}

describe('Target Step 1 — industry suggestion on blur', () => {
  it('fills the industry select from the description when empty', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Industry combobox starts on its placeholder.
    expect(screen.getByRole('combobox', { name: 'Industry' })).toHaveTextContent(/industry/i);

    const query = screen.getByLabelText('Target profile 1');
    await user.type(query, 'dental clinic scheduling saas');
    await user.tab(); // blur → suggest-industry

    // The mock echoes the first supplied industry; the Select now shows that label. Re-query the
    // combobox each tick (the Select re-renders when it gains a value).
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Industry' })).toHaveTextContent(industryList[0]),
    );

    // Sub-Industry auto-fills too (first sub of that industry from the mock).
    const firstSub = subIndustryMap[industryList[0]][0];
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Sub-industry' })).toHaveTextContent(firstSub),
    );
  });
});
