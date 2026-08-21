// useResultFilters — client-side filter + sort engine for the results grid, a faithful port of the
// applyFiltersAndSort / parseNumericValue / sort logic in
// Backup/templates/quralyst_research/view_previous_result.html (lines 1455-1546). Operates on the
// data-driven Record<string,string> rows: it resolves the relevant columns by fuzzy header match
// (the same mapping the legacy columnIndices builder used) so it works regardless of column order.
import { useMemo, useState } from 'react';

export interface ResultFilterState {
  search: string;
  fitStatus: string;
  source: string;
  country: string;
  minEmployees: string;
  maxEmployees: string;
  minRevenue: string;
  maxRevenue: string;
  minScore: string;
  maxScore: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

export const EMPTY_FILTERS: ResultFilterState = {
  search: '',
  fitStatus: '',
  source: '',
  country: '',
  minEmployees: '',
  maxEmployees: '',
  minRevenue: '',
  maxRevenue: '',
  minScore: '',
  maxScore: '',
  sortColumn: '',
  sortDirection: 'asc',
};

type Row = Record<string, string>;

// Parse "$10,000,000", "320", "55.2M" → number, mirroring parseNumericValue.
function parseNumericValue(value: string | undefined): number | null {
  if (!value || value === '' || value === '-' || value === 'N/A') return null;
  const cleaned = value.replace(/[$,MmKk\s]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function findCol(columns: string[], pred: (h: string) => boolean): string | undefined {
  return columns.find((col) => pred(col.trim().toLowerCase()));
}

// Fuzzy header → logical-field resolver (matches the legacy columnIndices mapping + current FE labels).
function resolveColumns(columns: string[]) {
  const map: Record<string, string> = {};

  const company = findCol(
    columns,
    (h) => h.includes('company name') || h === 'company' || h === 'company_name',
  );
  if (company) map.company_name = company;

  const revenue = findCol(columns, (h) => h.includes('revenue'));
  if (revenue) map.revenue = revenue;

  const employees = findCol(columns, (h) => h.includes('employee'));
  if (employees) map.employees = employees;

  const score = findCol(
    columns,
    (h) =>
      h === 'total score' ||
      h === 'overall score' ||
      h === 'final score' ||
      h === 'score' ||
      h.includes('total score'),
  );
  if (score) map.score = score;

  const businessScore = findCol(columns, (h) => h.includes('business score'));
  if (businessScore) map.business_score = businessScore;

  const geoScore = findCol(
    columns,
    (h) => h.includes('geography score') || (h.includes('geographic') && h.includes('score')),
  );
  if (geoScore) map.geography_score = geoScore;

  const sizeScore = findCol(
    columns,
    (h) => h.includes('size score') || (h.includes('size fit') && h.includes('score')),
  );
  if (sizeScore) map.size_scores = sizeScore;

  // Prefer explicit fit verdict columns — never "Business Fit" / "Size Fit".
  const fit =
    findCol(
      columns,
      (h) =>
        h === 'fit/no fit' ||
        h === 'fit verdict' ||
        h === 'fit status' ||
        h === 'fit' ||
        h === 'fit_no_fit',
    ) ||
    findCol(
      columns,
      (h) =>
        h.includes('fit') &&
        !h.includes('business') &&
        !h.includes('size') &&
        !h.includes('geo') &&
        !h.includes('score') &&
        !h.includes('rationale'),
    );
  if (fit) map.fit_status = fit;

  const source = findCol(columns, (h) => h.includes('source'));
  if (source) map.source = source;

  const country = findCol(columns, (h) => h === 'country');
  if (country) map.country = country;

  const city = findCol(columns, (h) => h === 'city');
  if (city) map.city = city;

  const state = findCol(columns, (h) => h === 'state');
  if (state) map.state = state;

  return map;
}

function rowGet(row: Row, colMap: Record<string, string>, key: string, fallbacks: string[] = []) {
  const mapped = colMap[key];
  if (mapped && row[mapped] != null && String(row[mapped]).trim() !== '') {
    return String(row[mapped]).trim();
  }
  for (const fb of fallbacks) {
    if (row[fb] != null && String(row[fb]).trim() !== '') return String(row[fb]).trim();
  }
  return '';
}

function rowNum(row: Row, colMap: Record<string, string>, key: string, fallbacks: string[] = []) {
  const raw = rowGet(row, colMap, key, fallbacks);
  return parseNumericValue(raw || undefined);
}

/** Bucket fit when exact Fit/No Fit cell is missing (strategic lists). */
function fitMatches(row: Row, wanted: string, cell: string): boolean {
  const w = wanted.toLowerCase();
  if (cell) return cell.toLowerCase() === w;

  const raw = String(
    row['Fit/No Fit'] || row['Fit Verdict'] || row.fit_no_fit || row.Fit || '',
  ).toLowerCase();
  if (raw) {
    if (w === 'fit') return raw.includes('fit') && !raw.includes('no') && !raw.includes('partial');
    if (w === 'partial fit') return raw.includes('partial') || raw.includes('maybe');
    if (w === 'no fit') return raw.includes('no') && !raw.includes('partial');
    if (w === 'insufficient info') return raw.includes('insufficient');
    return raw === w;
  }

  // Score fallback (same thresholds as fitBucket).
  const score = rowNum(row, {}, 'score', ['Total Score', 'Overall Score', 'Score', 'score']) ?? 0;
  if (w === 'fit') return score >= 7;
  if (w === 'partial fit') return score >= 4 && score < 7;
  if (w === 'no fit' || w === 'insufficient info') return score < 4;
  return false;
}

export function useResultFilters(columns: string[], rows: Row[]) {
  const [filters, setFilters] = useState<ResultFilterState>(EMPTY_FILTERS);

  const colMap = useMemo(() => resolveColumns(columns), [columns]);

  const get = (row: Row, key: string) => {
    const fallbacks: Record<string, string[]> = {
      company_name: ['Company Name', 'Company', 'company_name'],
      revenue: ['Revenue ($M)', 'Revenue'],
      employees: ['Employees', 'Number of Employees'],
      score: ['Total Score', 'Overall Score', 'Score', 'score'],
      fit_status: ['Fit/No Fit', 'Fit Verdict', 'Fit', 'fit_no_fit'],
      source: ['Source Dataset', 'Source'],
      country: ['Country'],
      geography_score: ['Geographic Fit Score', 'Geography Score'],
      size_scores: ['Size Fit Score', 'Size Scores'],
      business_score: ['Business Score'],
    };
    return rowGet(row, colMap, key, fallbacks[key] ?? []);
  };

  const num = (row: Row, key: string) => {
    const fallbacks: Record<string, string[]> = {
      revenue: ['Revenue ($M)', 'Revenue'],
      employees: ['Employees', 'Number of Employees'],
      score: ['Total Score', 'Overall Score', 'Score', 'score'],
      geography_score: ['Geographic Fit Score', 'Geography Score'],
      size_scores: ['Size Fit Score', 'Size Scores'],
      business_score: ['Business Score'],
    };
    return rowNum(row, colMap, key, fallbacks[key] ?? []);
  };

  // Distinct values for the Source / Country dropdowns (template populateSource/CountryFilter).
  const sourceOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const v = get(r, 'source');
      if (v) s.add(v);
    });
    return Array.from(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, colMap]);

