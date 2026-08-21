import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Select from './Select';

const sampleOptions = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IN', label: 'India' },
  { value: 'JP', label: 'Japan' },
  { value: 'UK', label: 'United Kingdom' },
];

describe('Select Search', () => {
  it('allows user to type into search input and live filter options', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Select
        value=""
        onChange={handleChange}
        options={sampleOptions}
        placeholder="Select Country"
      />
    );

    // Open dropdown
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // Find search input
    const searchInput = screen.getByRole('searchbox', { name: /search options/i });
    expect(searchInput).toBeInTheDocument();

    // Type into search input
    await user.type(searchInput, 'United');

    expect(searchInput).toHaveValue('United');
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    expect(screen.queryByText('Canada')).not.toBeInTheDocument();
    expect(screen.queryByText('Germany')).not.toBeInTheDocument();
  });
});
