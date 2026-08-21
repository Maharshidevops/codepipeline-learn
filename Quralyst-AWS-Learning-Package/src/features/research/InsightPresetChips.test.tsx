// InsightPresetChips (F13) — renders preset chips and adds a question label on click.
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import InsightPresetChips from './InsightPresetChips';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('InsightPresetChips', () => {
  it('loads presets and adds a question label when a chip is clicked', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<InsightPresetChips onAdd={onAdd} />);

    const chip = await screen.findByRole('button', { name: /recurring revenue\?/i });
    await user.click(chip);
    expect(onAdd).toHaveBeenCalledWith('Recurring revenue?');
  });

  it('renders nothing when presets fail to load', async () => {
    server.use(
      http.get(endpoints.customInsights.presets, () => new Response(null, { status: 500 })),
    );
    const { container } = render(<InsightPresetChips onAdd={vi.fn()} />);
    // Give the failed fetch a tick; component should stay empty.
    await waitFor(() => expect(container.querySelector('button')).toBeNull());
  });
});
