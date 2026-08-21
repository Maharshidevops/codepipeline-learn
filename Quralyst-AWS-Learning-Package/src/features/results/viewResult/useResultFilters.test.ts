// useResultFilters: search filters rows; sortColumn reorders them (numeric-aware).
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useResultFilters, EMPTY_FILTERS } from './useResultFilters';

const COLUMNS = ['Company Name', 'Employees', 'Revenue', 'Fit Status'];
const ROWS = [
  { 'Company Name': 'Alpha', Employees: '100', Revenue: '10', 'Fit Status': 'Fit' },
  { 'Company Name': 'Beta', Employees: '50', Revenue: '20', 'Fit Status': 'No Fit' },
  { 'Company Name': 'Gamma', Employees: '200', Revenue: '5', 'Fit Status': 'Partial Fit' },
];

const names = (rows: Record<string, string>[]) => rows.map((r) => r['Company Name']);

describe('useResultFilters', () => {
  it('filters rows by company-name search', () => {
    const { result } = renderHook(() => useResultFilters(COLUMNS, ROWS));

    expect(result.current.filteredRows).toHaveLength(3);

    act(() => result.current.setFilters({ ...EMPTY_FILTERS, search: 'al' }));

    expect(names(result.current.filteredRows)).toEqual(['Alpha']);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('sorts numerically by employees ascending and descending', () => {
    const { result } = renderHook(() => useResultFilters(COLUMNS, ROWS));

    act(() =>
      result.current.setFilters({
        ...EMPTY_FILTERS,
        sortColumn: 'employees',
        sortDirection: 'asc',
      }),
    );
    expect(names(result.current.filteredRows)).toEqual(['Beta', 'Alpha', 'Gamma']);

    act(() =>
      result.current.setFilters({
        ...EMPTY_FILTERS,
        sortColumn: 'employees',
        sortDirection: 'desc',
      }),
    );
    expect(names(result.current.filteredRows)).toEqual(['Gamma', 'Alpha', 'Beta']);
  });
});
