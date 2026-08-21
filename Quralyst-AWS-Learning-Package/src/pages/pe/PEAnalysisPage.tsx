// PE Dataset — Analysis Dashboard (F32.2).
// Visual + chart port of QURALYST-20 Analysis.tsx (ApexCharts ↔ Recharts).
// Tables keep pean-table overrides so global tables.css cannot restyle them.
import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AnalysisCard, KindChip } from '@/components/pe/analysis/AnalysisCard';
import {
  ActivityTrendChart,
  GeoClustersChart,
  HoldPeriodsChart,
  TopSectorsChart,
} from '@/components/pe/analysis/AnalysisCharts';
import {
  fmtNum,
  filterBlurb,
  groupBySector,
  SEGMENT_LABELS,
  SEGMENT_ORDER,
  sizeBlurb,
  WINDOW_LABELS,
  WINDOW_ORDER,
} from '@/components/pe/analysis/analysisUtils';
import { peAnalyticsKeys } from '@/components/pe/analysis/peAnalyticsKeys';
import { peAnalyticsService } from '@/services/api';
import { paths } from '@/routes/paths';
import type { PEAnalyticsSegment, PEAnalyticsWindow, PEGeoScope } from '@/types';
import '@/styles/pages/pe-analysis.css';

const STALE = 60_000;

const WINDOW_OPTIONS = WINDOW_ORDER.map((w) => ({ value: w, label: WINDOW_LABELS[w] }));
const SEGMENT_OPTIONS = SEGMENT_ORDER.map((s) => ({ value: s, label: SEGMENT_LABELS[s] }));
const SCOPE_OPTIONS: { value: PEGeoScope; label: string }[] = [
  { value: 'us', label: 'US states' },
  { value: 'global', label: 'Countries' },
];

interface PillOption {
  value: string;
  label: string;
}