  const countryOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const v = get(r, 'country');
      if (v) s.add(v);
    });
    return Array.from(s).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, colMap]);

  const filteredRows = useMemo(() => {
    const f = filters;
    const search = f.search.toLowerCase();
    const minEmp = f.minEmployees ? parseFloat(f.minEmployees) : null;
    const maxEmp = f.maxEmployees ? parseFloat(f.maxEmployees) : null;
    const minRev = f.minRevenue ? parseFloat(f.minRevenue) : null;
    const maxRev = f.maxRevenue ? parseFloat(f.maxRevenue) : null;
    const minScore = f.minScore ? parseFloat(f.minScore) : null;
    const maxScore = f.maxScore ? parseFloat(f.maxScore) : null;

    let result = rows.filter((row) => {
      if (search && !get(row, 'company_name').toLowerCase().includes(search)) return false;
      if (f.fitStatus && !fitMatches(row, f.fitStatus, get(row, 'fit_status'))) return false;
      if (f.source && get(row, 'source') !== f.source) return false;
      if (f.country && get(row, 'country') !== f.country) return false;

      const emp = num(row, 'employees');
      if (minEmp !== null && (emp === null || emp < minEmp)) return false;
      if (maxEmp !== null && (emp === null || emp > maxEmp)) return false;

      const rev = num(row, 'revenue');
      if (minRev !== null && (rev === null || rev < minRev)) return false;
      if (maxRev !== null && (rev === null || rev > maxRev)) return false;

      const score = num(row, 'score');
      if (minScore !== null && (score === null || score < minScore)) return false;
      if (maxScore !== null && (score === null || score > maxScore)) return false;

      return true;
    });

    if (f.sortColumn) {
      const dir = f.sortDirection;
      const numericFields = ['revenue', 'employees', 'score', 'geography_score', 'size_scores'];
      const fitOrder: Record<string, number> = {
        fit: 1,
        'partial fit': 2,
        'insufficient info': 3,
        'no fit': 4,
      };
      result = [...result].sort((a, b) => {
        let comparison = 0;
        if (f.sortColumn === 'fit_status') {
          const va = fitOrder[get(a, 'fit_status').toLowerCase()] ?? 5;
          const vb = fitOrder[get(b, 'fit_status').toLowerCase()] ?? 5;
          comparison = va - vb;
        } else if (numericFields.includes(f.sortColumn)) {
          const va = num(a, f.sortColumn);
          const vb = num(b, f.sortColumn);
          if (va === null && vb === null) comparison = 0;
          else if (va === null) return dir === 'asc' ? 1 : -1;
          else if (vb === null) return dir === 'asc' ? -1 : 1;
          else comparison = va - vb;
        } else {
          comparison = get(a, f.sortColumn).localeCompare(get(b, f.sortColumn));
        }
        return dir === 'asc' ? comparison : -comparison;
      });
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, rows, colMap]);

  const hasActiveFilters =
    !!filters.search ||
    !!filters.fitStatus ||
    !!filters.source ||
    !!filters.country ||
    !!filters.minEmployees ||
    !!filters.maxEmployees ||
    !!filters.minRevenue ||
    !!filters.maxRevenue ||
    !!filters.minScore ||
    !!filters.maxScore ||
    !!filters.sortColumn;

  const reset = () => setFilters(EMPTY_FILTERS);

  return {
    filters,
    setFilters,
    filteredRows,
    sourceOptions,
    countryOptions,
    hasActiveFilters,
    reset,
  };
}
