// ResultDetailView — Replit-parity Target / Strategic Result Detail.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { paths } from '@/routes/paths';
import { enrichService, researchService, resultsService, type EnrichMode } from '@/services/api';
import EmailNudgeBanner from '@/features/emailSync/EmailNudgeBanner';
import { usePriorContacts } from '@/features/emailSync/usePriorContacts';
import DealLinkControl from '@/features/deals/DealLinkControl';
import AddToDealButton from '@/features/deals/AddToDealButton';
import { filtersToStrategicForm, filtersToTargetForm } from '@/features/research/filtersToForm';
import { storeRerunMeta } from '@/features/research/composerPrefill';
import { useToast } from '@/hooks/useToast';
import CustomColumnButton from './CustomColumnButton';
import EnrichDropdown from './EnrichDropdown';
import FitSummaryCards from './FitSummaryCards';
import FixedResultsTable from './FixedResultsTable';
import VersionSiblings from './VersionSiblings';
import { resolveFixedColumns } from './columns';
import { companyNameOf, fitBucket, parseScore, type FitBucket } from './fitBucket';
import type { EnrichJobState, FitFilter, RowData } from './types';
import FilesProcessingSummary from '@/features/results/viewResult/FilesProcessingSummary';
import InputFilesUsed from '@/features/results/viewResult/InputFilesUsed';
import FilterControlsPanel from '@/features/results/viewResult/FilterControlsPanel';
import { useResultFilters } from '@/features/results/viewResult/useResultFilters';
import type { FiltersApplied, ResultSummary } from '@/types';
import '@/styles/pages/result-detail.css';
import '@/styles/pages/view-result.css';

export type ResultDetailViewProps = {
  resultId: string;
};