function PillSelect({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`pean-pill${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="pean-pill__trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="pean-pill__value">{selected.label}</span>
        <i className="bi bi-chevron-down pean-pill__chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} className="pean-pill__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`pean-pill__option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                  {isSelected && <i className="bi bi-check2" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PEAnalysisPage() {
  const [window, setWindow] = useState<PEAnalyticsWindow>('12m');
  const [segment, setSegment] = useState<PEAnalyticsSegment>('all');
  const [scope, setScope] = useState<PEGeoScope>('us');

  const params = { window, segment };
  const blurb = filterBlurb(window, segment);

  const summary = useQuery({
    queryKey: peAnalyticsKeys.summary(params),
    queryFn: () => peAnalyticsService.getSummary(params),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const active = useQuery({
    queryKey: peAnalyticsKeys.mostActiveFirms(params, 10),
    queryFn: () => peAnalyticsService.getMostActiveFirms(params, 10),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const exits = useQuery({
    queryKey: peAnalyticsKeys.mostExits(params, 10),
    queryFn: () => peAnalyticsService.getMostExits(params, 10),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const sectors = useQuery({
    queryKey: peAnalyticsKeys.topSectors(params, 12),
    queryFn: () => peAnalyticsService.getTopSectors(params, 12),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const trend = useQuery({
    queryKey: peAnalyticsKeys.activityTrend(params),
    queryFn: () => peAnalyticsService.getActivityTrend(params),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const geo = useQuery({
    queryKey: peAnalyticsKeys.geographicClusters(params, scope, 15),
    queryFn: () => peAnalyticsService.getGeographicClusters(params, scope, 15),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const holdPeriods = useQuery({
    queryKey: peAnalyticsKeys.holdPeriods(params),
    queryFn: () => peAnalyticsService.getHoldPeriods(params),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const recentBySector = useQuery({
    queryKey: peAnalyticsKeys.recentBySector(params, 8, 5),
    queryFn: () => peAnalyticsService.getRecentBySector(params, 8, 5),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });

  const s = summary.data;
  const holdStats = holdPeriods.data?.stats;

  return (
    <div className="pean-page">
      <header className="pean-header">
        <div className="pean-header__text">
          <div className="pean-crumb" aria-label="Breadcrumb">
            <span>Private Equity</span>
            <i className="bi bi-chevron-right" aria-hidden="true" />
            <span className="pean-crumb__current">Analysis</span>
          </div>
          <h1 className="pean-title">Analysis</h1>
          <p className="pean-subtitle">
            Derived insights from the scraped portfolio and activity data.
          </p>
        </div>
        <div className="pean-controls">
          <PillSelect
            aria-label="Filter by size segment"
            options={SEGMENT_OPTIONS}
            value={segment}
            onChange={(v) => setSegment(v as PEAnalyticsSegment)}
          />
          <PillSelect
            aria-label="Filter by time window"
            options={WINDOW_OPTIONS}
            value={window}
            onChange={(v) => setWindow(v as PEAnalyticsWindow)}
          />
        </div>
      </header>

      {/* KPI row — Q20: 4 tiles */}
      <div className="pean-kpis" data-testid="summary-tiles">
        <StatTile label="New investments" value={s?.newInvestments} loading={!summary.data} />
        <StatTile label="Exits" value={s?.exits} loading={!summary.data} />
        <StatTile label="Active firms" value={s?.activeFirms} loading={!summary.data} />
        <StatTile label="Unique companies" value={s?.uniqueCompanies} loading={!summary.data} />
      </div>

      {/* Activity trend — full-width line chart */}
      <AnalysisCard
        title="Activity trend"
        description={`Monthly new investments vs. exits — ${blurb}.`}
        loading={!trend.data}
        isEmpty={(trend.data?.rows.length ?? 0) === 0}
        testId="card-trend"
      >
        <ActivityTrendChart rows={trend.data?.rows ?? []} />
      </AnalysisCard>

      {/* Most active firms (table) + Top sectors (bar chart) */}
      <div className="pean-grid">
        <AnalysisCard
          title="Top 10 most active firms"
          description="By new investments detected in window."
          loading={!active.data}
          isEmpty={(active.data?.rows.length ?? 0) === 0}
          testId="card-most-active"
        >
          <div className="pean-table-wrap">
            <div className="pean-table-scroll">
              <table className="pean-table">
                <thead>
                  <tr>
                    <th scope="col" className="pean-th--rank">
                      #
                    </th>
                    <th scope="col">Firm</th>
                    <th scope="col" className="pean-th--num">
                      New deals
                    </th>
                    <th scope="col">Size focus</th>
                  </tr>
                </thead>
                <tbody>
                  {(active.data?.rows ?? []).map((r, i) => (
                    <tr key={r.firmId}>
                      <td className="pean-td--rank pean-muted">{i + 1}</td>
                      <td>
                        <Link to={paths.pe.firm(r.firmId)}>{r.firmName ?? '—'}</Link>
                      </td>
                      <td className="pean-td--num pean-mono">{fmtNum(r.newInvestments)}</td>
                      <td className="pean-muted">{sizeBlurb(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnalysisCard>

        <AnalysisCard
          title="Top sectors"
          description="Companies added to portfolios in window, by sector tag."
          loading={!sectors.data}
          isEmpty={(sectors.data?.rows.length ?? 0) === 0}
          testId="card-top-sectors"
        >
          <TopSectorsChart rows={sectors.data?.rows ?? []} />
        </AnalysisCard>
      </div>

      {/* Geographic clustering + Hold period distribution */}
      <div className="pean-grid">
        <AnalysisCard
          title="Geographic clustering"
          icon="bi bi-geo-alt"
          description={
            scope === 'us'
              ? 'Top US states by portfolio holdings in window.'
              : 'Top countries by portfolio holdings in window.'
          }
          action={
            <PillSelect
              aria-label="Geographic scope"
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={(v) => setScope(v as PEGeoScope)}
            />
          }
          loading={!geo.data}
          isEmpty={(geo.data?.rows.length ?? 0) === 0}
          testId="card-geo"
        >
          <GeoClustersChart rows={geo.data?.rows ?? []} />
        </AnalysisCard>

        <AnalysisCard
          title="Hold period distribution"
          icon="bi bi-clock-history"
          description={
            <>
              Years held by cohort. Exited = actual investment→exit; Current = investment→today.
              {holdStats?.medianExitedYears != null && (
                <span data-testid="hold-stats">
                  {' '}
                  Median exited hold: <strong>{holdStats.medianExitedYears.toFixed(1)}y</strong>
                  {holdStats.avgCurrentYears != null && (
                    <>
                      ; avg current age: <strong>{holdStats.avgCurrentYears.toFixed(1)}y</strong>
                    </>
                  )}
                </span>
              )}
            </>
          }
          loading={!holdPeriods.data}
          isEmpty={(holdPeriods.data?.rows.length ?? 0) === 0}
          testId="card-hold-periods"
        >
          <HoldPeriodsChart rows={holdPeriods.data?.rows ?? []} />
        </AnalysisCard>
      </div>

      {/* Recent transactions by sector */}
      <AnalysisCard
        title="Recent transactions by sector"
        description="The 5 most recent investments and exits in each of the most active sectors for this window."
        loading={!recentBySector.data}
        isEmpty={(recentBySector.data?.rows.length ?? 0) === 0}
        testId="card-recent-by-sector"
      >
        <div className="pean-sectors">
          {groupBySector(recentBySector.data?.rows ?? []).map(([sector, txns]) => (
            <div key={sector}>
              <h3 className="pean-sector__title">{sector}</h3>
              <ul className="pean-sector__list">
                {txns.map((t, i) => (
                  <li key={`${t.firmId}-${t.companyName}-${i}`} className="pean-sector__item">
                    <div className="pean-sector__item-content">
                      <div className="pean-sector__top-row">
                        <span className="pean-sector__company" title={t.companyName ?? undefined}>
                          {t.companyName ?? '—'}
                        </span>
                        <KindChip kind={t.kind} />
                      </div>
                      <Link
                        to={paths.pe.firm(t.firmId)}
                        className="pean-sector__firm"
                        title={t.firmName ?? undefined}
                      >
                        {t.firmName ?? '—'}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AnalysisCard>

      {/* Top exits table */}
      <AnalysisCard
        title="Top 10 firms by exits"
        description="Removed holdings + status changes flagged as exited."
        loading={!exits.data}
        isEmpty={(exits.data?.rows.length ?? 0) === 0}
        testId="card-most-exits"
      >
        <div className="pean-table-wrap">
          <div className="pean-table-scroll">
            <table className="pean-table">
              <thead>
                <tr>
                  <th scope="col" className="pean-th--rank">
                    #
                  </th>
                  <th scope="col">Firm</th>
                  <th scope="col" className="pean-th--num">
                    Exits
                  </th>
                </tr>
              </thead>
              <tbody>
                {(exits.data?.rows ?? []).map((r, i) => (
                  <tr key={r.firmId}>
                    <td className="pean-td--rank pean-muted">{i + 1}</td>
                    <td>
                      <Link to={paths.pe.firm(r.firmId)}>{r.firmName ?? '—'}</Link>
                    </td>
                    <td className="pean-td--num pean-mono">{fmtNum(r.exits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AnalysisCard>

      <p className="pean-footnote">
        Activity is derived from{' '}
        {s?.eligibleFirms != null
          ? `${fmtNum(s.eligibleFirms)} eligible firms`
          : 'the firm universe'}{' '}
        matching the selected segment. New-investment events reflect holdings detected by the
        scraper after a firm was onboarded — they approximate, but do not perfectly track,
        real-world deal close dates.
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | null | undefined;
  loading: boolean;
}) {
  return (
    <div className="pean-kpi" data-testid={`stat-${label}`}>
      {loading ? (
        <span className="pean-kpi__skel" aria-hidden="true" />
      ) : (
        <p className="pean-kpi__value">{fmtNum(value)}</p>
      )}
      <p className="pean-kpi__label">{label}</p>
    </div>
  );
}
