// Holdings tab (F29.2) — filterable, sortable, paginated holdings search over
// /api/pe/screener/holdings, a header stat row from /holdings-stats, sector/geography dropdowns
// from /options, a suspect-only fix-it view + include-suspect toggle (default off), and a
// client-side CSV export (export=true flat list). Screener-specific table (consumes
// peScreenerService, NOT the self-contained F24.3 HoldingsTable). Reuses RowQualityBadge.
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Checkbox, TextInput } from '@/components/ui';
import { RowQualityBadge } from '@/components/pe/HoldingQualityBadge';
import { peService, peScreenerService } from '@/services/api';
import { peScreenerKeys } from './peScreenerKeys';
import { paths } from '@/routes/paths';
import { openTearsheet } from '@/lib/tearsheet/openTearsheet';
import { FilterChips, SelectFilter, YesNoFilter, type FilterChip } from './screenerHelpers';
import { downloadCsv, useDebounce } from './screenerUtils';
import type {
  PEScreenerHoldingsQuery,
  PEScreenerHoldingSortBy,
  PEScreenerOptions,
  PEScreenerSortDir,
  PEScreenerYesNo,
} from '@/types';

function statusClass(status?: string | null): string {
  if (status === 'current') return 'pes-status pes-status--current';
  if (status === 'realized') return 'pes-status pes-status--realized';
  return 'pes-status pes-status--unknown';
}

/** Backend returns string[]; fixtures/legacy may still send a comma-joined string. */
function keywordsList(raw: string[] | string | null | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 4);
  }
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function productsText(raw: string[] | string | null | undefined): string {
  if (Array.isArray(raw))
    return raw
      .map((s) => String(s).trim())
      .filter(Boolean)
      .join(', ');
  if (typeof raw === 'string') return raw.trim();
  return '';
}

const PAGE_SIZE = 50;

// The year inputs are <input type="number">, whose string value also accepts decimals/exponents
// (e.g. "2015.5", "1e4"). The backend param is `int`, so a non-integer would 422→400. Normalise to
// a canonical integer string (Number("1e4") → "10000") and drop anything non-integer.
function toYearParam(raw: string): string | undefined {
  const n = Number(raw);
  return raw.trim() !== '' && Number.isInteger(n) && n >= 0 ? String(n) : undefined;
}

const STATUS_OPTIONS = [
  { value: 'current', label: 'Current' },
  { value: 'realized', label: 'Realized' },
  { value: 'unknown', label: 'Unknown' },
];

const SORT_COLUMNS: { key: PEScreenerHoldingSortBy; label: string }[] = [
  { key: 'companyName', label: 'Company' },
  { key: 'firmName', label: 'Firm' },
  { key: 'sector', label: 'Sector' },
  { key: 'investmentStatus', label: 'Status' },
  { key: 'investmentDate', label: 'Inv. Date' },
];