export default function ResultDetailView({ resultId }: ResultDetailViewProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['result-detail', resultId],
    queryFn: () => resultsService.get(resultId),
    enabled: Boolean(resultId),
  });

  const [fitFilter, setFitFilter] = useState<FitFilter>('all');
  const [enrichJob, setEnrichJob] = useState<EnrichJobState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [showTableFilters, setShowTableFilters] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState<number | undefined>();

  const rows = useMemo(() => (data?.rows ?? []) as RowData[], [data?.rows]);
  const sourceType = data?.sourceType || 'target_list';
  const isStrategic = sourceType.includes('strategic');
  const listType = isStrategic ? 'strategic' : 'target';

  const runSummary = useMemo((): ResultSummary | null => {
    if (!data) return null;
    return {
      processId: data.processId,
      createdAt: data.createdAt,
      username: '',
      userId: '',
      totalMatches: data.totalMatches ?? rows.length,
      filesUploaded: data.filesUploaded ?? [],
      filtersApplied: (data.filtersApplied || {}) as FiltersApplied,
      resultFilename: data.resultFilename,
      hasResultsFile: rows.length > 0,
      status: data.status,
      version: data.version,
      versionGroup: data.versionGroup,
    };
  }, [data, rows.length]);

  const priorCompanies = useMemo(
    () =>
      rows
        .map((r) => ({ name: companyNameOf(r), website: String(r.Website || '') }))
        .filter((c) => c.name),
    [rows],
  );
  const priorContacts = usePriorContacts(
    resultId && !resultId.startsWith('fv_') ? priorCompanies : [],
  );

  const columns = useMemo(
    () =>
      resolveFixedColumns(
        sourceType,
        (data?.filtersApplied || {}) as Record<string, unknown>,
        rows,
      ) ?? [],
    [sourceType, data?.filtersApplied, rows],
  );

  const filterColumns = useMemo(() => {
    const labels = columns.map((c) => c.label);
    const keys = rows[0] ? Object.keys(rows[0]) : [];
    return Array.from(new Set([...labels, ...keys]));
  }, [columns, rows]);

  const {
    filters,
    setFilters,
    filteredRows,
    sourceOptions,
    countryOptions,
    hasActiveFilters,
    reset: resetTableFilters,
  } = useResultFilters(filterColumns, rows);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.search) n += 1;
    if (filters.fitStatus) n += 1;
    if (filters.source) n += 1;
    if (filters.country) n += 1;
    if (filters.minEmployees || filters.maxEmployees) n += 1;
    if (filters.minRevenue || filters.maxRevenue) n += 1;
    if (filters.minScore || filters.maxScore) n += 1;
    if (filters.sortColumn) n += 1;
    return n;
  }, [filters]);

  const counts = useMemo(() => {
    const c: Record<FitBucket, number> = { fit: 0, partial: 0, no: 0 };
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
    return { ...c, avg: scoreN ? scoreSum / scoreN : null };
  }, [rows]);

  // Fit summary cards + panel filters compose: card buckets apply on top of panel output.
  // Default sort by score desc when the panel hasn't chosen a sort column.
  const filtered = useMemo(() => {
    let list = filteredRows;
    if (fitFilter !== 'all') {
      list = list.filter((row) => fitBucket(row) === fitFilter);
    }
    if (!filters.sortColumn) {
      list = [...list].sort((a, b) => parseScore(b) - parseScore(a));
    }
    return list;
  }, [filteredRows, fitFilter, filters.sortColumn]);

  const handleFitCardFilter = (next: FitFilter) => {
    setFitFilter(next);
    // Cards use buckets (e.g. "No fit" includes Insufficient Info) — clear exact panel status.
    setFilters((prev) => ({ ...prev, fitStatus: '' }));
  };

  // Keep fit card in sync when Fit Status is changed from the panel.
  useEffect(() => {
    const s = filters.fitStatus;
    if (!s) return;
    const lower = s.toLowerCase();
    let next: FitFilter = 'all';
    if (lower === 'fit') next = 'fit';
    else if (lower === 'partial fit') next = 'partial';
    else if (lower === 'no fit' || lower === 'insufficient info') next = 'no';
    if (next !== fitFilter) setFitFilter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.fitStatus]);

  const visibleNames = useMemo(
    () => filtered.map((r) => companyNameOf(r)).filter(Boolean),
    [filtered],
  );
  const allSelected = visibleNames.length > 0 && visibleNames.every((n) => selected.has(n));

  const bulkRecords = useMemo(() => {
    const source =
      selected.size > 0 ? filtered.filter((r) => selected.has(companyNameOf(r))) : filtered;
    return source.map((r) => ({
      companyName: companyNameOf(r),
      website: String(r.Website || ''),
      predictedFit: String(r['Fit/No Fit'] || ''),
      source: String(r['Source Dataset'] || ''),
      contactName: [r['Contact First Name'], r['Contact Last Name']].filter(Boolean).join(' '),
      contactEmail: String(r['Contact Email'] || ''),
      contactTitle: String(r['Contact Title'] || ''),
      contactPhone: String(r['Contact Phone'] || r['Company Phone'] || ''),
    }));
  }, [filtered, selected]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['result-detail', resultId] });
    void refetch();
  };

  // Discover in-flight enrichment jobs.
  useEffect(() => {
    if (!resultId || resultId.startsWith('fv_')) return;
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

  // Poll while enrichment is running.
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
          status.status === 'idle'
        ) {
          window.clearInterval(id);
          invalidate();
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichJob?.running, enrichJob?.mode, resultId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      setPanelWidth(undefined);
      return;
    }
    const update = () => setPanelWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [columns, data, filtered.length]);

  // Drop selections that are no longer visible after filter changes.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set([...prev].filter((n) => visibleNames.includes(n)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleNames]);

  if (isLoading) return <div className="p-4 text-muted">Loading result…</div>;
  if (error || !data) {
    return (
      <div className="p-4 text-danger">
        Failed to load result.{' '}
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const title = data.title || data.resultFilename || 'Research result';
  const version = data.version || 1;

  // Prefill the matching builder from this result's filters.
  // asRerun=true → versioned re-run (RerunBanner); false → fresh run with same criteria
  // (parity with Previous Results "Use settings").
  const navigateWithFilters = async (asRerun: boolean) => {
    try {
      const filters = await researchService.reuseFilters(resultId);
      if (asRerun) {
        storeRerunMeta({
          sourceProcessId: resultId,
          version: data.version ?? 1,
          title,
        });
      }
      if (isStrategic) {
        localStorage.setItem(
          'quralyst:draft:strategic',
          JSON.stringify(filtersToStrategicForm(filters)),
        );
        toast.success(
          asRerun
            ? 'Edit criteria, then re-run…'
            : 'Settings loaded. Opening builder with these criteria.',
        );
        navigate(paths.strategic);
      } else {
        localStorage.setItem(
          'quralyst:draft:target_list',
          JSON.stringify(filtersToTargetForm(filters)),
        );
        toast.success(
          asRerun
            ? 'Edit criteria, then re-run…'
            : 'Settings loaded. Opening builder with these criteria.',
        );
        navigate(paths.targetList);
      }
    } catch {
      toast.error('Could not load the filters from this result.');
    }
  };

  const editAndRerun = () => void navigateWithFilters(true);
  const handleUseSettings = () => void navigateWithFilters(false);

  return (
    <div className="rd-page">
      <div className="rd-header">
        <Link
          to={paths.previousResults}
          className="text-muted text-decoration-none small d-inline-flex align-items-center mb-3"
        >
          <i className="bi bi-arrow-left me-1"></i> Back to results
        </Link>
        <div className="rd-header__top d-flex flex-wrap align-items-start justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h2 className="rd-title mb-0">{title}</h2>
              {version > 0 ? <span className="rd-version-badge">Version {version}</span> : null}
            </div>
            <div className="rd-meta text-muted small mt-1 d-flex align-items-center gap-2">
              {(data.totalRows ?? rows.length).toLocaleString()} companies
              {data.totalMatches && data.totalMatches > 0
                ? ` · ${data.totalMatches.toLocaleString()} strong fits`
                : ''}
            </div>
            {!resultId.startsWith('fv_') && (
              <div className="mt-2">
                <DealLinkControl resultId={resultId} title={title} />
              </div>
            )}
          </div>
          <div className="rd-header__actions d-flex flex-wrap align-items-center gap-2">
            {counts.avg != null && (
              <div className="rd-avg-score me-2">
                <div className="rd-avg-score__label">Avg. score</div>
                <div className="rd-avg-score__value">{counts.avg.toFixed(1)}</div>
              </div>
            )}
            {!resultId.startsWith('fv_') && (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                  onClick={handleUseSettings}
                  title="Load these settings into the builder"
                >
                  <i className="bi bi-sliders me-1" aria-hidden="true" /> Use settings
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                  onClick={editAndRerun}
                >
                  <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" /> Edit criteria
                  &amp; re-run
                </button>
                <EnrichDropdown
                  resultId={resultId}
                  listType={listType}
                  enrichJob={enrichJob}
                  onStart={setEnrichJob}
                />
                <CustomColumnButton resultId={resultId} onComplete={invalidate} />
              </>
            )}
            <a className="btn btn-sm rd-btn-primary" href={resultsService.downloadUrl(resultId)}>
              <i className="bi bi-download me-1" aria-hidden="true" />
              Export
            </a>
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center${
                showRunDetails ? ' rd-btn-primary text-white' : ' btn-outline-secondary'
              }`}
              onClick={() => setShowRunDetails((s) => !s)}
              aria-expanded={showRunDetails}
            >
              <i className="bi bi-clipboard-data me-1" aria-hidden="true" />
              {showRunDetails ? 'Hide run details' : 'Run details'}
            </button>
          </div>
        </div>

        {!resultId.startsWith('fv_') && (
          <div className="mt-4">
            <EmailNudgeBanner />
          </div>
        )}
      </div>

      <VersionSiblings currentId={resultId} versions={data.versions} />

      {showRunDetails && runSummary && (
        <div className="rd-run-details mt-3 mb-4">
          <FilesProcessingSummary summary={runSummary} resultsCount={rows.length} />
          {(runSummary.filesUploaded?.length ?? 0) > 0 && (
            <InputFilesUsed files={runSummary.filesUploaded} resultId={resultId} variant="detail" />
          )}
        </div>
      )}
      <FitSummaryCards
        counts={{ fit: counts.fit, partial: counts.partial, no: counts.no }}
        filter={fitFilter}
        onFilter={handleFitCardFilter}
      />

      <div className="rd-results-bar d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4 mb-3">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h3 className="rd-results-title mb-0">
            <i className="bi bi-table me-2" aria-hidden="true" />
            Results Table
          </h3>
          <span className="rd-results-count">
            {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} results
          </span>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {selected.size > 0 && <span className="small text-muted">{selected.size} selected</span>}
          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center${
              showTableFilters ? ' rd-btn-primary text-white' : ' btn-outline-secondary'
            }`}
            onClick={() => setShowTableFilters((s) => !s)}
            aria-expanded={showTableFilters}
          >
            <i className="bi bi-funnel me-1" aria-hidden="true" />
            Filters
            {hasActiveFilters && <span className="rd-filter-badge">{activeFilterCount}</span>}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                resetTableFilters();
                setFitFilter('all');
              }}
            >
              <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </div>

      {showTableFilters && (
        <div className="rd-table-filters mb-3">
          <FilterControlsPanel
            filters={filters}
            setFilters={setFilters}
            sourceOptions={sourceOptions}
            countryOptions={countryOptions}
          />
        </div>
      )}

      {selected.size > 0 && (
        <div className="d-flex align-items-center justify-content-between p-2 px-3 mb-3 rd-selected-bar border rounded">
          <div className="d-flex align-items-center gap-3">
            <span className="fw-semibold small">{selected.size} selected</span>
            <button
              className="btn btn-link btn-sm fw-semibold text-decoration-none p-0"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          </div>
          <AddToDealButton
            records={bulkRecords}
            sourceResultId={resultId}
            className="btn btn-sm text-white"
            icon={<i className="bi bi-plus me-1"></i>}
            label={`Add to Deal (${selected.size})`}
            style={{ backgroundColor: '#282561' }}
          />
        </div>
      )}

      <div className="rd-table-wrap" ref={scrollRef}>
        <FixedResultsTable
          columns={columns}
          rows={filtered}
          resultId={resultId}
          panelWidth={panelWidth}
          enrichByCompany={enrichJob?.byCompany}
          priorContacts={priorContacts}
          selected={selected}
          allSelected={allSelected}
          onToggleSelect={(name) => {
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(name)) next.delete(name);
              else next.add(name);
              return next;
            });
          }}
          onToggleSelectAll={() => {
            setSelected((prev) => {
              if (allSelected) return new Set();
              return new Set([...prev, ...visibleNames]);
            });
          }}
          onSaved={invalidate}
        />
      </div>
    </div>
  );
}
