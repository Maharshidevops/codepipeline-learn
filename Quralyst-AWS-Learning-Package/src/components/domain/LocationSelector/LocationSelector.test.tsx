// LocationSelector: Add appends a blank row; Remove drops a row — both via onChange (controlled).
// City suggestions use the custom .city-suggestions menu (not native datalist).
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { setupServer } from 'msw/node';
import { locationHandlers } from '@/test/mocks/handlers/location';
import LocationSelector from './LocationSelector';
import type { LocationGroup } from '@/types';

const server = setupServer(...locationHandlers);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const oneRow: LocationGroup[] = [{ continent: '', country: '', state: '', city: '' }];
const twoRows: LocationGroup[] = [
  { continent: '', country: 'United States', state: '', city: '' },
  { continent: '', country: 'Canada', state: '', city: '' },
];
const rowWithState: LocationGroup[] = [
  { continent: 'Asia', country: 'India', state: 'Karnataka', city: '' },
];

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('LocationSelector', () => {
  it('adds a blank row via onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<LocationSelector value={oneRow} onChange={onChange} />, { wrapper });

    await user.click(screen.getByRole('button', { name: /add location/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(2);
  });

  it('removes a row via onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<LocationSelector value={twoRows} onChange={onChange} />, { wrapper });

    const removeButtons = screen.getAllByTitle('Remove location');
    expect(removeButtons).toHaveLength(2);

    await user.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as LocationGroup[];
    expect(next).toHaveLength(1);
    expect(next[0].country).toBe('Canada');
  });

  it('shows custom city suggestions under the City input and selects one', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<LocationSelector value={rowWithState} onChange={onChange} />, { wrapper });

    const cityInput = screen.getByRole('textbox', { name: /city/i });
    await user.click(cityInput);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Bengaluru' })).toBeInTheDocument();
    });

    const list = screen.getByRole('listbox', { name: /city suggestions/i });
    expect(list).toHaveClass('city-suggestions', 'show');
    expect(list.closest('.city-input-wrapper')).toContainElement(cityInput);

    await user.click(screen.getByRole('option', { name: 'Bengaluru' }));

    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)![0] as LocationGroup[];
    expect(next[0].city).toBe('Bengaluru');
  });
});
