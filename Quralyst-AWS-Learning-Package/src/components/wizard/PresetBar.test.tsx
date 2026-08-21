// PresetBar (F7) — save current criteria as a named preset, then load it back.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { resetSearchTemplatesStore } from '@/test/mocks/handlers/searchTemplates';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import PresetBar from './PresetBar';
import type { TemplateCriteria } from '@/services/api';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSearchTemplatesStore();
});
afterAll(() => server.close());

function renderBar(onLoad: (c: TemplateCriteria) => void, current: TemplateCriteria) {
  return render(
    <ToastProvider>
      <PresetBar mode="target" getCurrentCriteria={() => current} onLoad={onLoad} />
    </ToastProvider>,
  );
}

describe('PresetBar', () => {
  it('saves the current criteria as a preset and lists it', async () => {
    const user = userEvent.setup();
    renderBar(() => {}, { businessQuery: ['IT'], sizeMin: 5 });

    await user.click(screen.getByRole('button', { name: /save current/i }));
    await user.type(screen.getByLabelText(/preset name/i), 'IT preset');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    // It appears in the dropdown.
    const select = screen.getByLabelText(/load a saved preset/i);
    await waitFor(() => expect(within(select).getByText('IT preset')).toBeInTheDocument());
  });

  it('loading a preset passes its criteria to onLoad', async () => {
    const user = userEvent.setup();
    const loaded: TemplateCriteria[] = [];
    // First save a preset with known criteria.
    renderBar((c) => loaded.push(c), { businessQuery: ['Healthcare'], sizeMin: 10 });
    await user.click(screen.getByRole('button', { name: /save current/i }));
    await user.type(screen.getByLabelText(/preset name/i), 'HC');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    const select = await screen.findByLabelText(/load a saved preset/i);
    await waitFor(() => within(select).getByText('HC'));
    // Select it → onLoad fires with the saved criteria.
    await user.selectOptions(select, within(select).getByText('HC').getAttribute('value')!);
    await waitFor(() => expect(loaded.length).toBe(1));
    expect(loaded[0]).toEqual({ businessQuery: ['Healthcare'], sizeMin: 10 });
  });
});
