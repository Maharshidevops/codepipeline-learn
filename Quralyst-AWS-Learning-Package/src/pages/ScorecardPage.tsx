// Outcome Scorecard (Tier A / A5). How buyer-list predictions track against real settled outcomes.
// Sections: KPI cards · prediction calibration matrix · outcomes by score band · original rank of
// eventual wins · per-run "By buyer list" table (each expandable to its own matrix/bands/ranks).
//
// Run-bounded, not time-windowed: the selector chooses how many recent runs (with real signal) to
// include. Lost and Dead are merged into one "Lost" column — both are settled-negative. Rates are
// null (rendered "—") when there is nothing to divide by; a literal 0% is a real measurement.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, BaseTable } from '@/components/ui';
import {
  outcomesService,
  type Scorecard,
  type ScorecardMatrix,
  type ScorecardRun,
  type ScoreBands,
} from '@/services/api';
import { paths } from '@/routes/paths';
import { useToast } from '@/hooks/useToast';
import '@/styles/pages/scorecard.css';

const RUN_LIMITS = [
  { limit: 10, label: 'Last 10 runs' },
  { limit: 50, label: 'Last 50 runs' },
  { limit: 200, label: 'Last 200 runs' },
  { limit: 500, label: 'All runs' },
];

interface FitRow {
  key: 'fit' | 'partial' | 'no';
  label: string;
  color: string;
}

const FIT_ROWS: FitRow[] = [
  { key: 'fit', label: 'Predicted: Fit', color: '#34d399' },
  { key: 'partial', label: 'Predicted: Partial fit', color: '#fbbf24' },
  { key: 'no', label: 'Predicted: No fit', color: '#f87171' },
];

/** null (undecided) reads as "—", never 0% — a rate of zero is a real measurement, not "no data". */
const pct = (rate: number | null | undefined) =>
  rate === null || rate === undefined ? '—' : `${Math.round(rate * 100)}%`;

/** Counts must render 0; only missing values become "—". */
const count = (n: number | null | undefined) => (n == null ? '—' : n);

const kindLabel = (kind: ScorecardRun['result_kind']) =>
  kind === 'financial' ? 'Financial' : 'Processed';

/** won / (won + lost), or null when the bucket is undecided. */
const rowRate = (won: number, lost: number): number | null => {
  const decided = won + lost;
  return decided ? won / decided : null;
};

