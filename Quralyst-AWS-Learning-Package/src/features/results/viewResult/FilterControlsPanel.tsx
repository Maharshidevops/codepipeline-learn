// FilterControlsPanel — the in-table Filters box (Backup/templates/quralyst_research/
// view_previous_result.html lines 192-287). Renders the search / fit-status / source / country
// selects, the employee / revenue / score range inputs, the sort controls, and the active-filters
// tag bar. Pure controlled component: all state lives in the parent via useResultFilters.
import type { ResultFilterState } from './useResultFilters';

interface FilterControlsPanelProps {
  filters: ResultFilterState;
  setFilters: React.Dispatch<React.SetStateAction<ResultFilterState>>;
  sourceOptions: string[];
  countryOptions: string[];
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Default' },
  { value: 'company_name', label: 'Company Name' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'employees', label: 'Employees' },
  { value: 'score', label: 'Score' },
  { value: 'geography_score', label: 'Geography Score' },
  { value: 'size_scores', label: 'Size Scores' },
  { value: 'fit_status', label: 'Fit Status' },
  { value: 'country', label: 'Country' },
  { value: 'source', label: 'Source' },
];

const SORT_LABELS: Record<string, string> = {
  company_name: 'Company Name',
  revenue: 'Revenue ($M)',
  employees: 'Employees',
  score: 'Score',
  business_score: 'Business Score',
  geography_score: 'Geography Score',
  size_scores: 'Size Scores',
  fit_status: 'Fit Status',
  country: 'Country',
  source: 'Source',
};

