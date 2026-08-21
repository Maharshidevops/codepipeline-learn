// Firms tab (F29.2) — the target-company criteria search over /api/pe/screener/firms. Numeric
// rev/EBITDA/EV/equity targets + negative-EBITDA-ok + sector/geo criteria search, with helper copy
// explaining the overlap semantics ("shows firms whose stated range covers your target; unbounded
// sides pass"). Columns show holdingsCount, criteria ranges, sizeCriteriaSource/criteriaAutoFilled
// provenance badges, and lastScrapedAt. CSV export via export=true. Screener-specific table.
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, Checkbox, TextInput } from '@/components/ui';
import { peScreenerService } from '@/services/api';
import { peScreenerKeys } from './peScreenerKeys';
import { paths } from '@/routes/paths';
import { formatDateTimeShort } from '@/lib/datetime';
import { FilterChips, SelectFilter, type FilterChip } from './screenerHelpers';
import { downloadCsv, fmtRange, useDebounce } from './screenerUtils';
import type { PEScreenerFirmsQuery } from '@/types';

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'quarantined', label: 'Quarantined' },
  { value: 'error', label: 'Error' },
];

function parseM(s: string): number | undefined {
  const v = parseFloat(s);
  return Number.isNaN(v) ? undefined : v;
}

export default function FirmsScreenerTab() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [revTarget, setRevTarget] = useState('');
  const [ebitdaTarget, setEbitdaTarget] = useState('');
  const [evTarget, setEvTarget] = useState('');
  const [equityTarget, setEquityTarget] = useState('');
  const [negEbitdaOk, setNegEbitdaOk] = useState(false);
  const [sectorSearch, setSectorSearch] = useState('');
  const [geoSearch, setGeoSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const [exporting, setExporting] = useState(false);

  const dSearch = useDebounce(search);
  const dSector = useDebounce(sectorSearch);
  const dGeo = useDebounce(geoSearch);
  const dRev = useDebounce(revTarget);
  const dEbitda = useDebounce(ebitdaTarget);
  const dEv = useDebounce(evTarget);
  const dEquity = useDebounce(equityTarget);

  const query: PEScreenerFirmsQuery = {
    search: dSearch || undefined,
    status: status || undefined,
    revTarget: parseM(dRev),
    ebitdaTarget: parseM(dEbitda),
    evTarget: parseM(dEv),
    equityTarget: parseM(dEquity),
    negativeEbitdaOk: negEbitdaOk || undefined,
    sectorSearch: dSector || undefined,
    geoSearch: dGeo || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isFetching } = useQuery({
    queryKey: peScreenerKeys.firms(query),
    queryFn: () => peScreenerService.listFirms(query),
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setPage(0);
  }, [dSearch, status, dRev, dEbitda, dEv, dEquity, negEbitdaOk, dSector, dGeo]);

  const chips: FilterChip[] = [
    search && { key: 'search', label: `Search: "${search}"` },
    status && { key: 'status', label: `Status: ${status}` },
    revTarget && { key: 'revTarget', label: `Rev target: $${revTarget}M` },
    ebitdaTarget && { key: 'ebitdaTarget', label: `EBITDA target: $${ebitdaTarget}M` },
    evTarget && { key: 'evTarget', label: `EV target: $${evTarget}M` },
    equityTarget && { key: 'equityTarget', label: `Equity target: $${equityTarget}M` },
    negEbitdaOk && { key: 'negEbitdaOk', label: 'Neg. EBITDA OK' },
    sectorSearch && { key: 'sectorSearch', label: `Sector: "${sectorSearch}"` },
    geoSearch && { key: 'geoSearch', label: `Geo: "${geoSearch}"` },
  ].filter(Boolean) as FilterChip[];

  function removeChip(k: string) {
    if (k === 'search') setSearch('');
    if (k === 'status') setStatus('');
    if (k === 'revTarget') setRevTarget('');
    if (k === 'ebitdaTarget') setEbitdaTarget('');
    if (k === 'evTarget') setEvTarget('');
    if (k === 'equityTarget') setEquityTarget('');
    if (k === 'negEbitdaOk') setNegEbitdaOk(false);
    if (k === 'sectorSearch') setSectorSearch('');
    if (k === 'geoSearch') setGeoSearch('');
  }

  function clearAll() {
    setSearch('');
    setStatus('');
    setRevTarget('');
    setEbitdaTarget('');
    setEvTarget('');
    setEquityTarget('');
    setNegEbitdaOk(false);
    setSectorSearch('');
    setGeoSearch('');
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await peScreenerService.exportFirms(query);
      downloadCsv(
        'screener-firms.csv',
        [
          'Name',
          'Status',
          'Holdings',
          'Website',
          'Last Scraped',
          'Rev ($M)',
          'EBITDA ($M)',
          'EV ($M)',
          'Equity ($M)',
          'Sector Criteria',
          'Geo Criteria',
        ],
        rows.map((r) => [
          r.name,
          r.status ?? '',
          r.holdingsCount,
          r.websiteUrl ?? '',
          r.lastScrapedAt ?? '',
          fmtRange(r.revMin, r.revMax),
          fmtRange(r.ebitdaMin, r.ebitdaMax),
          fmtRange(r.evMin, r.evMax),
          fmtRange(r.equityCheckMin, r.equityCheckMax),
          r.sectorCriteria ?? '',
          r.geoCriteria ?? '',
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
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        <Button variant="popup-secondary" onClick={handleExport} loading={exporting}>
          Export CSV{data ? ` (${total.toLocaleString()})` : ''}
        </Button>
      </div>

      {showFilters && (
        <div className="pes-filters mb-3">
          <div className="row g-3">
            <div className="col-md-8">
              <span className="form-label d-block">Search</span>
              <div className="pes-search">
                <i className="bi bi-search pes-search__icon" aria-hidden="true" />
                <input
                  type="text"
                  className="pes-search__input"
                  placeholder="Firm name or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search firms"
                />
              </div>
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
          </div>

          <div className="mt-3">
            <div className="fw-semibold text-uppercase small text-muted mb-1">
              Target company criteria — find firms that can invest in a company with:
            </div>
            <p className="text-muted small mb-2">
              Shows firms whose stated range covers your target; unbounded sides pass. Enter any
              target in $M.
            </p>
            <div className="row g-3">
              <div className="col-md-3">
                <TextInput
                  label="Revenue ($M)"
                  type="number"
                  placeholder="e.g. 10"
                  value={revTarget}
                  onChange={(e) => setRevTarget(e.target.value)}
                  aria-label="Revenue target"
                />
              </div>
              <div className="col-md-3">
                <TextInput
                  label="EBITDA ($M)"
                  type="number"
                  placeholder="e.g. 2"
                  value={ebitdaTarget}
                  onChange={(e) => setEbitdaTarget(e.target.value)}
                  aria-label="EBITDA target"
                />
              </div>
              <div className="col-md-3">
                <TextInput
                  label="Enterprise Value ($M)"
                  type="number"
                  placeholder="e.g. 50"
                  value={evTarget}
                  onChange={(e) => setEvTarget(e.target.value)}
                  aria-label="Enterprise value target"
                />
              </div>
              <div className="col-md-3">
                <TextInput
                  label="Equity Check ($M)"
                  type="number"
                  placeholder="e.g. 20"
                  value={equityTarget}
                  onChange={(e) => setEquityTarget(e.target.value)}
                  aria-label="Equity check target"
                />
              </div>
              <div className="col-md-4">
                <TextInput
                  label="Sector Criteria"
                  placeholder="e.g. Healthcare..."
                  value={sectorSearch}
                  onChange={(e) => setSectorSearch(e.target.value)}
                  aria-label="Sector criteria search"
                />
              </div>
              <div className="col-md-4">
                <TextInput
                  label="Geography"
                  placeholder="e.g. Southeast US..."
                  value={geoSearch}
                  onChange={(e) => setGeoSearch(e.target.value)}
                  aria-label="Geo criteria search"
                />
              </div>
              <div className="col-md-4 d-flex align-items-end pb-2">
                <Checkbox
                  id="firms-neg-ebitda"
                  label="Negative EBITDA OK"
                  checked={negEbitdaOk}
                  onChange={(e) => setNegEbitdaOk(e.target.checked)}
                />
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="pt-2 border-top mt-2">
              <Button variant="clear-all-text" onClick={clearAll}>
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      <FilterChips chips={chips} onRemove={removeChip} />

      <div className={`pes-table-wrap${isFetching ? ' is-fetching' : ''}`}>
        <table className="pes-table">
          <thead>
            <tr>
              <th>Firm Name</th>
              <th>Status</th>
              <th className="pes-th--num">Holdings</th>
              <th>Revenue</th>
              <th>EBITDA</th>
              <th>EV</th>
              <th>Equity Check</th>
              <th>Sectors</th>
              <th>Geo</th>
              <th>Website</th>
              <th>Criteria Source</th>
              <th>Last Scraped</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={12} className="pes-empty">
                  <span className="spinner" aria-label="Loading" />
                </td>
              </tr>
            ) : data.rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="pes-empty">
                  No firms match your filters.
                </td>
              </tr>
            ) : (
              data.rows.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link to={paths.pe.firm(f.id)} className="pes-firm-link">
                      {f.name}
                    </Link>
                  </td>
                  <td>{f.status ?? '—'}</td>
                  <td className="pes-td--num">{f.holdingsCount.toLocaleString()}</td>
                  <td>{fmtRange(f.revMin, f.revMax)}</td>
                  <td>
                    {fmtRange(f.ebitdaMin, f.ebitdaMax)}
                    {f.negativeEbitdaOk === true && (
                      <span className="ms-1 small text-success">Neg OK</span>
                    )}
                  </td>
                  <td>{fmtRange(f.evMin, f.evMax)}</td>
                  <td>{fmtRange(f.equityCheckMin, f.equityCheckMax)}</td>
                  <td title={f.sectorCriteria ?? ''}>{f.sectorCriteria ?? '—'}</td>
                  <td title={f.geoCriteria ?? ''}>{f.geoCriteria ?? '—'}</td>
                  <td>
                    {f.websiteUrl ? (
                      <a
                        href={f.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="pes-web"
                        title={f.websiteUrl}
                      >
                        <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                        Site
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {f.sizeCriteriaSource && <Badge tone="info">{f.sizeCriteriaSource}</Badge>}
                    {f.criteriaAutoFilled && Object.keys(f.criteriaAutoFilled).length > 0 && (
                      <Badge tone="warning" className="ms-1">
                        auto-filled
                      </Badge>
                    )}
                    {!f.sizeCriteriaSource &&
                      !(f.criteriaAutoFilled && Object.keys(f.criteriaAutoFilled).length > 0) &&
                      '—'}
                  </td>
                  <td>{f.lastScrapedAt ? formatDateTimeShort(f.lastScrapedAt) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="pes-footer">
          <p className="pes-footer__count">
            {total === 0 ? 'No results' : `${total.toLocaleString()} firms`}
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