export default function HoldingsScreenerTab({ options }: { options?: PEScreenerOptions }) {
  const [search, setSearch] = useState('');
  const [firmId, setFirmId] = useState('');
  const [status, setStatus] = useState('');
  const [sector, setSector] = useState('');
  const [geography, setGeography] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [hasDate, setHasDate] = useState<PEScreenerYesNo>('');
  const [hasDesc, setHasDesc] = useState<PEScreenerYesNo>('');
  const [hasWeb, setHasWeb] = useState<PEScreenerYesNo>('');
  const [includeSuspect, setIncludeSuspect] = useState(false);
  const [suspectOnly, setSuspectOnly] = useState(false);
  const [sortBy, setSortBy] = useState<PEScreenerHoldingSortBy>('companyName');
  const [sortDir, setSortDir] = useState<PEScreenerSortDir>('asc');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const [exporting, setExporting] = useState(false);

  const dSearch = useDebounce(search);
  const dGeo = useDebounce(geography);
  const dYearFrom = useDebounce(yearFrom);
  const dYearTo = useDebounce(yearTo);

  const query: PEScreenerHoldingsQuery = {
    search: dSearch || undefined,
    firmId: firmId || undefined,
    status: status || undefined,
    sector: sector || undefined,
    geography: dGeo || undefined,
    investYearFrom: toYearParam(dYearFrom),
    investYearTo: toYearParam(dYearTo),
    hasDate: hasDate || undefined,
    hasDescription: hasDesc || undefined,
    hasWebsite: hasWeb || undefined,
    includeSuspect: includeSuspect || undefined,
    qualityFilter: suspectOnly ? 'suspect' : undefined,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isFetching } = useQuery({
    queryKey: peScreenerKeys.holdings(query),
    queryFn: () => peScreenerService.listHoldings(query),
    placeholderData: (prev) => prev,
  });

  const { data: firmOpts } = useQuery({
    queryKey: ['pe', 'firms', 'options'],
    queryFn: () => peService.listFirmOptions(),
    staleTime: 60_000,
  });

  // Reset to page 0 whenever any filter changes.
  useEffect(() => {
    setPage(0);
  }, [
    dSearch,
    firmId,
    status,
    sector,
    dGeo,
    dYearFrom,
    dYearTo,
    hasDate,
    hasDesc,
    hasWeb,
    includeSuspect,
    suspectOnly,
    sortBy,
    sortDir,
  ]);

  const sectorOptions = (options?.sectors ?? []).map((s) => ({ value: s, label: s }));
  const geographyOptions = (options?.geographies ?? []).map((g) => ({ value: g, label: g }));
  const firmOptions = (firmOpts ?? []).map((f) => ({ value: f.id, label: f.name }));
  const firmLabel = firmOpts?.find((f) => f.id === firmId)?.name ?? firmId;

  const chips: FilterChip[] = [
    search && { key: 'search', label: `Search: "${search}"` },
    firmId && { key: 'firmId', label: `Firm: ${firmLabel}` },
    status && { key: 'status', label: `Status: ${status}` },
    sector && { key: 'sector', label: `Sector: ${sector}` },
    dGeo && { key: 'geography', label: `Location: ${dGeo}` },
    dYearFrom && { key: 'yearFrom', label: `Year ≥ ${dYearFrom}` },
    dYearTo && { key: 'yearTo', label: `Year ≤ ${dYearTo}` },
    hasDate && { key: 'hasDate', label: `${hasDate === 'yes' ? 'Has' : 'No'} Inv. Date` },
    hasDesc && { key: 'hasDesc', label: `${hasDesc === 'yes' ? 'Has' : 'No'} Description` },
    hasWeb && { key: 'hasWeb', label: `${hasWeb === 'yes' ? 'Has' : 'No'} Website` },
    suspectOnly && { key: 'suspectOnly', label: 'Suspect only' },
  ].filter(Boolean) as FilterChip[];

  function removeChip(key: string) {
    if (key === 'search') setSearch('');
    if (key === 'firmId') setFirmId('');
    if (key === 'status') setStatus('');
    if (key === 'sector') setSector('');
    if (key === 'geography') setGeography('');
    if (key === 'yearFrom') setYearFrom('');
    if (key === 'yearTo') setYearTo('');
    if (key === 'hasDate') setHasDate('');
    if (key === 'hasDesc') setHasDesc('');
    if (key === 'hasWeb') setHasWeb('');
    if (key === 'suspectOnly') setSuspectOnly(false);
  }

  function clearAll() {
    setSearch('');
    setFirmId('');
    setStatus('');
    setSector('');
    setGeography('');
    setYearFrom('');
    setYearTo('');
    setHasDate('');
    setHasDesc('');
    setHasWeb('');
    setSuspectOnly(false);
    setIncludeSuspect(false);
  }

  function toggleSort(key: PEScreenerHoldingSortBy) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await peScreenerService.exportHoldings(query);
      downloadCsv(
        'screener-holdings.csv',
        [
          'Company',
          'Firm',
          'Sector',
          'Geography',
          'Status',
          'Inv. Date',
          'Website',
          'Description',
          'Products & Services',
          'Keywords',
        ],
        rows.map((r) => [
          r.companyName,
          r.firmName,
          r.sector ?? '',
          r.geography ?? '',
          r.investmentStatus ?? '',
          r.investmentDate ?? '',
          r.websiteUrl ?? '',
          r.description ?? r.aiDescription ?? '',
          productsText(r.keyProductsServices),
          Array.isArray(r.aiKeywords) ? r.aiKeywords.join(', ') : (r.aiKeywords ?? ''),
        ]),
      );
    } finally {
      setExporting(false);
    }
  }

  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="d-flex justify-content-end gap-2 mb-3">
        <Button variant="popup-secondary" onClick={() => setShowFilters((v) => !v)}>
          <i className="bi bi-sliders" aria-hidden="true" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        <Button variant="popup-secondary" onClick={handleExport} loading={exporting}>
          <i className="bi bi-download" aria-hidden="true" />
          Export CSV{data ? ` (${total.toLocaleString()})` : ''}
        </Button>
      </div>

      {showFilters && (
        <div className="pes-filters mb-3">
          <div className="row g-3">
            <div className="col-12">
              <span className="form-label d-block">Search</span>
              <div className="pes-search">
                <i className="bi bi-search pes-search__icon" aria-hidden="true" />
                <input
                  type="text"
                  className="pes-search__input"
                  placeholder="Company name or sector..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search holdings"
                />
              </div>
            </div>
            <div className="col-md-4">
              <span className="form-label d-block">Firm</span>
              <SelectFilter
                value={firmId}
                onChange={setFirmId}
                options={firmOptions}
                placeholder="All Firms"
                ariaLabel="Filter by firm"
              />
            </div>
            <div className="col-md-4">
              <span className="form-label d-block">Status</span>
              <SelectFilter
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
                ariaLabel="Filter by status"
              />
            </div>
            <div className="col-md-4">
              <span className="form-label d-block">Sector</span>
              <SelectFilter
                value={sector}
                onChange={setSector}
                options={sectorOptions}
                placeholder="All Sectors"
                ariaLabel="Filter by sector"
              />
            </div>
            <div className="col-md-4">
              <span className="form-label d-block">Geography</span>
              <SelectFilter
                value={geography}
                onChange={setGeography}
                options={geographyOptions}
                placeholder="All Geographies"
                ariaLabel="Filter by geography"
              />
            </div>
            <div className="col-md-4">
              <span className="form-label d-block">Inv. Year From</span>
              <TextInput
                type="number"
                placeholder="e.g. 2015"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                aria-label="Investment year from"
              />
            </div>
            <div className="col-md-4">
              <span className="form-label d-block">Inv. Year To</span>
              <TextInput
                type="number"
                placeholder="e.g. 2024"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                aria-label="Investment year to"
              />
            </div>
            <div className="col-md-4">
              <span className="form-label d-block">Has Inv. Date?</span>
              <YesNoFilter
                value={hasDate}
                onChange={(v) => setHasDate(v as PEScreenerYesNo)}
                ariaLabel="Has investment date"
              />
            </div>
            <div className="col-md-4">
              <span className="form-label d-block">Has Description?</span>
              <YesNoFilter
                value={hasDesc}
                onChange={(v) => setHasDesc(v as PEScreenerYesNo)}
                ariaLabel="Has description"
              />
            </div>
            <div className="col-md-4">
              <span className="form-label d-block">Has Website?</span>
              <YesNoFilter
                value={hasWeb}
                onChange={(v) => setHasWeb(v as PEScreenerYesNo)}
                ariaLabel="Has website"
              />
            </div>
            <div className="col-12 d-flex flex-wrap gap-4 align-items-center pt-1 border-top">
              <Checkbox
                id="holdings-include-suspect"
                label="Include suspect-quality rows"
                checked={includeSuspect}
                onChange={(e) => setIncludeSuspect(e.target.checked)}
              />
              <Checkbox
                id="holdings-suspect-only"
                label="Suspect only (fix-it view)"
                checked={suspectOnly}
                onChange={(e) => setSuspectOnly(e.target.checked)}
              />
              {chips.length > 0 && (
                <Button variant="clear-all-text" onClick={clearAll}>
                  Clear all filters
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <FilterChips chips={chips} onRemove={removeChip} />

      <div className={`pes-table-wrap${isFetching ? ' is-fetching' : ''}`}>
        <table className="pes-table">
          <thead>
            <tr>
              {SORT_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  aria-sort={
                    sortBy === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                >
                  <button type="button" onClick={() => toggleSort(col.key)}>
                    {col.label}
                    {sortBy === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              ))}
              <th>Geography</th>
              <th>Description</th>
              <th>Products &amp; Services</th>
              <th>Keywords</th>
              <th>Website</th>
              <th>Quality</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={11} className="pes-empty">
                  <span className="spinner" aria-label="Loading" />
                </td>
              </tr>
            ) : data.rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="pes-empty">
                  No holdings match your filters.
                </td>
              </tr>
            ) : (
              data.rows.map((h) => {
                const desc = h.description || h.aiDescription || '';
                const fromAi = !!h.aiDescription && !h.description;
                const kws = keywordsList(h.aiKeywords);
                const products = productsText(h.keyProductsServices);
                return (
                  <tr key={h.id}>
                    <td>
                      <div className="pes-company">
                        <span>{h.companyName}</span>
                        <Link
                          to={openTearsheet(h.companyName, h.websiteUrl ?? undefined)}
                          className="pes-tearsheet"
                          title="Request Tearsheet"
                        >
                          Tearsheet
                        </Link>
                      </div>
                    </td>
                    <td>
                      <Link to={paths.pe.firm(h.firmId)} className="pes-firm-link">
                        {h.firmName}
                      </Link>
                    </td>
                    <td>{h.sector ?? '—'}</td>
                    <td>
                      {h.investmentStatus ? (
                        <span className={statusClass(h.investmentStatus)}>
                          {h.investmentStatus}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{h.investmentDate ?? '—'}</td>
                    <td>{h.geography ?? '—'}</td>
                    <td className="pes-desc" title={desc}>
                      {desc ? `${desc.length > 120 ? `${desc.slice(0, 120)}…` : desc}` : '—'}
                      {fromAi && <span className="pes-ai">AI</span>}
                    </td>
                    <td className="pes-products" title={products}>
                      {products
                        ? products.length > 100
                          ? `${products.slice(0, 100)}…`
                          : products
                        : '—'}
                    </td>
                    <td>
                      {kws.length ? (
                        <div className="pes-kw">
                          {kws.map((k) => (
                            <span key={k} className="pes-kw__chip">
                              {k}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {h.websiteUrl ? (
                        <a
                          href={h.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pes-web"
                          title={h.websiteUrl}
                        >
                          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                          Site
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <RowQualityBadge quality={h.quality} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="pes-footer">
          <p className="pes-footer__count">
            {total === 0
              ? 'No results'
              : `Showing ${(page * PAGE_SIZE + 1).toLocaleString()}–${Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of ${total.toLocaleString()}`}
          </p>
          <div className="pes-pagination" role="group" aria-label="Pagination">
            <button
              type="button"
              className="pes-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="pes-footer__count">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="pes-btn"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
