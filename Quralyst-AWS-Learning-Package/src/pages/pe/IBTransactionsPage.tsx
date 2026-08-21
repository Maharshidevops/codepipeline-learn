// IB Vertical — All Transactions page (F34.4).
// Port of Replit QURALYST-20/artifacts/pe-scraper/src/pages/IBAllTransactions.tsx:
//   • Load all transactions once (no server-side filters) → client-side filter + paginate (50/page)
//   • 4-up stat cards derived from loaded data
//   • Advisory league table with animated bar rows, gold/silver/bronze rank colours,
//     sector tag pills, most-recent-deal timestamp
//   • Colour-coded deal-type badge pills (M&A=blue, IPO=purple, Restructuring=orange, …)
//   • CSV export of filtered rows
// Gated by RoleRoute role="pe_dataset". Types: `src/types/ib.ts`.
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ibService } from '@/services/api';
import { ibKeys } from '@/components/pe/ib/ibKeys';
import { fmtDealDate, fmtDealSize, LEAGUE_MONTHS_OPTIONS } from '@/components/pe/ib/ibUtils';
import { paths } from '@/routes/paths';
import type { IBLeagueQuery, IBTransaction } from '@/types';
import { Button, Select, Badge } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import '@/styles/pages/ib-transactions.css';

const PAGE_SIZE = 50;
const STALE = 60_000;

// ── Deal-type tones (maps to shared UI Badge) ──────────────────────────────────
function getDealTypeTone(type: string | null): BadgeTone {
  if (!type) return 'neutral';
  const lType = type.toLowerCase();
  if (lType.includes('debt')) return 'info';
  if (lType.includes('buy-side')) return 'primary';
  if (lType.includes('sell-side') || lType.includes('m&a')) return 'info';
  if (lType.includes('ipo')) return 'primary';
  if (lType.includes('restr')) return 'warning';
  if (lType.includes('capital') || lType.includes('priv')) return 'success';
  if (lType.includes('fairness')) return 'neutral';
  return 'neutral';
}

