// FinancialResultDetailView — Replit Financials Buyer List parity
// (QURALYST-20 FinancialResultDetail + screenshot layout).
import { useEffect, useMemo, useState, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, Inbox, Search } from 'lucide-react';
import { Spinner } from '@/components/ui';
import OutcomeTagSelect from '@/components/domain/OutcomeTagSelect';
import {
  resultsService,
  enrichService,
  researchService,
  normalizeFirmKey,
  type EnrichMode,
  type OutcomeValue,
} from '@/services/api';
import { filtersToFvForm } from '@/features/research/filtersToForm';
import { CellModalContext } from '@/components/ui/Modal/cellModalContext';
import EnrichDropdown from '@/features/results/resultDetail/EnrichDropdown';
import { EnrichDot } from '@/features/results/resultDetail/EnrichDot';
import CustomColumnButton from '@/features/results/resultDetail/CustomColumnButton';
import DealLinkControl from '@/features/deals/DealLinkControl';
import AddToDealButton from '@/features/deals/AddToDealButton';
import EmailNudgeBanner from '@/features/emailSync/EmailNudgeBanner';
import { FV_COLUMN_ORDER, orderResultColumns } from '@/features/results/columnOrder';
import {
  companyNameOf,
  fitBucket,
  parseScore,
  type FitBucket,
} from '@/features/results/resultDetail/fitBucket';
import type { EnrichJobState, FitFilter, RowData } from '@/features/results/resultDetail/types';
import { useOutcomes } from '@/features/results/viewResult/useOutcomes';
import { useToast } from '@/hooks/useToast';
import { openTearsheet } from '@/lib/tearsheet/openTearsheet';
import { paths } from '@/routes/paths';
import type { FvAppliedFilters } from '@/types';
import '@/styles/pages/financial-result-detail.css';

type SortMode = 'score_desc' | 'score_asc' | 'name';

const FIT_TABS: { key: FitFilter; label: string; countKey: FitBucket | 'all' }[] = [
  { key: 'all', label: 'All', countKey: 'all' },
  { key: 'fit', label: 'Fit', countKey: 'fit' },
  { key: 'partial', label: 'Partial fit', countKey: 'partial' },
  { key: 'no', label: 'No fit', countKey: 'no' },
];

/** Columns kept for sort/avg but not shown in the Replit table. */
const HIDDEN_COLUMNS = new Set([
  'Final Score',
  'Firm Name',
  'Fit Status',
  'Domain',
  'URL',
  'Exclusion Stage',
  'Exclusion Reason',
  'Direct Matches',
  'Indirect Matches',
  'Not Matched',
  'Request Contact',
  'GPT Score',
]);

function formatRange(min?: string | number, max?: string | number): string {
  const lo = min === '' || min == null ? 'Any' : `$${min}M`;
  const hi = max === '' || max == null ? 'Any' : `$${max}M`;
  return `${lo} - ${hi}`;
}

function fitPillClass(bucket: FitBucket): string {
  if (bucket === 'fit') return 'fv-pill fv-pill--fit';
  if (bucket === 'partial') return 'fv-pill fv-pill--partial';
  return 'fv-pill fv-pill--nofit';
}

function dealRoleClass(role: string): string {
  switch (role.trim()) {
    case 'Platform':
      return 'fv-pill fv-pill--role-platform';
    case 'Strategic add-on':
      return 'fv-pill fv-pill--role-strategic';
    case 'Bolt-on':
      return 'fv-pill fv-pill--role-bolton';
    case 'Line extension':
      return 'fv-pill fv-pill--role-line';
    case 'Add-on':
      return 'fv-pill fv-pill--role-addon';
    default:
      return 'fv-pill fv-pill--role-muted';
  }
}

