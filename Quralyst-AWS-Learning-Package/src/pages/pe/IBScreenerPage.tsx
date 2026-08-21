// IB Vertical — IB Screener page (F34.4).
// Port of Replit QURALYST-20/artifacts/pe-scraper/src/pages/IBScreener.tsx.
// Gated by RoleRoute role="pe_dataset". Types: `src/types/ib.ts`.
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fmtDealSize } from '@/components/pe/ib/ibUtils';
import { ibKeys } from '@/components/pe/ib/ibKeys';
import { ibService } from '@/services/api';
import { paths } from '@/routes/paths';
import type { IBTransaction } from '@/types';
import '@/styles/pages/ib-screener.css';

const PAGE_SIZE = 50;
const STALE = 60_000;

const DEAL_TYPE_COLORS: Record<string, string> = {
  'M&A': 'scr-badge--ma',
  'Sell-Side M&A': 'scr-badge--sellside',
  'Buy-Side M&A': 'scr-badge--buyside',
  IPO: 'scr-badge--ipo',
  Restructuring: 'scr-badge--restr',
  'Debt Advisory': 'scr-badge--debt',
  'Capital Raise': 'scr-badge--capital',
  'Private Placement': 'scr-badge--private',
  'Fairness Opinion': 'scr-badge--fairness',
};