// ── CSV download ─────────────────────────────────────────────────────────────
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
    'Source',
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
        r.sourceUrl,
      ]
        .map(esc)
        .join(','),
    ),
  ];
  const blob = new Blob(['\uFEFF', lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ib-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ── Skeleton block ────────────────────────────────────────────────────────────
function Skel({ w, h = 14 }: { w: number; h?: number }) {
  return <span className="tx-skel" style={{ width: w, height: h }} />;
}

export default function IBTransactionsPage() {
  // Feed filters
  const [search, setSearch] = useState('');
  const [dealTypeFilter, setDealType] = useState('all');
  const [sectorFilter, setSector] = useState('all');
  const [bankFilter, setBank] = useState('all');
  const [page, setPage] = useState(0);

  // League filters (independent)
  const [leagueMonths, setLeagueMonths] = useState('24');
  const [leagueSector, setLeagueSector] = useState('all');
  const [leagueDealType, setLeagueDealType] = useState('all');

  // ── Queries ──────────────────────────────────────────────────────────────────
  // Load ALL transactions once — client-side filter (matches Replit)
  const { data: allTx = [], isLoading } = useQuery({
    queryKey: ibKeys.transactions({}),
    queryFn: () => ibService.listTransactions(),
    staleTime: STALE,
  });

  const { data: banks = [] } = useQuery({
    queryKey: ibKeys.banks(),
    queryFn: () => ibService.listBanks(),
    staleTime: STALE,
  });

  const leagueQp: IBLeagueQuery = {
    sector: leagueSector !== 'all' ? leagueSector : undefined,
    dealType: leagueDealType !== 'all' ? leagueDealType : undefined,
    months: leagueMonths !== 'all' ? Number(leagueMonths) : 'all',
  };
  const { data: leagueData, isLoading: leagueLoading } = useQuery({
    queryKey: ibKeys.leagueTable(leagueQp),
    queryFn: () => ibService.leagueTable(leagueQp),
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });
  const leagueRows = leagueData?.rows ?? [];

  // ── Derived (client-side, from loaded data) ───────────────────────────────
  const dealTypes = useMemo(
    () => [...new Set(allTx.map((r) => r.dealType).filter(Boolean))].sort() as string[],
    [allTx],
  );
  const sectors = useMemo(
    () => [...new Set(allTx.map((r) => r.sector).filter(Boolean))].sort() as string[],
    [allTx],
  );
  const uniqueBanks = useMemo(() => new Set(allTx.map((r) => r.bankId)).size, [allTx]);

  const filtered = useMemo(() => {
    let rows = allTx;
    if (dealTypeFilter !== 'all') rows = rows.filter((r) => r.dealType === dealTypeFilter);
    if (sectorFilter !== 'all') rows = rows.filter((r) => r.sector === sectorFilter);
    if (bankFilter !== 'all') rows = rows.filter((r) => r.bankId === bankFilter);
    if (search.trim()) {
      const lq = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.dealName?.toLowerCase().includes(lq) ||
          r.targetCompany?.toLowerCase().includes(lq) ||
          r.acquirerCompany?.toLowerCase().includes(lq) ||
          (r.bankName ?? '').toLowerCase().includes(lq) ||
          r.sector?.toLowerCase().includes(lq),
      );
    }
    return rows;
  }, [allTx, dealTypeFilter, sectorFilter, bankFilter, search]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const hasFilters =
    search || dealTypeFilter !== 'all' || sectorFilter !== 'all' || bankFilter !== 'all';

  function resetFilters() {
    setSearch('');
    setDealType('all');
    setSector('all');
    setBank('all');
    setPage(0);
  }

  return (
    <div className="tx-page">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="tx-header">
        <div>
          <h1 className="tx-header__title">All Transactions</h1>
          <p className="tx-header__sub">Tombstones and deal records across all investment banks.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<i className="bi bi-download" aria-hidden="true" />}
          onClick={() => downloadCSV(filtered)}
          disabled={filtered.length === 0}
        >
          Download CSV ({filtered.length.toLocaleString()})
        </Button>
      </div>

      {/* ── Stats cards ────────────────────────────────────────────────── */}
      <div className="tx-stats">
        {(
          [
            { icon: 'bi-file-earmark-text', label: 'Total Transactions', value: allTx.length },
            { icon: 'bi-tag', label: 'Deal Types', value: dealTypes.length },
            { icon: 'bi-bar-chart-line', label: 'Sectors', value: sectors.length },
            { icon: 'bi-building', label: 'Banks Covered', value: uniqueBanks },
          ] as const
        ).map(({ icon, label, value }) => (
          <div key={label} className="tx-stat">
            <div className="tx-stat__label">
              <i className={`bi ${icon}`} aria-hidden="true" />
              {label}
            </div>
            <div className="tx-stat__value">
              {isLoading ? <Skel w={48} h={28} /> : value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* ── Advisory League Table ───────────────────────────────────────── */}
      <div className="tx-league" data-testid="ib-league">
        <div className="tx-league__head">
          <div className="tx-league__title-row">
            <i className="bi bi-trophy-fill tx-league__trophy" aria-hidden="true" />
            <span className="tx-league__title">Advisory League Table</span>
            <span className="tx-league__subtitle">
              Ranked by deal activity across full database
            </span>
          </div>
          <div className="tx-league__filters">
            <Select
              value={leagueSector}
              onChange={setLeagueSector}
              options={[
                { value: 'all', label: 'All Sectors' },
                ...sectors.map((s) => ({ value: s, label: s })),
              ]}
              size="sm"
              aria-label="League sector filter"
            />
            <Select
              value={leagueDealType}
              onChange={setLeagueDealType}
              options={[
                { value: 'all', label: 'All Deal Types' },
                ...dealTypes.map((d) => ({ value: d, label: d })),
              ]}
              size="sm"
              aria-label="League deal type filter"
            />
            <Select
              value={leagueMonths}
              onChange={setLeagueMonths}
              options={LEAGUE_MONTHS_OPTIONS.map((o) => ({
                value: String(o.value),
                label: o.label,
              }))}
              size="sm"
              aria-label="League time window"
            />
          </div>
        </div>

        {leagueLoading ? (
          <div className="tx-league__rows">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="tx-lr">
                <Skel w={20} />
                <Skel w={140} />
                <div className="tx-lr__bar-track" />
                <Skel w={64} />
              </div>
            ))}
          </div>
        ) : leagueRows.length === 0 ? (
          <p className="tx-empty-msg">No transactions match these filters.</p>
        ) : (
          <div className="tx-league__rows">
            {leagueRows.slice(0, 10).map((entry, i) => {
              const maxCount = leagueRows[0].dealCount;
              const pct = maxCount > 0 ? Math.round((entry.dealCount / maxCount) * 100) : 0;
              const isFirst = i === 0;
              const rankMod = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other';
              return (
                <div
                  key={entry.bankId}
                  className={`tx-lr${isFirst ? ' tx-lr--first' : ''}`}
                  data-testid="league-row"
                >
                  <span className={`tx-lr__rank tx-lr__rank--${rankMod}`}>{i + 1}</span>
                  <Link to={paths.ib.bank(entry.bankId)} className="tx-lr__name">
                    {entry.bankName ?? '—'}
                  </Link>
                  <div className="tx-lr__bar-track">
                    <div
                      className={`tx-lr__bar-fill${isFirst ? ' tx-lr__bar-fill--gold' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="tx-lr__deals" data-testid="league-deal-count">
                    {entry.dealCount} deal{entry.dealCount !== 1 ? 's' : ''}
                  </span>
                  <div className="tx-lr__sectors">
                    {entry.topSectors.map((s) => (
                      <span key={s} className="tx-lr__sector-tag">
                        {s}
                      </span>
                    ))}
                  </div>
                  {entry.mostRecentDeal && (
                    <span className="tx-lr__recent">
                      <i className="bi bi-clock" aria-hidden="true" />
                      {fmtDealDate(entry.mostRecentDeal)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Feed filters ───────────────────────────────────────────────── */}
      <div className="tx-filters">
        <div className="tx-filters__search">
          <i className="bi bi-search tx-filters__search-icon" aria-hidden="true" />
          <input
            type="search"
            className="tx-input tx-filters__search-input"
            placeholder="Search deals, targets, banks…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            aria-label="Search transactions"
          />
        </div>
        <Select
          value={dealTypeFilter}
          onChange={(val) => {
            setDealType(val);
            setPage(0);
          }}
          options={[
            { value: 'all', label: 'All Deal Types' },
            ...dealTypes.map((d) => ({ value: d, label: d })),
          ]}
          aria-label="Filter by deal type"
        />
        <Select
          value={sectorFilter}
          onChange={(val) => {
            setSector(val);
            setPage(0);
          }}
          options={[
            { value: 'all', label: 'All Sectors' },
            ...sectors.map((s) => ({ value: s, label: s })),
          ]}
          aria-label="Filter by sector"
        />
        <Select
          value={bankFilter}
          onChange={(val) => {
            setBank(val);
            setPage(0);
          }}
          options={[
            { value: 'all', label: 'All Banks' },
            ...banks.map((b) => ({ value: b.id, label: b.name })),
          ]}
          aria-label="Filter by bank"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Transactions table ─────────────────────────────────────────── */}
      <div className="tx-table-wrap">
        <table className="tx-table" data-testid="ib-transactions-table">
          <thead>
            <tr>
              <th>Deal / Target</th>
              <th>Type</th>
              <th>Size</th>
              <th>Date</th>
              <th>Sector</th>
              <th>Role</th>
              <th>Bank</th>
              <th className="tx-th--icon">
                <span className="visually-hidden">Source</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}>
                      <Skel w={80} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="tx-empty-cell">
                  {allTx.length === 0
                    ? 'No transactions yet — scrape some banks to get started.'
                    : 'No results match your filters.'}
                </td>
              </tr>
            ) : (
              paginated.map((tx) => (
                <tr key={tx.id} className="tx-row">
                  <td className="tx-cell--deal">
                    <div className="tx-deal__name">{tx.dealName || tx.targetCompany || '—'}</div>
                    {tx.acquirerCompany && tx.targetCompany && tx.dealName !== tx.targetCompany && (
                      <div className="tx-deal__sub">{tx.targetCompany}</div>
                    )}
                  </td>
                  <td>
                    {tx.dealType ? (
                      <Badge tone={getDealTypeTone(tx.dealType)} data-testid="deal-type-badge">
                        {tx.dealType}
                      </Badge>
                    ) : (
                      <span className="tx-muted">—</span>
                    )}
                  </td>
                  <td className="tx-cell--sm">
                    {fmtDealSize(tx) || <span className="tx-muted">—</span>}
                  </td>
                  <td className="tx-muted tx-cell--sm">{tx.dealDate || '—'}</td>
                  <td className="tx-muted tx-cell--sm">{tx.sector || '—'}</td>
                  <td className="tx-muted tx-cell--sm">{tx.role || '—'}</td>
                  <td>
                    <Link to={paths.ib.bank(tx.bankId)} className="tx-link tx-cell--sm">
                      {tx.bankName ?? '—'}
                    </Link>
                  </td>
                  <td className="tx-cell--icon">
                    {tx.sourceUrl && (
                      <a
                        href={tx.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-source-link"
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

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="tx-pagination">
          <span>
            {filtered.length === 0
              ? 'No results'
              : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length).toLocaleString()} of ${filtered.length.toLocaleString()}`}
          </span>
          <div className="tx-pagination__btns">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