function websiteHref(raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function websiteLabel(raw: string, domain?: string): string {
  if (domain?.trim()) return domain.replace(/^https?:\/\//i, '');
  return raw.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function fitDisplayLabel(bucket: FitBucket, raw: string): string {
  if (bucket === 'fit') return 'Fit';
  if (bucket === 'partial') return 'Partial Fit';
  if (bucket === 'no') return 'No Fit';
  return raw;
}

function FilterItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="fv-filter-item">
      <div className="fv-filter-item__label">{label}</div>
      <div className="fv-filter-item__value">{value || 'Not specified'}</div>
    </div>
  );
}

function AppliedFiltersCard({ filters }: { filters: FvAppliedFilters }) {
  const location = [filters.location?.state, filters.location?.country].filter(Boolean).join(', ');
  const exposure = [
    filters.exposure?.currentPortfolio && 'Current Portfolio',
    filters.exposure?.pastPortfolio && 'Past Portfolio',
    filters.exposure?.listedInterest && 'Listed Interest',
  ].filter(Boolean) as string[];
  const floors = filters.platformFloors;
  const platformSize = floors
    ? [
        floors.ebitda != null && `$${floors.ebitda}M EBITDA`,
        floors.revenue != null && `$${floors.revenue}M revenue`,
      ]
        .filter(Boolean)
        .join(' / ')
    : '';

  return (
    <div className="fv-run-details">
      <div className="criteria-card criteria-card--white">
        <h4 className="mb-3">
          <i className="bi bi-filter me-2" aria-hidden="true" />
          Applied Filters
        </h4>
        <div className="fv-filters-grid">
          <FilterItem label="Target Description" value={filters.targetDescription} />
          <FilterItem label="Business Type" value={filters.businessType} />
          <FilterItem label="Industry" value={filters.industry} />
          <FilterItem label="Sub-Industry" value={filters.subIndustry} />
          <FilterItem label="Location" value={location} />
          <FilterItem
            label="Revenue Range"
            value={formatRange(filters.size?.revenueMin, filters.size?.revenueMax)}
          />
          <FilterItem
            label="EBITDA Range"
            value={formatRange(filters.size?.ebitdaMin, filters.size?.ebitdaMax)}
          />
          {/* F67 — the floors that produced the Deal Role column. Shows the RESOLVED
              pair (defaults filled in), i.e. what was actually applied to this run.
              Absent on runs created before F67, which correctly render "Not specified". */}
          <FilterItem label="Platform Size" value={platformSize} />
          <FilterItem
            label="PE Exposure"
            value={
              exposure.length ? (
                <span className="d-flex flex-wrap gap-1">
                  {exposure.map((e) => (
                    <span key={e} className="fv-pill fv-pill--partial">
                      {e}
                    </span>
                  ))}
                </span>
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
}

function CellValue({
  col,
  row,
  enrichStatus,
}: {
  col: string;
  row: RowData;
  enrichStatus?: string;
}) {
  const showCellModal = useContext(CellModalContext)?.showCellModal;
  const value = String(row[col] ?? '').trim();
  const empty = !value || value === '-' || value.toLowerCase() === 'nan';

  if (col === 'PE Firm name') {
    const name = companyNameOf(row) || value || 'Unknown';
    return (
      <div className="fv-firm-name">
        <div className="fv-firm-name__row">
          <EnrichDot status={enrichStatus} />
          {name}
        </div>
      </div>
    );
  }

  if (col === 'Fit' || col === 'Fit Status') {
    if (empty) return <span className="fv-cell-empty">-</span>;
    const bucket = fitBucket(row);
    return <span className={fitPillClass(bucket)}>{fitDisplayLabel(bucket, value)}</span>;
  }

  if (col === 'Deal Role') {
    if (empty) return <span className="fv-cell-empty">-</span>;
    return <span className={dealRoleClass(value)}>{value}</span>;
  }

  if (col === 'Website' || col === 'URL' || col === 'Domain') {
    if (empty) return <span className="fv-cell-empty">-</span>;
    const href = websiteHref(value);
    const label = websiteLabel(value, row.Domain);
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="fv-link"
        onClick={(e) => e.stopPropagation()}
      >
        {label || 'Website'} <ExternalLink size={12} aria-hidden />
      </a>
    );
  }

  if (col === 'Primary Contact email 1' || col === 'Contact Email' || col === 'email 1') {
    if (empty) return <span className="fv-cell-empty">-</span>;
    return (
      <a href={`mailto:${value}`} className="fv-link" onClick={(e) => e.stopPropagation()}>
        {value}
      </a>
    );
  }

  if (empty) return <span className="fv-cell-empty">-</span>;

  // Truncated text cells → full content in CellModal (same as Target/Strategic results).
  if (showCellModal) {
    return (
      <button
        type="button"
        className="fv-cell-expand"
        title={value}
        aria-label={`Expand ${col}`}
        onClick={() => showCellModal(col, value)}
      >
        <span className="fv-cell-text">{value}</span>
      </button>
    );
  }

  return <span className="fv-cell-text">{value}</span>;
}

export default function FinancialResultDetailView({ resultId }: { resultId: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const outcomesByKey = useOutcomes(resultId, 'financial');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['result-detail', resultId],
    queryFn: () => resultsService.get(resultId),
    enabled: Boolean(resultId),
  });

  const [fitFilter, setFitFilter] = useState<FitFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('score_desc');
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [enrichJob, setEnrichJob] = useState<EnrichJobState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => (data?.rows ?? []) as RowData[], [data?.rows]);

  const columns = useMemo(() => {
    const ordered = orderResultColumns(data?.columns ?? [], FV_COLUMN_ORDER);
    const preferred = ordered.filter((c) => !HIDDEN_COLUMNS.has(c));
    // Prefer the Replit fixed set when present; still append unknown custom cols.
    const preferredSet = new Set(FV_COLUMN_ORDER);
    const fixed = FV_COLUMN_ORDER.filter((c) => preferred.includes(c));
    const custom = preferred.filter((c) => !preferredSet.has(c));
    return [...fixed, ...custom];
  }, [data?.columns]);

  const counts = useMemo(() => {
    const c: Record<FitBucket, number> & { all: number; avg: number | null } = {
      all: rows.length,
      fit: 0,
      partial: 0,
      no: 0,
      avg: null,
    };
    let scoreSum = 0;
    let scoreN = 0;
    for (const row of rows) {
      c[fitBucket(row)] += 1;
      const s = parseScore(row);
      if (s > 0) {
        scoreSum += s;
        scoreN += 1;
      }
    }
    c.avg = scoreN ? scoreSum / scoreN : null;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (fitFilter !== 'all' && fitBucket(row) !== fitFilter) return false;
      if (!q) return true;
      const hay = [
        companyNameOf(row),
        row.Website,
        row.Domain,
        row.URL,
        row.Rationale,
        row['Business Description'],
        row['Sector/Industry Interest'],
        row['Primary Contact 1'],
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    list = [...list].sort((a, b) => {
      if (sort === 'name') return companyNameOf(a).localeCompare(companyNameOf(b));
      const sa = parseScore(a);
      const sb = parseScore(b);
      return sort === 'score_asc' ? sa - sb : sb - sa;
    });
    return list;
  }, [rows, fitFilter, query, sort]);

  const selectableNames = useMemo(
    () => filtered.map((r) => companyNameOf(r)).filter(Boolean),
    [filtered],
  );
  const selectedRows = useMemo(
    () => filtered.filter((r) => selected.has(companyNameOf(r))),
    [filtered, selected],
  );
  const allSelectableChecked =
    selectableNames.length > 0 && selectableNames.every((n) => selected.has(n));

  const toggleRow = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (selectableNames.every((n) => prev.has(n))) {
        const next = new Set(prev);
        selectableNames.forEach((n) => next.delete(n));
        return next;
      }
      return new Set([...prev, ...selectableNames]);
    });
  };

  useEffect(() => {
    if (!resultId) return;
    const modes: EnrichMode[] = ['contacts', 'company_data', 'all'];
    void Promise.all(modes.map((m) => enrichService.getStatus(resultId, m).catch(() => null))).then(
      (statuses) => {
        const idx = statuses.findIndex((s) => s && (s.running || s.status === 'running'));
        if (idx < 0) return;
        const s = statuses[idx]!;
        setEnrichJob({
          mode: modes[idx],
          total: s.total ?? 0,
          done: s.done ?? s.processed ?? 0,
          skipped: s.skipped ?? 0,
          failed: s.failed ?? 0,
          running: true,
          byCompany: s.byCompany ?? {},
        });
      },
    );
  }, [resultId]);

  useEffect(() => {
    if (!enrichJob?.running || !resultId) return;
    const mode = enrichJob.mode;
    const id = window.setInterval(async () => {
      try {
        const status = await enrichService.getStatus(resultId, mode);
        setEnrichJob((prev) =>
          prev
            ? {
                ...prev,
                total: status.total ?? prev.total,
                done: status.done ?? status.processed ?? prev.done,
                skipped: status.skipped ?? prev.skipped,
                failed: status.failed ?? prev.failed,
                running: status.running ?? status.status === 'running',
                byCompany: status.byCompany ?? prev.byCompany,
              }
            : prev,
        );
        if (
          status.status === 'completed' ||
          status.status === 'failed' ||
          status.status === 'idle' ||
          status.running === false
        ) {
          window.clearInterval(id);
          void refetch();
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [enrichJob?.running, enrichJob?.mode, resultId, refetch]);

  const handleDownload = () => {
    toast.info('Preparing your download…');
    const a = document.createElement('a');
    a.href = resultsService.downloadUrl(resultId);
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleUseSettings = async () => {
    try {
      const filters = await researchService.reuseFilters(resultId);
      localStorage.setItem(
        'quralyst:draft:financial_verticals',
        JSON.stringify(filtersToFvForm(filters)),
      );
      toast.success('Settings loaded. Opening builder with these criteria.');
      navigate(paths.financialVerticals);
    } catch {
      toast.error('Could not load the filters from this result.');
    }
  };

  if (isLoading) {
    return (
      <div className="fv-page text-center p-5">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fv-page p-4 text-danger">
        Failed to load result.{' '}
        <button type="button" className="fv-btn" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const total = rows.length;

  return (
    <div className="fv-page">
      <Link to={paths.previousResultsTab('fv-results')} className="fv-back">
        <i className="bi bi-chevron-left" aria-hidden="true" /> Back to Quralyst
      </Link>

      <div className="fv-header">
        <div className="fv-header__title-block">
          <h1 className="fv-title">Financials Buyer List</h1>
          <p className="fv-subtitle">{total.toLocaleString()} firms scored against your mandate</p>
          <div className="fv-header__under-title">
            <DealLinkControl
              resultId={resultId}
              title="Financial buyer list"
              buttonLabel="Link to a deal"
            />
            {data.filtersApplied && (
              <button
                type="button"
                className={`fv-btn${showRunDetails ? ' fv-btn--active' : ''}`}
                onClick={() => setShowRunDetails((s) => !s)}
                aria-expanded={showRunDetails}
              >
                <i className="bi bi-clipboard-data" aria-hidden="true" />
                {showRunDetails ? 'Hide run details' : 'Run details'}
              </button>
            )}
          </div>
        </div>

        <div className="fv-header__actions">
          {counts.avg != null && (
            <div className="fv-avg">
              <p className="fv-avg__label">Avg. score</p>
              <p className="fv-avg__value">{counts.avg.toFixed(1)}</p>
            </div>
          )}

          <div className="fv-search">
            <Search size={16} className="fv-search__icon" aria-hidden />
            <input
              className="fv-search__input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search firms…"
              aria-label="Search firms"
            />
          </div>

          <EnrichDropdown
            resultId={resultId}
            listType="financial"
            enrichJob={enrichJob}
            onStart={setEnrichJob}
          />

          <CustomColumnButton
            resultId={resultId}
            label="Add column"
            onComplete={() => void refetch()}
          />

          <button
            type="button"
            className="fv-btn"
            onClick={() => void handleUseSettings()}
            title="Load these settings into the builder"
          >
            <i className="bi bi-sliders" aria-hidden="true" /> Use settings
          </button>

          <button
            type="button"
            className="fv-btn"
            onClick={() => navigate(paths.scorecard)}
            title="Outcome scorecard"
          >
            <i className="bi bi-bar-chart-line" aria-hidden="true" /> Scorecard
          </button>

          <button type="button" className="fv-btn" onClick={handleDownload} disabled={total === 0}>
            <i className="bi bi-download" aria-hidden="true" /> Export
          </button>
        </div>
      </div>

      <div className="fv-nudge">
        <EmailNudgeBanner />
      </div>

      {showRunDetails && data.filtersApplied && (
        <AppliedFiltersCard filters={data.filtersApplied as FvAppliedFilters} />
      )}

      <div className="fv-fitbar">
        <div className="fv-fitbar__tabs" role="tablist" aria-label="Filter by fit">
          {FIT_TABS.map((t) => {
            const count = t.countKey === 'all' ? counts.all : counts[t.countKey];
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={fitFilter === t.key}
                className={`fv-fit-tab${fitFilter === t.key ? ' is-active' : ''}`}
                onClick={() => setFitFilter(t.key)}
              >
                <span className="fv-fit-tab__label">{t.label}</span>
                <span className="fv-fit-tab__count">({count})</span>
              </button>
            );
          })}
        </div>
        <select
          className="fv-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort firms"
        >
          <option value="score_desc">Score: high to low</option>
          <option value="score_asc">Score: low to high</option>
          <option value="name">Firm: A to Z</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="fv-selected-bar">
          <span className="fv-selected-bar__count">{selected.size} selected</span>
          <button type="button" className="fv-btn" onClick={() => setSelected(new Set())}>
            Clear
          </button>
          <div className="fv-selected-bar__actions">
            <AddToDealButton
              sourceResultId={resultId}
              records={selectedRows.map((r) => ({
                companyName: companyNameOf(r),
                website: String(r.Website || r.URL || r.Domain || ''),
                predictedFit: String(r.Fit || r['Fit Status'] || ''),
                contactName: String(r['Primary Contact 1'] || ''),
                contactEmail: String(r['Primary Contact email 1'] || ''),
                contactTitle: String(r['Primary Contact Title 1'] || ''),
                contactPhone: String(r['Primary Contact Phone'] || ''),
              }))}
              label="Add to deal"
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="fv-empty">
          <div className="fv-empty__icon">
            <Inbox size={24} aria-hidden />
          </div>
          <h3 className="fv-empty__title">No firms match</h3>
          <p className="fv-empty__text">Try a different fit filter or search term.</p>
        </div>
      ) : (
        <div className="fv-table-wrap">
          <table className="fv-table">
            <thead>
              <tr>
                <th className="fv-col-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={allSelectableChecked}
                    onChange={toggleSelectAll}
                    disabled={selectableNames.length === 0}
                    aria-label="Select all firms"
                  />
                </th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
                <th className="fv-col-center">Outcome</th>
                <th className="fv-col-center">Tearsheet</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const name = companyNameOf(row);
                const firmKey = normalizeFirmKey(name);
                const outcome = outcomesByKey[firmKey];
                const website = String(row.Website || row.URL || row.Domain || '');
                return (
                  <tr key={`${name || 'firm'}-${idx}`}>
                    <td className="fv-col-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={!!name && selected.has(name)}
                        onChange={() => name && toggleRow(name)}
                        disabled={!name}
                        aria-label={`Select ${name || 'firm'}`}
                      />
                    </td>
                    {columns.map((col) => (
                      <td key={col}>
                        <CellValue
                          col={col}
                          row={row}
                          enrichStatus={name ? enrichJob?.byCompany?.[name] : undefined}
                        />
                      </td>
                    ))}
                    <td className="fv-col-center">
                      {name ? (
                        <OutcomeTagSelect
                          resultId={resultId}
                          firmKey={firmKey}
                          companyName={name}
                          value={(outcome?.resolved_outcome ?? 'not_contacted') as OutcomeValue}
                          resultKind="financial"
                        />
                      ) : (
                        <span className="fv-cell-empty">-</span>
                      )}
                    </td>
                    <td className="fv-col-center">
                      <div className="fv-actions-cell">
                        {name ? (
                          <AddToDealButton
                            sourceResultId={resultId}
                            records={[
                              {
                                companyName: name,
                                website,
                                predictedFit: String(row.Fit || row['Fit Status'] || ''),
                              },
                            ]}
                            label={<i className="bi bi-briefcase" aria-hidden="true" />}
                            className="fv-btn"
                          />
                        ) : null}
                        {name ? (
                          <Link
                            to={openTearsheet(name, website || undefined)}
                            className="fv-tearsheet-btn"
                            title="Request an AI-generated tearsheet for this firm"
                          >
                            <FileText size={14} aria-hidden />
                            Request
                          </Link>
                        ) : (
                          <button type="button" className="fv-tearsheet-btn" disabled>
                            <FileText size={14} aria-hidden />
                            Request
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