function dealTypeBadgeClass(type: string | null): string {
  if (!type) return 'scr-badge--default';
  for (const [key, cls] of Object.entries(DEAL_TYPE_COLORS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return 'scr-badge--default';
}

function downloadCSV(rows: IBTransaction[]) {
  const headers = [
    'Deal Name',
    'Target',
    'Acquirer',
    'Deal Type',
    'Deal Size',
    'Date',
    'Sector',
    'Role',
    'Bank',
  ];
  const esc = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.dealName,
        r.targetCompany,
        r.acquirerCompany,
        r.dealType,
        r.dealSize,
        r.dealDate,
        r.sector,
        r.role,
        r.bankName,
      ]
        .map(esc)
        .join(','),
    ),
  ];
  const blob = new Blob(['\uFEFF', lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ib-screener-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function Skel({ w, h = 14 }: { w: number; h?: number }) {
  return <span className="scr-skel" style={{ width: w, height: h }} />;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="scr-chip">
      {label}
      <button
        type="button"
        className="scr-chip__remove"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        <i className="bi bi-x" aria-hidden="true" />
      </button>
    </span>
  );
}

interface BankSummaryRow {
  bankId: string;
  name: string;
  count: number;
  dealTypes: Set<string>;
  sectors: Set<string>;
}

export default function IBScreenerPage() {
  const [search, setSearch] = useState('');
  const [dealTypes, setDealTypes] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [bankIds, setBankIds] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(0);

  const { data: allTx = [], isLoading: txLoading } = useQuery({
    queryKey: ibKeys.transactions({}),
    queryFn: () => ibService.listTransactions(),
    staleTime: STALE,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ibKeys.screenerStats(),
    queryFn: () => ibService.screenerStats(),
    staleTime: STALE,
  });

  const { data: banks = [] } = useQuery({
    queryKey: ibKeys.banks(),
    queryFn: () => ibService.listBanks(),
    staleTime: STALE,
  });

  const availableDealTypes = useMemo(
    () => [...new Set(allTx.map((r) => r.dealType).filter(Boolean))].sort() as string[],
    [allTx],
  );
  const availableSectors = useMemo(
    () => [...new Set(allTx.map((r) => r.sector).filter(Boolean))].sort() as string[],
    [allTx],
  );
  const availableRoles = useMemo(
    () => [...new Set(allTx.map((r) => r.role).filter(Boolean))].sort() as string[],
    [allTx],
  );

  const filtered = useMemo(() => {
    let rows = allTx;
    if (dealTypes.length) rows = rows.filter((r) => r.dealType && dealTypes.includes(r.dealType));
    if (sectors.length) rows = rows.filter((r) => r.sector && sectors.includes(r.sector));
    if (bankIds.length) rows = rows.filter((r) => bankIds.includes(r.bankId));
    if (roleFilter)
      rows = rows.filter((r) => r.role?.toLowerCase().includes(roleFilter.toLowerCase()));
    if (search.trim()) {
      const lq = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.dealName?.toLowerCase().includes(lq) ||
          r.targetCompany?.toLowerCase().includes(lq) ||
          r.acquirerCompany?.toLowerCase().includes(lq) ||
          (r.bankName ?? '').toLowerCase().includes(lq) ||
          r.description?.toLowerCase().includes(lq),
      );
    }
    return rows;
  }, [allTx, dealTypes, sectors, bankIds, roleFilter, search]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const bankSummary = useMemo((): BankSummaryRow[] => {
    const map = new Map<string, BankSummaryRow>();
    for (const tx of filtered) {
      if (!map.has(tx.bankId)) {
        map.set(tx.bankId, {
          bankId: tx.bankId,
          name: tx.bankName ?? '—',
          count: 0,
          dealTypes: new Set(),
          sectors: new Set(),
        });
      }
      const entry = map.get(tx.bankId)!;
      entry.count += 1;
      if (tx.dealType) entry.dealTypes.add(tx.dealType);
      if (tx.sector) entry.sectors.add(tx.sector);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filtered]);

  const chips = [
    ...dealTypes.map((dt) => ({
      key: `dt:${dt}`,
      label: `Type: ${dt}`,
      onRemove: () => setDealTypes((d) => d.filter((x) => x !== dt)),
    })),
    ...sectors.map((s) => ({
      key: `sec:${s}`,
      label: `Sector: ${s}`,
      onRemove: () => setSectors((d) => d.filter((x) => x !== s)),
    })),
    ...bankIds.map((id) => {
      const b = banks.find((x) => x.id === id);
      return {
        key: `bk:${id}`,
        label: `Bank: ${b?.name ?? id}`,
        onRemove: () => setBankIds((d) => d.filter((x) => x !== id)),
      };
    }),
    ...(roleFilter
      ? [{ key: 'role', label: `Role: ${roleFilter}`, onRemove: () => setRoleFilter('') }]
      : []),
    ...(search ? [{ key: 'q', label: `Search: ${search}`, onRemove: () => setSearch('') }] : []),
  ];

  function addDealType(v: string) {
    if (v && !dealTypes.includes(v)) {
      setDealTypes((d) => [...d, v]);
      setPage(0);
    }
  }
  function addSector(v: string) {
    if (v && !sectors.includes(v)) {
      setSectors((d) => [...d, v]);
      setPage(0);
    }
  }
  function addBank(v: string) {
    if (v && !bankIds.includes(v)) {
      setBankIds((d) => [...d, v]);
      setPage(0);
    }
  }
  function clearAll() {
    setSearch('');
    setDealTypes([]);
    setSectors([]);
    setBankIds([]);
    setRoleFilter('');
    setPage(0);
  }

  return (
    <div className="scr-page">
      {/* Header */}
      <div className="scr-header">
        <div>
          <h1 className="scr-header__title">IB Screener</h1>
          <p className="scr-header__sub">
            Filter transactions by deal type, sector, bank, and role to find the right advisors.
          </p>
        </div>
        <button
          type="button"
          className="scr-btn scr-btn--outline"
          onClick={() => downloadCSV(filtered)}
          disabled={filtered.length === 0}
        >
          <i className="bi bi-download" aria-hidden="true" />
          Export ({filtered.length.toLocaleString()})
        </button>
      </div>

      {/* Stats */}
      <div className="scr-stats" data-testid="ib-screener-stats">
        {(
          [
            {
              icon: 'bi-bank',
              label: 'Banks Tracked',
              value: stats?.totalBanks,
              testId: 'stat-banks',
            },
            {
              icon: 'bi-file-earmark-text',
              label: 'Total Transactions',
              value: stats?.totalTransactions,
              testId: 'stat-tx',
            },
            {
              icon: 'bi-tag',
              label: 'Deal Types',
              value: stats?.dealTypes?.length,
              testId: 'stat-deal-types',
            },
            {
              icon: 'bi-bar-chart-line',
              label: 'Sectors',
              value: stats?.sectors?.length,
              testId: 'stat-sectors',
            },
          ] as const
        ).map(({ icon, label, value, testId }) => (
          <div key={label} className="scr-stat" data-testid={testId}>
            <div className="scr-stat__label">
              <i className={`bi ${icon}`} aria-hidden="true" />
              {label}
            </div>
            <div className="scr-stat__value">
              {statsLoading ? <Skel w={48} h={28} /> : (value ?? '—')}
            </div>
          </div>
        ))}
      </div>

      <div className="scr-layout">
        {/* Filter sidebar */}
        <div className="scr-sidebar">
          <div className="scr-panel scr-panel--filters">
            <div className="scr-panel__head">
              <h2 className="scr-panel__title">
                <i className="bi bi-sliders" aria-hidden="true" />
                Filters
              </h2>
              {chips.length > 0 && (
                <button type="button" className="scr-btn scr-btn--ghost" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>

            <div>
              <label className="scr-field__label" htmlFor="scr-search">
                Search
              </label>
              <div className="scr-field__search">
                <i className="bi bi-search scr-field__search-icon" aria-hidden="true" />
                <input
                  id="scr-search"
                  type="search"
                  className="scr-input scr-input--search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Keywords…"
                  aria-label="Search transactions"
                />
              </div>
            </div>

            <div>
              <label className="scr-field__label" htmlFor="scr-deal-type">
                Deal Type
              </label>
              <select
                id="scr-deal-type"
                className="scr-select"
                value=""
                onChange={(e) => addDealType(e.target.value)}
                aria-label="Add deal type filter"
              >
                <option value="" disabled>
                  Add deal type…
                </option>
                {availableDealTypes
                  .filter((dt) => !dealTypes.includes(dt))
                  .map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
              </select>
              {dealTypes.length > 0 && (
                <div className="scr-chips">
                  {dealTypes.map((dt) => (
                    <FilterChip
                      key={dt}
                      label={dt}
                      onRemove={() => setDealTypes((d) => d.filter((x) => x !== dt))}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="scr-field__label" htmlFor="scr-sector">
                Sector
              </label>
              <select
                id="scr-sector"
                className="scr-select"
                value=""
                onChange={(e) => addSector(e.target.value)}
                aria-label="Add sector filter"
              >
                <option value="" disabled>
                  Add sector…
                </option>
                {availableSectors
                  .filter((s) => !sectors.includes(s))
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
              {sectors.length > 0 && (
                <div className="scr-chips">
                  {sectors.map((s) => (
                    <FilterChip
                      key={s}
                      label={s}
                      onRemove={() => setSectors((d) => d.filter((x) => x !== s))}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="scr-field__label" htmlFor="scr-bank">
                Bank
              </label>
              <select
                id="scr-bank"
                className="scr-select"
                value=""
                onChange={(e) => addBank(e.target.value)}
                aria-label="Add bank filter"
              >
                <option value="" disabled>
                  Add bank…
                </option>
                {banks
                  .filter((b) => !bankIds.includes(b.id))
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
              {bankIds.length > 0 && (
                <div className="scr-chips">
                  {bankIds.map((id) => {
                    const b = banks.find((x) => x.id === id);
                    return (
                      <FilterChip
                        key={id}
                        label={b?.name ?? id}
                        onRemove={() => setBankIds((d) => d.filter((x) => x !== id))}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="scr-field__label" htmlFor="scr-role">
                Role
              </label>
              <select
                id="scr-role"
                className="scr-select"
                value={roleFilter || '__any__'}
                onChange={(e) => {
                  setRoleFilter(e.target.value === '__any__' ? '' : e.target.value);
                  setPage(0);
                }}
                aria-label="Filter by role"
              >
                <option value="__any__">Any role</option>
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {bankSummary.length > 0 && (
            <div className="scr-panel">
              <h2 className="scr-bank-summary__title">Banks in Results</h2>
              <div className="scr-bank-summary__rows">
                {bankSummary.slice(0, 10).map((b) => (
                  <div key={b.bankId} className="scr-bank-summary__row">
                    <Link to={paths.ib.bank(b.bankId)} className="scr-bank-summary__name">
                      {b.name}
                    </Link>
                    <span className="scr-bank-summary__count">{b.count} deals</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main results */}
        <div className="scr-main">
          {bankSummary.length > 0 && (
            <div className="scr-advisors" data-testid="ib-screener-table">
              <div className="scr-advisors__head">
                <h2 className="scr-advisors__head-title">Matching Advisors</h2>
                <p className="scr-advisors__head-sub">
                  {bankSummary.length} bank{bankSummary.length !== 1 ? 's' : ''} ranked by deal
                  count across {filtered.length.toLocaleString()} matching transaction
                  {filtered.length !== 1 ? 's' : ''}
                </p>
              </div>
              <table className="scr-table">
                <thead>
                  <tr>
                    <th className="scr-td--rank">#</th>
                    <th>Bank</th>
                    <th>Sectors Covered</th>
                    <th>Deal Types</th>
                    <th className="scr-th--num">Deals</th>
                  </tr>
                </thead>
                <tbody>
                  {bankSummary.map((b, i) => (
                    <tr
                      key={b.bankId}
                      className={i === 0 ? 'scr-row--first' : undefined}
                      data-testid="screener-row"
                    >
                      <td className="scr-td--rank">{i + 1}</td>
                      <td>
                        <Link to={paths.ib.bank(b.bankId)} className="scr-link">
                          {b.name}
                        </Link>
                      </td>
                      <td className="scr-td--truncate" title={[...b.sectors].join(', ')}>
                        {[...b.sectors].slice(0, 3).join(', ') || '—'}
                      </td>
                      <td className="scr-td--truncate" title={[...b.dealTypes].join(', ')}>
                        {[...b.dealTypes].slice(0, 2).join(', ') || '—'}
                      </td>
                      <td className="scr-td--num" data-testid="screener-deal-count">
                        {b.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <p className="scr-tx-section__count">
              <strong>{filtered.length.toLocaleString()}</strong> transactions
            </p>

            {chips.length > 0 && (
              <div className="scr-chips scr-chips--main">
                {chips.map((c) => (
                  <FilterChip key={c.key} label={c.label} onRemove={c.onRemove} />
                ))}
              </div>
            )}

            <div className="scr-tx-wrap">
              <table className="scr-table" data-testid="ib-screener-tx-table">
                <thead>
                  <tr>
                    <th>Deal / Target</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Date</th>
                    <th>Sector</th>
                    <th>Bank</th>
                    <th className="scr-td--icon">
                      <span className="visually-hidden">Source</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {txLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j}>
                            <Skel w={80} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="scr-empty">
                        {allTx.length === 0
                          ? 'No transactions yet — add banks and scrape them to get started.'
                          : 'No transactions match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((tx) => (
                      <tr key={tx.id} className="scr-tx-row" data-testid="screener-tx-row">
                        <td className="scr-tx-cell--deal">
                          <div className="scr-tx-deal__name">
                            {tx.dealName || tx.targetCompany || '—'}
                          </div>
                          {tx.acquirerCompany && (
                            <div className="scr-tx-deal__sub">↳ {tx.acquirerCompany}</div>
                          )}
                        </td>
                        <td>
                          {tx.dealType ? (
                            <span className={`scr-badge ${dealTypeBadgeClass(tx.dealType)}`}>
                              {tx.dealType}
                            </span>
                          ) : (
                            <span className="scr-td--muted">—</span>
                          )}
                        </td>
                        <td className="scr-td--muted">{fmtDealSize(tx) || '—'}</td>
                        <td className="scr-td--muted">{tx.dealDate || '—'}</td>
                        <td className="scr-td--muted">{tx.sector || '—'}</td>
                        <td>
                          <Link to={paths.ib.bank(tx.bankId)} className="scr-link">
                            {tx.bankName ?? '—'}
                          </Link>
                        </td>
                        <td className="scr-td--icon">
                          {tx.sourceUrl && (
                            <a
                              href={tx.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="scr-source-link"
                              aria-label="View source"
                            >
                              <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="scr-pagination">
                <span>
                  {`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length).toLocaleString()} of ${filtered.length.toLocaleString()}`}
                </span>
                <div className="scr-pagination__btns">
                  <button
                    type="button"
                    className="scr-btn scr-btn--outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="scr-btn scr-btn--outline"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
