// PE Dataset — Exit Watch (F30.2). Ranked table of current portfolio companies by exit
// readiness. UI port of QURALYST-20 ExitWatch.tsx; table CSS overrides global tables.css.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ReadinessChip } from '@/components/pe/SignalBadges';
import { downloadCsv } from '@/components/pe/screener/screenerUtils';
import { peSignalsService } from '@/services/api';
import { peSignalsKeys } from '@/components/pe/signals/peSignalsKeys';
import { paths } from '@/routes/paths';
import { openTearsheet } from '@/lib/tearsheet/openTearsheet';
import { BaseTable, Button, TruncatedCell } from '@/components/ui';
import type { PEReadinessTier, PEExitReadinessRow, PEExitReadinessTierFilter } from '@/types';
import '@/styles/pages/pe-exit-watch.css';

const LIMIT = 500;

type TierFilter = PEExitReadinessTierFilter | 'all';

const TIER_OPTIONS: { value: TierFilter; label: string }[] = [
  { value: 'all', label: 'All tiers' },
  { value: 'elevated', label: 'Exit likely' },
  { value: 'watch', label: 'Watch' },
  { value: 'low', label: 'Low' },
];

const TIER_LABEL: Partial<Record<PEReadinessTier, string>> = {
  elevated: 'Exit likely',
  watch: 'Watch',
  low: 'Low',
};

interface PillOption {
  value: string;
  label: string;
}