export default function FilterControlsPanel({
  filters,
  setFilters,
  sourceOptions,
  countryOptions,
}: FilterControlsPanelProps) {
  const set = <K extends keyof ResultFilterState>(key: K, value: ResultFilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  // Build the active-filter tags (label + the field clearer) like updateActiveFiltersDisplay.
  const tags: { label: string; clear: () => void }[] = [];
  if (filters.search)
    tags.push({ label: `Search: "${filters.search}"`, clear: () => set('search', '') });
  if (filters.fitStatus)
    tags.push({ label: `Status: ${filters.fitStatus}`, clear: () => set('fitStatus', '') });
  if (filters.source)
    tags.push({ label: `Source: ${filters.source}`, clear: () => set('source', '') });
  if (filters.country)
    tags.push({ label: `Country: ${filters.country}`, clear: () => set('country', '') });
  if (filters.minEmployees || filters.maxEmployees)
    tags.push({
      label: `Employees: ${filters.minEmployees || '0'} - ${filters.maxEmployees || '∞'}`,
      clear: () => setFilters((p) => ({ ...p, minEmployees: '', maxEmployees: '' })),
    });
  if (filters.minRevenue || filters.maxRevenue)
    tags.push({
      label: `Revenue ($M): $${filters.minRevenue || '0'}M - $${filters.maxRevenue || '∞'}M`,
      clear: () => setFilters((p) => ({ ...p, minRevenue: '', maxRevenue: '' })),
    });
  if (filters.minScore || filters.maxScore)
    tags.push({
      label: `Score: ${filters.minScore || '1'} - ${filters.maxScore || '100'}`,
      clear: () => setFilters((p) => ({ ...p, minScore: '', maxScore: '' })),
    });
  if (filters.sortColumn)
    tags.push({
      label: `Sort: ${SORT_LABELS[filters.sortColumn] || filters.sortColumn} (${filters.sortDirection})`,
      clear: () => setFilters((p) => ({ ...p, sortColumn: '', sortDirection: 'asc' })),
    });

  return (
    <div className="filter-controls-panel" id="filter-controls-panel">
      <div className="filter-controls-grid">
        {/* Search */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="search-filter">
            <i className="bi bi-search me-1" />
            Search
          </label>
          <input
            type="text"
            className="form-control form-control-sm"
            id="search-filter"
            placeholder="Search company name..."
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
          />
        </div>

        {/* Fit Status */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="fit-status-filter">
            <i className="bi bi-check-circle me-1" />
            Fit Status
          </label>
          <select
            className="form-select form-select-sm"
            id="fit-status-filter"
            value={filters.fitStatus}
            onChange={(e) => set('fitStatus', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Fit">Fit</option>
            <option value="Partial Fit">Partial Fit</option>
            <option value="Insufficient Info">Insufficient Info</option>
            <option value="No Fit">No Fit</option>
          </select>
        </div>

        {/* Source */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="source-filter">
            <i className="bi bi-folder me-1" />
            Source
          </label>
          <select
            className="form-select form-select-sm"
            id="source-filter"
            value={filters.source}
            onChange={(e) => set('source', e.target.value)}
          >
            <option value="">All Sources</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Employees */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="min-employees-filter">
            <i className="bi bi-people me-1" />
            Employees
          </label>
          <div className="d-flex gap-2 align-items-center">
            <input
              type="number"
              className="form-control form-control-sm filter-input-num"
              id="min-employees-filter"
              placeholder="Min"
              value={filters.minEmployees}
              onChange={(e) => set('minEmployees', e.target.value)}
            />
            <span className="text-muted">-</span>
            <input
              type="number"
              className="form-control form-control-sm filter-input-num"
              id="max-employees-filter"
              placeholder="Max"
              aria-label="Maximum employees"
              value={filters.maxEmployees}
              onChange={(e) => set('maxEmployees', e.target.value)}
            />
          </div>
        </div>

        {/* Revenue */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="min-revenue-filter">
            <i className="bi bi-currency-dollar me-1" />
            Revenue ($M)
          </label>
          <div className="d-flex gap-2 align-items-center">
            <input
              type="number"
              className="form-control form-control-sm filter-input-num"
              id="min-revenue-filter"
              placeholder="Min"
              step="0.1"
              value={filters.minRevenue}
              onChange={(e) => set('minRevenue', e.target.value)}
            />
            <span className="text-muted">-</span>
            <input
              type="number"
              className="form-control form-control-sm filter-input-num"
              id="max-revenue-filter"
              placeholder="Max"
              aria-label="Maximum revenue"
              step="0.1"
              value={filters.maxRevenue}
              onChange={(e) => set('maxRevenue', e.target.value)}
            />
          </div>
        </div>

        {/* Score */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="min-score-filter">
            <i className="bi bi-star me-1" />
            Score
          </label>
          <div className="d-flex gap-2 align-items-center">
            <input
              type="number"
              className="form-control form-control-sm filter-input-num"
              id="min-score-filter"
              placeholder="Min"
              min={1}
              max={100}
              value={filters.minScore}
              onChange={(e) => set('minScore', e.target.value)}
            />
            <span className="text-muted">-</span>
            <input
              type="number"
              className="form-control form-control-sm filter-input-num"
              id="max-score-filter"
              placeholder="Max"
              aria-label="Maximum score"
              min={1}
              max={100}
              value={filters.maxScore}
              onChange={(e) => set('maxScore', e.target.value)}
            />
          </div>
        </div>

        {/* Country */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="country-filter">
            <i className="bi bi-geo-alt me-1" />
            Country
          </label>
          <select
            className="form-select form-select-sm"
            id="country-filter"
            value={filters.country}
            onChange={(e) => set('country', e.target.value)}
          >
            <option value="">All Countries</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="sort-column">
            <i className="bi bi-sort-down me-1" />
            Sort By
          </label>
          <div className="d-flex gap-2">
            <select
              className="form-select form-select-sm filter-input-text"
              id="sort-column"
              value={filters.sortColumn}
              onChange={(e) => set('sortColumn', e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="form-select form-select-sm filter-select-compact"
              id="sort-direction"
              aria-label="Sort direction"
              value={filters.sortDirection}
              onChange={(e) => set('sortDirection', e.target.value as 'asc' | 'desc')}
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {tags.length > 0 && (
        <div className="active-filters-bar" id="active-filters-bar">
          <span className="active-filters-label">
            <i className="bi bi-filter-circle me-1" />
            Active Filters:
          </span>
          <div className="active-filters-tags" id="active-filters-tags">
            {tags.map((t) => (
              <span className="active-filter-tag" key={t.label}>
                {t.label}{' '}
                {/* a11y (Phase 35): real <button> so clearing a filter tag is keyboard-operable. */}
                <button
                  type="button"
                  className="btn-unstyled"
                  aria-label={`Clear filter: ${t.label}`}
                  onClick={t.clear}
                >
                  <i className="bi bi-x-circle-fill ms-1" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