const median = (nums: number[]): number | null => {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Score bands high→low by their numeric start ("80-100" before "60-79"). */
const orderedBands = (bands: ScoreBands): [string, ScoreBands[string]][] =>
  Object.entries(bands).sort((a, b) => parseInt(b[0], 10) - parseInt(a[0], 10));

const runHref = (run: ScorecardRun): string =>
  run.result_kind === 'financial'
    ? paths.financialVerticalsResults(run.result_id)
    : paths.viewResult(run.result_id);

// ─────────────────────────── shared sub-views ───────────────────────────

function CalibrationMatrix({
  matrix,
  compact = false,
}: {
  matrix: ScorecardMatrix;
  compact?: boolean;
}) {
  return (
    <BaseTable<FitRow>
      compact={compact}
      borderless
      columns={[
        {
          key: 'label',
          header: '',
          render: (r: FitRow) => <span style={{ color: r.color, fontWeight: 600 }}>{r.label}</span>,
        },
        {
          key: 'won',
          header: 'Won',
          align: 'center',
          render: (r: FitRow) => count(matrix[r.key].won),
        },
        {
          key: 'lost',
          header: 'Lost',
          align: 'center',
          render: (r: FitRow) => count(matrix[r.key].lost),
        },
        {
          key: 'winRate',
          header: 'Win rate',
          align: 'center',
          cellClass: 'fw-semibold',
          render: (r: FitRow) => pct(rowRate(matrix[r.key].won, matrix[r.key].lost)),
        },
      ]}
      rows={FIT_ROWS}
      getRowKey={(r: FitRow) => r.key}
    />
  );
}

function ScoreBandTable({ bands, compact = false }: { bands: ScoreBands; compact?: boolean }) {
  const rows = orderedBands(bands);
  const hasData = rows.some(([, c]) => c.total > 0);
  if (!hasData) return <p className="text-muted small mb-0">No scored outcomes yet.</p>;
  return (
    <BaseTable
      compact={compact}
      borderless
      columns={[
        {
          key: 'label',
          header: 'Score band',
          render: ([label]) => label,
        },
        {
          key: 'firms',
          header: 'Firms',
          align: 'center',
          render: ([, c]) => count(c.total),
        },
        {
          key: 'won',
          header: 'Won',
          align: 'center',
          render: ([, c]) => count(c.won),
        },
        {
          key: 'lost',
          header: 'Lost',
          align: 'center',
          render: ([, c]) => count(c.lost),
        },
        {
          key: 'winRate',
          header: 'Win rate',
          align: 'center',
          cellClass: 'fw-semibold',
          render: ([, c]) => pct(rowRate(c.won, c.lost)),
        },
      ]}
      rows={rows}
      getRowKey={([label]) => label}
    />
  );
}

function WonRankChips({ ranks }: { ranks: number[] }) {
  if (!ranks.length) return null;
  const med = median(ranks);
  return (
    <div>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {ranks.map((rank, i) => (
          <span
            key={`${rank}-${i}`}
            className="badge"
            style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', fontWeight: 600 }}
          >
            #{rank}
          </span>
        ))}
      </div>
      <p className="text-muted small mb-0">
        Median original rank of closed-won firms: <strong>#{med}</strong>. Lower is better — it
        means wins came from near the top of the list.
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: string;
  tone?: 'won' | 'lost';
}) {
  const color =
    tone === 'won' ? '#34d399' : tone === 'lost' ? '#f87171' : 'var(--color-text-primary, #333333)';
  return (
    <div
      className="criteria-card criteria-card--white p-3"
      style={{ flex: '1 1 160px', minWidth: 160 }}
    >
      <div className="d-flex align-items-center gap-2 text-muted small mb-1">
        <i className={`bi ${icon}`} aria-hidden="true" />
        {label}
      </div>
      <div
        style={{ fontSize: '1.6rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </div>
    </div>
  );
}

function RunDetail({ run }: { run: ScorecardRun }) {
  return (
    <td colSpan={7} className="sc-runs__detail">
      <div className="text-muted small mb-2">
        Progression rate: <strong>{pct(run.progression_rate)}</strong> (share of contacted firms
        that advanced past first contact)
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <div className="fw-semibold small mb-1">Prediction calibration</div>
          <CalibrationMatrix matrix={run.matrix} compact />
        </div>
        <div className="col-md-6">
          <div className="fw-semibold small mb-1">Outcomes by score band</div>
          <ScoreBandTable bands={run.score_bands} compact />
        </div>
      </div>
      {run.won_ranks.length > 0 && (
        <div className="mt-3">
          <div className="fw-semibold small mb-1">Original rank of wins</div>
          <WonRankChips ranks={run.won_ranks} />
        </div>
      )}
      <div className="mt-3">
        <Link to={runHref(run)} className="btn btn-sm btn-standard">
          Open buyer list <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </td>
  );
}

// ─────────────────────────── page ───────────────────────────

export default function ScorecardPage() {
  const toast = useToast();
  const [limitRuns, setLimitRuns] = useState(50);
  const [card, setCard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [openRun, setOpenRun] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    outcomesService
      .scorecard(limitRuns)
      .then((c) => {
        if (active) setCard(c);
      })
      .catch((e) => {
        if (active)
          toast.error((e as { message?: string })?.message ?? 'Failed to load scorecard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limitRuns]);

  const hasData = !!card && card.runs_included > 0;

  const kpis = useMemo(
    () =>
      card
        ? [
            { label: 'Closed / Won', value: card.won, icon: 'bi-trophy', tone: 'won' as const },
            { label: 'Lost / Dead', value: card.lost, icon: 'bi-x-circle', tone: 'lost' as const },
            { label: 'Win rate', value: pct(card.win_rate), icon: 'bi-percent' },
            { label: 'Progression rate', value: pct(card.progression_rate), icon: 'bi-graph-up' },
            { label: 'Runs w/ outcomes', value: card.runs_included, icon: 'bi-list-check' },
          ]
        : [],
    [card],
  );

  return (
    <div className="sc-page">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="page-title">Scorecard</h1>
          <p className="page-subtitle">
            How buyer-list predictions track against real-world deal outcomes. Outcomes flow back
            into scoring to calibrate future lists. Only settled outcomes count.
          </p>
        </div>
        <select
          className="form-select form-select-sm w-auto"
          value={limitRuns}
          onChange={(e) => setLimitRuns(Number(e.target.value))}
          aria-label="Runs included"
        >
          {RUN_LIMITS.map((r) => (
            <option key={r.limit} value={r.limit}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="org-tab-loading">
          <Spinner />
        </div>
      ) : !hasData ? (
        <div className="criteria-card criteria-card--white">
          <p className="text-muted mb-0">
            No outcomes recorded yet. Tag outcomes on a buyer list or move linked firms through a
            deal pipeline to populate this report.
          </p>
        </div>
      ) : (
        card && (
          <>
            {/* 1. KPI cards */}
            <div className="d-flex flex-wrap gap-3 mb-4">
              {kpis.map((k) => (
                <KpiCard key={k.label} {...k} />
              ))}
            </div>

            {/* 2. Prediction calibration matrix */}
            <div className="criteria-card criteria-card--white mb-4">
              <h3 className="api-keys-title mb-1">Prediction calibration</h3>
              <p className="text-muted small mb-3">
                A well-calibrated model wins more often on firms it predicted as a fit than on those
                it flagged as no-fit.
              </p>
              <CalibrationMatrix matrix={card.matrix} />
            </div>

            {/* 3. Outcomes by score band */}
            <div className="criteria-card criteria-card--white mb-4">
              <h3 className="api-keys-title mb-1">Outcomes by score band</h3>
              <p className="text-muted small mb-3">
                Win rate should climb with score. Higher bands winning less often than lower ones is
                a calibration warning.
              </p>
              <ScoreBandTable bands={card.score_bands} />
            </div>

            {/* 4. Original rank of eventual wins (hidden when empty) */}
            {card.won_ranks.length > 0 && (
              <div className="criteria-card criteria-card--white mb-4">
                <h3 className="api-keys-title mb-2">Original rank of eventual wins</h3>
                <WonRankChips ranks={card.won_ranks} />
              </div>
            )}

            {/* 5. By buyer list */}
            <div className="criteria-card criteria-card--white">
              <h3 className="api-keys-title mb-3">By buyer list</h3>
              {card.runs.length === 0 ? (
                <p className="text-muted mb-0">
                  No outcomes recorded yet. Tag outcomes on a buyer list or move linked firms
                  through a deal pipeline to populate this report.
                </p>
              ) : (
                <div className="sc-runs">
                  <BaseTable<ScorecardRun>
                    borderless
                    stickyHeader={false}
                    tableClass="sc-runs__table"
                    rows={card.runs}
                    getRowKey={(run) => run.result_id}
                    onRowClick={(run) =>
                      setOpenRun((cur) => (cur === run.result_id ? null : run.result_id))
                    }
                    isRowExpanded={(run) => openRun === run.result_id}
                    renderExpandedRow={(run) => <RunDetail run={run} />}
                    columns={[
                      {
                        key: 'expand',
                        header: '',
                        headerClass: 'sc-runs__expand',
                        cellClass: 'sc-runs__expand',
                        render: (run) => (
                          <i
                            className={`bi ${openRun === run.result_id ? 'bi-chevron-down' : 'bi-chevron-right'} sc-runs__chevron`}
                            aria-hidden="true"
                          />
                        ),
                      },
                      {
                        key: 'title',
                        header: 'List',
                        cellClass: 'sc-runs__name',
                        render: (run) => (
                          <div className="sc-runs__title">
                            <span className="sc-runs__name">{run.title || run.result_id}</span>
                            <span className="sc-runs__kind">{kindLabel(run.result_kind)}</span>
                          </div>
                        ),
                      },
                      {
                        key: 'firms',
                        header: 'Firms',
                        align: 'right',
                        headerClass: 'sc-runs__num',
                        cellClass: 'sc-runs__num',
                        render: (run) => count(run.total),
                      },
                      {
                        key: 'contacted',
                        header: 'Contacted',
                        align: 'right',
                        headerClass: 'sc-runs__num',
                        cellClass: 'sc-runs__num',
                        render: (run) => count(run.contacted),
                      },
                      {
                        key: 'won',
                        header: 'Won',
                        align: 'right',
                        headerClass: 'sc-runs__num',
                        cellClass: 'sc-runs__num sc-runs__won',
                        render: (run) => count(run.won),
                      },
                      {
                        key: 'lost',
                        header: 'Lost',
                        align: 'right',
                        headerClass: 'sc-runs__num',
                        cellClass: 'sc-runs__num sc-runs__lost',
                        render: (run) => count(run.lost),
                      },
                      {
                        key: 'winRate',
                        header: 'Win rate',
                        align: 'right',
                        headerClass: 'sc-runs__num',
                        cellClass: 'sc-runs__num fw-semibold',
                        render: (run) => pct(run.win_rate),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