function PillSelect({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  'aria-label': string;
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
      className={`pew-pill${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        role="combobox"
        className="pew-pill__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="pew-pill__value">{selected?.label}</span>
        <i className="bi bi-chevron-down pew-pill__chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} className="pew-pill__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value || '__all'} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`pew-pill__option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
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

export default function PEExitWatchPage() {
  const [tier, setTier] = useState<TierFilter>('elevated');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');

  const query = {
    tier: tier === 'all' ? undefined : tier,
    limit: LIMIT,
  };

  const { data, isPending, isFetching } = useQuery({
    queryKey: peSignalsKeys.exitReadiness(query),
    queryFn: () => peSignalsService.getExitReadiness(query),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);

  const sectorOptions = useMemo<PillOption[]>(
    () => [
      { value: '', label: 'All sectors' },
      ...Array.from(new Set(rows.map((r) => r.sector).filter(Boolean) as string[]))
        .sort((a, b) => a.localeCompare(b))
        .map((s) => ({ value: s, label: s })),
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sector && r.sector !== sector) return false;
      if (!q) return true;
      return (
        (r.companyName ?? '').toLowerCase().includes(q) ||
        (r.firmName ?? '').toLowerCase().includes(q) ||
        (r.sector ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, sector]);

  function handleExport() {
    const headers = [
      'Readiness',
      'Score',
      'Company',
      'Firm',
      'Sector',
      'Geography',
      'Held (years)',
      'Firm Typical (years)',
      'Firm Typical Source',
      'Signal',
    ];
    downloadCsv(
      `exit-watch-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      filtered.map((r) => [
        TIER_LABEL[r.tier] ?? r.tier,
        r.score,
        r.companyName ?? '',
        r.firmName ?? '',
        r.sector ?? '',
        r.geography ?? '',
        r.holdingAgeYears ?? '',
        r.thresholdYears ?? '',
        r.thresholdSource ?? '',
        r.reasons.join(' · '),
      ]),
    );
  }

  const coverage = data?.coverage;

  return (
    <div className="pew-page">
      <header className="pew-header">
        <h1 className="pew-header__title">
          <i className="bi bi-door-open pew-header__icon" aria-hidden="true" />
          Exit Watch
        </h1>
        <p className="pew-header__sub">
          Current portfolio companies ranked by how likely they are to come to market — blending how
          long each firm has held them against its own typical hold, plus how actively the sector is
          seeing exits.
        </p>
      </header>

      {coverage && (
        <div className="pew-coverage" data-testid="coverage-tile">
          <p className="pew-coverage__value">
            {coverage.dated.toLocaleString()} / {coverage.currentTotal.toLocaleString()}
          </p>
          <p className="pew-coverage__label">
            Current holdings with an investment date (scored). The rest are unscored — an unscored
            holding is not the same as low readiness.
          </p>
        </div>
      )}

      <div className="pew-toolbar">
        <PillSelect
          className="pew-pill--tier"
          aria-label="Filter by readiness tier"
          options={TIER_OPTIONS}
          value={tier}
          onChange={(v) => setTier(v as TierFilter)}
        />
        <PillSelect
          className="pew-pill--sector"
          aria-label="Filter by sector"
          options={sectorOptions}
          value={sector}
          onChange={setSector}
        />
        <div className="pew-search">
          <i className="bi bi-search pew-search__icon" aria-hidden="true" />
          <input
            type="search"
            className="pew-input"
            placeholder="Search company, firm, or sector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search exit watch"
          />
        </div>
        {data && (
          <span className="pew-count">
            Showing {filtered.length.toLocaleString()} of {data.total.toLocaleString()} flagged
            holdings
          </span>
        )}
        <Button
          variant="secondary"
          size="sm"
          pill
          onClick={handleExport}
          disabled={filtered.length === 0}
          style={data ? undefined : { marginLeft: 'auto' }}
          icon={<i className="bi bi-download" aria-hidden="true" />}
        >
          Export CSV
        </Button>
      </div>

      <BaseTable<PEExitReadinessRow>
        columns={[
          {
            key: 'readiness',
            header: 'Readiness',
            headerClass: 'pew-th--ready',
            render: (r) => <ReadinessChip tier={r.tier} score={r.score} reasons={r.reasons} />,
          },
          {
            key: 'companyName',
            header: 'Company',
            headerClass: 'pew-th--company',
            cellClass: 'pew-td--company',
            render: (r) => (
              <TruncatedCell
                header="Company"
                value={r.companyName}
                maxWidth="16rem"
                extra={
                  r.companyName ? (
                    <Link
                      to={openTearsheet(r.companyName)}
                      className="pew-btn pew-btn--link ms-1"
                      title="Request Tearsheet"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Tearsheet
                    </Link>
                  ) : null
                }
              />
            ),
          },
          {
            key: 'firmName',
            header: 'Firm',
            render: (r) => (
              <TruncatedCell
                header="Firm"
                value={r.firmName}
                linkTo={paths.pe.firm(r.firmId)}
                maxWidth="14rem"
              />
            ),
          },
          {
            key: 'sectorGeo',
            header: 'Sector / Geo',
            render: (r) => (
              <div className="pew-sector">
                {r.sector && <span className="pew-sector__name">{r.sector}</span>}
                {r.geography && (
                  <span className="pew-geo">
                    <i className="bi bi-geo-alt" aria-hidden="true" />
                    {r.geography}
                  </span>
                )}
                {!r.sector && !r.geography && <span className="pew-geo">—</span>}
              </div>
            ),
          },
          {
            key: 'holdingAgeYears',
            header: 'Held',
            align: 'right',
            render: (r) => (r.holdingAgeYears != null ? `${r.holdingAgeYears}y` : '—'),
          },
          {
            key: 'thresholdYears',
            header: 'Firm typical',
            align: 'right',
            render: (r) =>
              r.thresholdYears != null
                ? `${r.thresholdYears}y${r.thresholdSource === 'default' ? '*' : ''}`
                : '—',
          },
          {
            key: 'signal',
            header: 'Signal',
            render: (r) => <span className="pew-signal">{r.reasons.join(' · ')}</span>,
          },
        ]}
        rows={filtered}
        getRowKey={(r) => r.holdingId}
        loading={isPending}
        emptyMessage="No holdings match these filters."
        fetching={isFetching && !isPending}
      />

      <p className="pew-footnote">
        * Firm has no realized-exit history yet — a default expected hold is used instead of the
        firm&apos;s own median.
      </p>
    </div>
  );
}
