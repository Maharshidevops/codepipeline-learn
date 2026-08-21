// Firm-detail Signals tab (F30.2) — replaces the F23.4 placeholder. Fetches the per-firm signal
// bundle (GET /api/pe/signals/firms/:id) and renders it as stat tiles + tables (NO chart library, per
// the F30.2 decision): median realized hold + exited sample, over-hold count/ratio, investments/yr
// with last-2y/5y, current-holdings dated coverage; an AppetiteBadge (with reasons); sector/geo MIX
// TABLES (all-time vs recent, with pct columns); and roll-up cards (platform + add-ons, active flag,
// next-add-on profile). A recentYears selector (1..10) is wired to the query param so the recent-mix +
// cadence recompute server-side. Contract: backend REF-API-CONTRACT.md §PE Dataset — Signals.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, Spinner } from '@/components/ui';
import { AppetiteBadge } from '@/components/pe/SignalBadges';
import { peSignalsService } from '@/services/api';
import { peSignalsKeys } from './peSignalsKeys';
import type { PEFirmMix, PEMixEntry, PERollup } from '@/types';
import '@/styles/pages/pe-firm-detail.css';

const RECENT_YEARS_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const y = i + 1;
  return { value: String(y), label: `Last ${y} year${y === 1 ? '' : 's'}` };
});

function num(v: number | null | undefined, suffix = ''): string {
  return v == null ? '—' : `${v}${suffix}`;
}

function pct(ratio: number | null | undefined): string {
  return ratio == null ? '—' : `${Math.round(ratio * 100)}%`;
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="col-sm-6 col-lg-3">
      <div className="card h-100 p-3">
        <div className="text-muted small text-uppercase">{label}</div>
        <div className="h4 mb-0">{value}</div>
        {sub != null && <div className="text-muted small">{sub}</div>}
      </div>
    </div>
  );
}

