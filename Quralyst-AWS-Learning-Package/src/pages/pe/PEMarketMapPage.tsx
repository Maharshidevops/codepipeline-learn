// PE Market Map page (F38.2) — buyer universe + whitespace grid.
// Visual parity with QURALYST-20 MarketMap.tsx (stacked cards, navy header, filter row).
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Market Map (simplified vs raw Q20 types).
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Spinner } from '@/components/ui';
import { SelectFilter } from '@/components/pe/screener/screenerHelpers';
import {
  MARKET_MAP_BAND_LABELS,
  MARKET_MAP_SEGMENTS,
  peMarketMapKeys,
  whitespaceIntensityClass,
} from '@/components/pe/marketMap/peMarketMapKeys';
import { peMarketMapService } from '@/services/api';
import { paths } from '@/routes/paths';
import type { CheckSizeFit, MarketMapSegment } from '@/types';
import '@/styles/pages/pe-screener.css';
import '@/styles/pages/market-map.css';

function clampMinActivity(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 50);
}

function clampLimit(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 200);
}

function fmtSharePct(pct: number | undefined | null): string {
  if (pct == null || !Number.isFinite(pct)) return '0';
  return `${pct}`.replace(/\.0$/, '');
}

function ScoreBar({ value }: { value: number }) {
  const tone = value >= 55 ? 'high' : value >= 30 ? 'mid' : 'low';
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className="mm-score-bar" data-testid="mm-likelihood" data-tone={tone} title={`${value}`}>
      <div className="mm-score-bar-track" aria-hidden>
        <div
          className={`mm-score-bar-fill mm-score-bar-fill-${tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="mm-score-bar-value">{value}</span>
    </div>
  );
}

const FIT_META: Record<CheckSizeFit, { label: string; cls: string }> = {
  fits: { label: 'Fits', cls: 'mm-badge mm-badge--fits' },
  below: { label: 'Below band', cls: 'mm-badge mm-badge--below' },
  'no-filter': { label: '—', cls: 'mm-badge mm-badge--no-filter' },
};

function AppetiteTierBadge({ tier }: { tier: string }) {
  const cls =
    tier === 'high'
      ? 'mm-badge mm-badge--high'
      : tier === 'moderate'
        ? 'mm-badge mm-badge--moderate'
        : tier === 'dormant'
          ? 'mm-badge mm-badge--dormant'
          : 'mm-badge mm-badge--low';
  const tone =
    tier === 'high'
      ? 'success'
      : tier === 'moderate'
        ? 'warning'
        : tier === 'dormant'
          ? 'secondary'
          : 'neutral';
  return (
    <Badge tone={tone} className={cls} data-testid="appetite-badge" data-tier={tier}>
      {tier}
    </Badge>
  );
}

function bandLabel(band?: string | null): string {
  if (!band) return '—';
  if (band in MARKET_MAP_BAND_LABELS) {
    return MARKET_MAP_BAND_LABELS[band as MarketMapSegment];
  }
  return band;
}

export default function PEMarketMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sector = searchParams.get('sector') ?? '';
  const geo = searchParams.get('geo') ?? '';
  const segment = (searchParams.get('segment') ?? '') as MarketMapSegment | '';
  const [minActivity, setMinActivity] = useState(1);
  const [limit, setLimit] = useState(50);

  function patch(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (!v) params.delete(k);
      else params.set(k, v);
    }
    setSearchParams(params);
  }

  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: peMarketMapKeys.options(),
    queryFn: () => peMarketMapService.getOptions(),
    staleTime: 60_000,
  });

  const sectorOptions = useMemo(
    () =>
      (options?.sectors ?? []).map((s) => ({
        value: s.sector,
        label: `${s.sector} (${s.deals})`,
      })),
    [options?.sectors],
  );

  // Default to top sector once options load (matching Replit MarketMap.tsx)
  const topSector = options?.sectors?.[0]?.sector;
  useEffect(() => {
    if (!sector && topSector) {
      patch({ sector: topSector });
    }
  }, [sector, topSector, patch]);

  const buyersEnabled = Boolean(sector);
  const {
    data: buyers,
    isFetching: buyersFetching,
    isError: buyersError,
  } = useQuery({
    queryKey: peMarketMapKeys.buyers({
      sector,
      geo: geo || undefined,
      segment: segment || undefined,
    }),
    queryFn: () =>
      peMarketMapService.getBuyers({
        sector,
        geo: geo || undefined,
        segment: segment || undefined,
      }),
    enabled: buyersEnabled,
    staleTime: 60_000,
  });

  const wsMin = clampMinActivity(minActivity);
  const wsLimit = clampLimit(limit);
  const {
    data: whitespace,
    isFetching: wsFetching,
    isError: wsError,
  } = useQuery({
    queryKey: peMarketMapKeys.whitespace({
      segment: segment || undefined,
      sector: sector || undefined,
      minActivity: wsMin,
      limit: wsLimit,
    }),
    queryFn: () =>
      peMarketMapService.getWhitespace({
        segment: segment || undefined,
        sector: sector || undefined,
        minActivity: wsMin,
        limit: wsLimit,
      }),
    staleTime: 60_000,
  });

  const showFit = Boolean(segment);

  return (
    <div className="market-map-page">
      <header className="mm-header">
        <div className="mm-crumb">
          <span>Private Equity</span>
          <i className="bi bi-chevron-right" aria-hidden />
          <span className="mm-crumb__current">Market Map</span>
        </div>
        <h1 className="mm-title">
          <i className="bi bi-map" aria-hidden />
          Market Map
        </h1>
        <p className="mm-subtitle">
          Pick a sector to see who is most likely to buy in it right now — ranked by acquisition
          appetite, revealed thesis, recency, and check-size fit — plus active consolidators and
          underserved whitespace.
        </p>
      </header>

      {optionsLoading ? (
        <Spinner />
      ) : (
        <div className="mm-filters">
          <div className="mm-filter mm-filter--sector">
            <span className="mm-filter__label">Sector</span>
            <SelectFilter
              value={sector}
              onChange={(v) => patch({ sector: v || undefined })}
              options={sectorOptions}
              placeholder="Choose a sector"
              ariaLabel="Sector"
            />
          </div>
          <div className="mm-filter mm-filter--geo">
            <span className="mm-filter__label">Geography</span>
            <SelectFilter
              value={geo}
              onChange={(v) => patch({ geo: v || undefined })}
              options={(options?.regions ?? []).map((r) => ({
                value: r.region,
                label: `${r.region} (${r.deals})`,
              }))}
              placeholder="All regions"
              ariaLabel="Geography"
            />
          </div>
          <div className="mm-filter mm-filter--segment">
            <span className="mm-filter__label">Size band</span>
            <SelectFilter
              value={segment}
              onChange={(v) => patch({ segment: v || undefined })}
              options={MARKET_MAP_SEGMENTS.filter((s) => s.value).map((s) => ({
                value: s.value,
                label: s.label,
              }))}
              placeholder="All sizes"
              ariaLabel="Size band"
            />
          </div>
        </div>
      )}

      {/* Buyer universe */}
      <section className="mm-card" data-testid="mm-buyers-panel">
        <div className="mm-card__header">
          <h2 className="mm-card__title">
            <i className="bi bi-buildings" aria-hidden />
            Buyer universe
            {sector ? <span className="mm-card__title-muted">· {sector}</span> : null}
          </h2>
          <p className="mm-card__desc" data-testid="mm-buyers-summary">
            {buyers
              ? `${buyers.total} firm${buyers.total === 1 ? '' : 's'} with revealed activity in this sector · ${buyers.consolidatorCount} active consolidator${buyers.consolidatorCount === 1 ? '' : 's'}`
              : 'Firms ranked by how likely they are to buy in this sector'}
          </p>
          {buyers && buyers.total > 0 ? (
            <div className="mm-card__toolbar">
              <span className="mm-chip" data-testid="mm-total">
                {buyers.total} buyers
              </span>
              <span className="mm-chip mm-chip--primary" data-testid="mm-consolidators">
                {buyers.consolidatorCount} consolidators
              </span>
              {buyers.geo ? (
                <span className="mm-chip mm-chip--info" data-testid="mm-geo-pill">
                  {buyers.geo}
                </span>
              ) : null}
              <Link
                to={`${paths.pe.screener}?sector=${encodeURIComponent(sector)}`}
                className="mm-screener-link"
                data-testid="mm-screener-link"
              >
                Screen these firms →
              </Link>
            </div>
          ) : null}
        </div>
        <div className="mm-card__body">
          {!sector ? (
            <div className="mm-empty" data-testid="mm-pick-sector">
              Choose a sector to begin.
            </div>
          ) : buyersFetching && !buyers ? (
            <div className="mm-loading" aria-busy>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mm-skel" />
              ))}
            </div>
          ) : buyersError ? (
            <p className="mm-error">Couldn&apos;t load the buyer universe. Try again.</p>
          ) : (buyers?.total ?? 0) === 0 ? (
            <div className="mm-empty" data-testid="mm-buyers-empty">
              No firms with revealed activity in this sector/filter.
            </div>
          ) : (
            <div className="mm-table-wrap">
              <div className="mm-table-scroll">
                <table className="mm-table">
                  <thead>
                    <tr>
                      <th className="mm-rank">#</th>
                      <th>Firm</th>
                      <th>Buying likelihood</th>
                      <th>Appetite</th>
                      <th>Sector deals</th>
                      <th>Last buy</th>
                      <th>Consolidator</th>
                      {showFit ? <th>Check-size fit</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {buyers!.rows.slice(0, 100).map((row, i) => {
                      const fit = FIT_META[row.checkSize.fit] ?? FIT_META['no-filter'];
                      return (
                        <tr
                          key={`${row.firmId}-${i}`}
                          data-testid="mm-buyer-row"
                          className={row.lowConfidence ? 'is-low-confidence' : undefined}
                        >
                          <td className="mm-rank">{i + 1}</td>
                          <td>
                            {row.firmId ? (
                              <Link to={paths.pe.firm(row.firmId)} className="mm-firm-link">
                                {row.firmName}
                              </Link>
                            ) : (
                              <span className="fw-medium">{row.firmName}</span>
                            )}
                            {(row.reasons?.length ?? 0) > 0 ? (
                              <div className="mm-firm-reasons" data-testid="mm-firm-reasons">
                                {row.reasons.slice(0, 3).join(' · ')}
                              </div>
                            ) : null}
                            {row.lowConfidence ? (
                              <span className="mm-low-conf">Low confidence</span>
                            ) : null}
                          </td>
                          <td>
                            <ScoreBar value={row.buyingLikelihood} />
                          </td>
                          <td>
                            <AppetiteTierBadge tier={row.appetite.tier} />
                          </td>
                          <td className="tabular-nums" data-testid="mm-sector-deals">
                            <span className="fw-medium">{row.sectorDeals}</span>
                            <span className="mm-share"> ({fmtSharePct(row.sectorSharePct)}%)</span>
                          </td>
                          <td className="tabular-nums mm-muted" data-testid="mm-last-buy">
                            {row.lastSectorYear ?? '—'}
                          </td>
                          <td>
                            {row.consolidator?.active ? (
                              <span
                                className="mm-badge mm-badge--consolidator"
                                data-testid="mm-consolidator"
                              >
                                <i className="bi bi-layers" aria-hidden />
                                {row.consolidator.totalDeals} deals
                              </span>
                            ) : (
                              <span className="mm-muted">—</span>
                            )}
                          </td>
                          {showFit ? (
                            <td>
                              <div className="mm-fit-cell">
                                <span
                                  className={fit.cls}
                                  data-testid="mm-fit"
                                  data-fit={row.checkSize.fit}
                                >
                                  {fit.label}
                                </span>
                                {row.checkSize.band ? (
                                  <span className="mm-fit-band">
                                    {bandLabel(row.checkSize.band)}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Whitespace */}
      <section className="mm-card" data-testid="mm-whitespace-panel">
        <div className="mm-card__header">
          <h2 className="mm-card__title mm-card__title--ws">
            <i className="bi bi-stars" aria-hidden />
            Whitespace
            {sector ? <span className="mm-card__title-muted">· {sector}</span> : null}
          </h2>
          <p className="mm-card__desc">
            Sector × region × size cells with rising recent deal activity but few specialized buyers
            — underserved pockets worth a closer look.
          </p>
          <div className="mm-ws-controls">
            <div className="mm-filter">
              <label className="mm-filter__label" htmlFor="mm-min-activity">
                Min activity
              </label>
              <input
                id="mm-min-activity"
                type="number"
                className="form-control form-control-sm"
                min={1}
                max={50}
                value={minActivity}
                onChange={(e) => setMinActivity(clampMinActivity(Number(e.target.value)))}
                data-testid="mm-min-activity"
              />
            </div>
            <div className="mm-filter">
              <label className="mm-filter__label" htmlFor="mm-limit">
                Limit
              </label>
              <input
                id="mm-limit"
                type="number"
                className="form-control form-control-sm"
                min={1}
                max={200}
                value={limit}
                onChange={(e) => setLimit(clampLimit(Number(e.target.value)))}
                data-testid="mm-limit"
              />
            </div>
            {wsFetching ? <Spinner size="sm" /> : null}
          </div>
        </div>
        <div className="mm-card__body">
          {wsFetching && !whitespace ? (
            <div className="mm-loading" aria-busy>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mm-skel" />
              ))}
            </div>
          ) : wsError ? (
            <p className="mm-error">Couldn&apos;t load whitespace cells. Try again.</p>
          ) : (whitespace?.rows.length ?? 0) === 0 ? (
            <div className="mm-empty" data-testid="mm-ws-empty">
              <p>No whitespace cells match the current filters.</p>
              <p className="mm-empty__hint">
                Whitespace needs holdings with a parseable investment year and location, plus firms
                with size criteria (EBITDA / revenue / equity). Keep Min activity at 1, then on
                Firms run Fill missing criteria if the grid stays empty.
              </p>
            </div>
          ) : (
            <div className="mm-table-wrap">
              <div className="mm-table-scroll">
                <table className="mm-table">
                  <thead>
                    <tr>
                      <th>Sector</th>
                      <th>Region</th>
                      <th>Band</th>
                      <th>Recent vs prior</th>
                      <th>Specialized buyers</th>
                      <th>Score</th>
                      <th>Active firms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whitespace!.rows.map((row, i) => {
                      const heat = whitespaceIntensityClass(row.whitespaceScore);
                      return (
                        <tr
                          key={`${row.sector}-${row.region}-${row.band ?? i}`}
                          data-testid="mm-ws-row"
                        >
                          <td>
                            <button
                              type="button"
                              className="mm-sector-btn"
                              onClick={() => patch({ sector: row.sector })}
                            >
                              {row.sector}
                            </button>
                          </td>
                          <td className="mm-muted">{row.region}</td>
                          <td>
                            <span className="mm-badge mm-badge--band">{bandLabel(row.band)}</span>
                          </td>
                          <td className="tabular-nums">
                            <span className="fw-medium text-success">{row.recentDeals}</span>
                            <span className="mm-share"> vs {row.priorDeals}</span>
                          </td>
                          <td className="tabular-nums mm-muted">{row.specializedBuyers}</td>
                          <td>
                            <span
                              className={`mm-ws-score-pill ${heat}`}
                              data-testid="mm-ws-score"
                              data-intensity={heat}
                            >
                              {row.whitespaceScore}
                            </span>
                          </td>
                          <td className="mm-muted text-xs">
                            {row.exampleFirms?.join(', ') || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