function MixTable({
  title,
  all,
  recent,
  recentYears,
}: {
  title: string;
  all: PEMixEntry[];
  recent: PEMixEntry[];
  recentYears: number;
}) {
  // Union of labels across both windows, ordered by all-time count then recent count.
  const byLabel = new Map<string, { all?: PEMixEntry; recent?: PEMixEntry }>();
  for (const e of all) byLabel.set(e.label, { ...byLabel.get(e.label), all: e });
  for (const e of recent) byLabel.set(e.label, { ...byLabel.get(e.label), recent: e });
  const rows = Array.from(byLabel.entries()).sort(
    (a, b) =>
      (b[1].all?.count ?? 0) - (a[1].all?.count ?? 0) ||
      (b[1].recent?.count ?? 0) - (a[1].recent?.count ?? 0),
  );

  return (
    <div className="col-lg-6">
      <h3 className="h6">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-muted small">No data.</p>
      ) : (
        <div className="pfd-table-wrap">
          <table className="pfd-table">
            <thead className="pfd-table__head">
              <tr>
                <th scope="col">Label</th>
                <th scope="col" className="pfd-table__num">
                  All-time
                </th>
                <th scope="col" className="pfd-table__num">
                  All-time %
                </th>
                <th scope="col" className="pfd-table__num">
                  Last {recentYears}y
                </th>
                <th scope="col" className="pfd-table__num">
                  Last {recentYears}y %
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, e]) => (
                <tr key={label} className="pfd-table__row">
                  <td>{label}</td>
                  <td className="pfd-table__num">{e.all?.count ?? 0}</td>
                  <td className="pfd-table__num pfd-table__muted">
                    {e.all ? `${e.all.pct}%` : '—'}
                  </td>
                  <td className="pfd-table__num">{e.recent?.count ?? 0}</td>
                  <td className="pfd-table__num pfd-table__muted">
                    {e.recent ? `${e.recent.pct}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MixTables({ mix }: { mix: PEFirmMix }) {
  return (
    <div className="row g-4">
      <MixTable
        title="Sector mix"
        all={mix.sectorMix.all}
        recent={mix.sectorMix.recent}
        recentYears={mix.recentYears}
      />
      <MixTable
        title="Geography mix"
        all={mix.geoMix.all}
        recent={mix.geoMix.recent}
        recentYears={mix.recentYears}
      />
    </div>
  );
}

function RollupCard({ rollup }: { rollup: PERollup }) {
  return (
    <div className="col-md-6 col-xl-4">
      <div className="card h-100 p-3" data-testid="rollup-card">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <h3 className="h6 mb-0">{rollup.sector}</h3>
          <span
            className={`badge rounded-pill ${rollup.active ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'}`}
          >
            {rollup.active ? 'Active' : 'Dormant'}
          </span>
        </div>
        <div className="text-muted small mb-2">
          {rollup.totalDeals} deal{rollup.totalDeals === 1 ? '' : 's'} · {rollup.currentCount}{' '}
          current · {rollup.exitedCount} exited
          {rollup.firstYear != null && ` · ${rollup.firstYear}–${rollup.lastDealYear ?? ''}`}
        </div>
        {rollup.platform && (
          <div className="mb-2">
            <span className="text-muted small text-uppercase d-block">Platform</span>
            <span className="fw-medium">{rollup.platform.companyName ?? '—'}</span>
            {rollup.platform.year != null && (
              <span className="text-muted small"> ({rollup.platform.year})</span>
            )}
            <span className="text-muted small"> · {rollup.platform.status}</span>
          </div>
        )}
        {rollup.addOns.length > 0 && (
          <div className="mb-2">
            <span className="text-muted small text-uppercase d-block">
              Add-ons ({rollup.addOns.length})
            </span>
            <ul className="list-unstyled mb-0 small">
              {rollup.addOns.map((a, i) => (
                <li key={`${a.companyName ?? 'addon'}-${i}`}>
                  {a.companyName ?? '—'}
                  {a.year != null && <span className="text-muted"> ({a.year})</span>}
                  <span className="text-muted"> · {a.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {rollup.nextAddOnProfile && (
          <div className="mt-auto pt-2 border-top">
            <span className="text-muted small text-uppercase d-block">Likely next add-on</span>
            <span className="small">
              {rollup.nextAddOnProfile.sector}
              {rollup.nextAddOnProfile.geography && ` · ${rollup.nextAddOnProfile.geography}`}
            </span>
            {rollup.nextAddOnProfile.note && (
              <div className="text-muted small">{rollup.nextAddOnProfile.note}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FirmSignalsTab({ firmId }: { firmId: string }) {
  const [recentYears, setRecentYears] = useState(5);

  const { data, isPending, isError } = useQuery({
    queryKey: peSignalsKeys.firm(firmId, recentYears),
    queryFn: () => peSignalsService.getFirmSignals(firmId, recentYears),
    staleTime: 60_000,
    enabled: !!firmId,
  });

  if (isPending) return <Spinner />;
  if (isError || !data)
    return <p className="text-muted">Signals are not available for this firm.</p>;

  const { holdPeriod, currentHoldings, cadence, appetite, mix, rollups } = data;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Acquisition appetite:</span>
          <AppetiteBadge tier={appetite.tier} score={appetite.score} reasons={appetite.reasons} />
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="form-label mb-0">Recent window</span>
          <Select
            value={String(recentYears)}
            onChange={(v) => setRecentYears(Number(v))}
            options={RECENT_YEARS_OPTIONS}
            aria-label="Recent window in years"
          />
        </div>
      </div>

      {/* Stat tiles. */}
      <div className="row g-3 mb-4">
        <StatTile
          label="Median realized hold"
          value={num(holdPeriod.medianHoldYears, 'y')}
          sub={`from ${holdPeriod.exitedSampleSize} exited`}
        />
        <StatTile
          label="Over-hold current"
          value={num(currentHoldings.overHoldCount)}
          sub={`${pct(currentHoldings.overHoldRatio)} of current`}
        />
        <StatTile
          label="Investments / year"
          value={num(cadence.investmentsPerYear)}
          sub={`${cadence.last2yCount} in 2y · ${cadence.last5yCount} in 5y`}
        />
        <StatTile
          label="Dated coverage"
          value={`${currentHoldings.withInvestmentDate} / ${currentHoldings.count}`}
          sub="current holdings with an investment date"
        />
      </div>

      {/* Sector / geo mix — tables, not charts. */}
      <div className="mb-4">
        <h2 className="h5 mb-3">Portfolio mix</h2>
        <MixTables mix={mix} />
      </div>

      {/* Roll-ups. */}
      <div className="mb-2">
        <h2 className="h5 mb-3">Roll-ups</h2>
        {rollups.length === 0 ? (
          <p className="text-muted">No roll-up clusters detected for this firm.</p>
        ) : (
          <div className="row g-3">
            {rollups.map((r) => (
              <RollupCard key={r.sector} rollup={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
