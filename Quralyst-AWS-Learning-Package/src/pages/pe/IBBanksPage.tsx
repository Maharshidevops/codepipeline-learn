// IB Vertical — bank directory (F34.4).
// Port of Replit QURALYST-20/artifacts/pe-scraper/src/pages/InvestmentBanks.tsx.
import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PriorContactBadge from '@/features/emailSync/PriorContactBadge';
import { usePriorContacts } from '@/features/emailSync/usePriorContacts';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/useToast';
import { fmtRelativeTime } from '@/components/pe/ib/ibUtils';
import { ibKeys } from '@/components/pe/ib/ibKeys';
import { ibService } from '@/services/api';
import { paths } from '@/routes/paths';
import IBBulkImportModal from '@/components/pe/ib/IBBulkImportModal';
import IBAddBankModal from '@/components/pe/ib/IBAddBankModal';
import ConfirmDialog from '@/components/pe/admin/ConfirmDialog';
import type { ApiError, IBBank, IBCoverageStats } from '@/types';
import '@/styles/pages/ib-banks.css';

const PAGE_SIZE = 50;
const STALE = 60_000;

type SortKey = 'name' | 'hqLocation' | 'transactionsCount' | 'peopleCount' | 'lastScrapedAt';
type SortDir = 'asc' | 'desc';

function Skel({ w, h = 14 }: { w: number; h?: number }) {
  return <span className="ibk-skel" style={{ width: w, height: h }} />;
}

function SortTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  const icon = active ? (dir === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down') : 'bi-chevron-expand';
  return (
    <th
      className={`ibk-th--sortable${className ? ` ${className}` : ''}`}
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="ibk-sort">
        {label}
        <i
          className={`bi ${icon} ibk-sort-icon${active ? ' ibk-sort-icon--active' : ''}`}
          aria-hidden="true"
        />
      </span>
    </th>
  );
}

function coverageSegments(stats: IBCoverageStats) {
  // Exclusive buckets (QURALYST-20): both / people-only / deals-only / neither.
  // Backend returns inclusive withPeople/withTransactions; derive exclusives here.
  const peopleOnly = Math.max(0, stats.withPeople - stats.withBoth);
  const dealsOnly = Math.max(0, stats.withTransactions - stats.withBoth);
  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);
  return [
    {
      key: 'both',
      icon: 'bi-check-circle-fill',
      color: 'var(--ibk-cov-emerald)',
      label: 'People + Deals',
      count: stats.withBoth,
      pct: pct(stats.withBoth),
      bar: 'ibk-cov-item__bar-fill--both',
      desc: 'Full coverage',
      testId: 'coverage-pct-withBoth',
    },
    {
      key: 'people',
      icon: 'bi-people-fill',
      color: 'var(--ibk-cov-blue)',
      label: 'People only',
      count: peopleOnly,
      pct: pct(peopleOnly),
      bar: 'ibk-cov-item__bar-fill--people',
      desc: 'Have team, need deals → Re-scrape Deals',
      testId: 'coverage-pct-withPeople',
    },
    {
      key: 'deals',
      icon: 'bi-graph-up-arrow',
      color: 'var(--ibk-cov-amber)',
      label: 'Deals only',
      count: dealsOnly,
      pct: pct(dealsOnly),
      bar: 'ibk-cov-item__bar-fill--deals',
      desc: 'Have deals, need team → Re-scrape People',
      testId: 'coverage-pct-withTransactions',
    },
    {
      key: 'neither',
      icon: 'bi-search',
      color: 'var(--ibk-cov-muted)',
      label: 'No data',
      count: stats.withNeither,
      pct: pct(stats.withNeither),
      bar: 'ibk-cov-item__bar-fill--none',
      desc: 'Empty → Re-scrape Empty',
      testId: 'coverage-pct-withNeither',
    },
  ];
}

export default function IBBanksPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const isStaff = can('pe:admin');

  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<IBBank | null>(null);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [opFeedback, setOpFeedback] = useState<{ message: string; tone: 'ok' | 'error' } | null>(
    null,
  );
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ibKeys.banks(),
    queryFn: () => ibService.listBanks(),
    staleTime: STALE,
  });

  const { data: coverage } = useQuery({
    queryKey: ibKeys.coverageStats(),
    queryFn: () => ibService.coverageStats(),
    staleTime: STALE,
  });

  const { data: scrapeStatus } = useQuery({
    queryKey: ibKeys.scrapeStatus(),
    queryFn: () => ibService.scrapeStatus(),
    staleTime: STALE,
    refetchInterval: (q) => {
      const c = q.state.data?.counts ?? {};
      const active = (c.pending ?? 0) + (c.running ?? 0) > 0;
      return active ? 10_000 : 30_000;
    },
  });

  const { data: txProgress } = useQuery({
    queryKey: ibKeys.rescrapeTransactionsProgress(),
    queryFn: () => ibService.rescrapeTransactionsProgress(),
    staleTime: 2_000,
    refetchInterval: (q) => {
      const p = q.state.data;
      if (p?.running) return 2_000;
      // Keep polling briefly after completion so the panel can show "complete".
      if (p && p.total > 0) return 10_000;
      return 30_000;
    },
  });

  const priorContacts = usePriorContacts(
    banks.map((b) => ({ name: b.name, website: b.websiteUrl })),
  );

  function refetchAll() {
    void qc.invalidateQueries({ queryKey: ibKeys.banks() });
    void qc.invalidateQueries({ queryKey: ibKeys.coverageStats() });
    void qc.invalidateQueries({ queryKey: ibKeys.scrapeStatus() });
    void qc.invalidateQueries({ queryKey: ibKeys.rescrapeTransactionsProgress() });
  }

  const queuePending = scrapeStatus?.counts?.pending ?? 0;
  const queueRunning = scrapeStatus?.counts?.running ?? 0;
  const queueActive = queuePending + queueRunning > 0;

  const scrapeAll = useMutation({
    mutationFn: () => ibService.scrapeAll(),
    onSuccess: (data) => {
      setScrapeMsg(data.message);
      setOpFeedback(null);
      refetchAll();
    },
    onError: (e) => setScrapeMsg((e as unknown as ApiError)?.message ?? 'Scrape-all failed'),
  });

  const deleteBank = useMutation({
    mutationFn: (id: string) => ibService.deleteBank(id),
    onSuccess: () => {
      toast.success(`Bank “${toDelete?.name ?? ''}” deleted.`);
      setToDelete(null);
      refetchAll();
    },
    onError: () => toast.error('Could not delete the bank.'),
  });

  const scrapeBank = useMutation({
    mutationFn: (id: string) => ibService.scrapeBank(id),
    onSuccess: (_, id) => {
      const b = banks.find((x) => x.id === id);
      toast.success(`Scraping ${b?.name ?? 'bank'}…`);
      setScrapingId(null);
      refetchAll();
    },
    onError: (e) => {
      toast.error((e as unknown as ApiError)?.message ?? 'Scrape failed');
      setScrapingId(null);
    },
  });

  const opMutation = useMutation({
    mutationFn: (fn: () => Promise<{ message: string }>) => fn(),
  });

  function runOp(fn: () => Promise<{ message: string }>) {
    setScrapeMsg(null);
    opMutation.mutate(fn, {
      onSuccess: (data) => {
        setOpFeedback({ message: data.message, tone: 'ok' });
        refetchAll();
      },
      onError: (e) =>
        setOpFeedback({
          message: (e as unknown as ApiError)?.message ?? 'Operation failed',
          tone: 'error',
        }),
    });
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'transactionsCount' || key === 'peopleCount' || key === 'lastScrapedAt'
          ? 'desc'
          : 'asc',
      );
    }
    setPage(0);
  };

  const sortedBanks = useMemo(() => {
    const rows = [...banks];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'hqLocation')
        cmp = (a.hqLocation ?? '').localeCompare(b.hqLocation ?? '');
      else if (sortKey === 'transactionsCount') cmp = a.transactionsCount - b.transactionsCount;
      else if (sortKey === 'peopleCount') cmp = a.peopleCount - b.peopleCount;
      else if (sortKey === 'lastScrapedAt') {
        const aT = a.lastScrapedAt ? new Date(a.lastScrapedAt).getTime() : 0;
        const bT = b.lastScrapedAt ? new Date(b.lastScrapedAt).getTime() : 0;
        cmp = aT - bT;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [banks, sortKey, sortDir]);

  const paged = sortedBanks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedBanks.length / PAGE_SIZE);

  const downloadCsv = useCallback(() => {
    if (!banks.length) return;
    const esc = (v: string | number | null | undefined) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const headers = [
      'Name',
      'Website',
      'Status',
      'Deal Types',
      'Deal Focus',
      'HQ Location',
      'Founded',
      'Employees',
      'Transactions',
      'People',
      'Last Scraped',
      'Criteria Source',
    ];
    const lines = [
      headers.join(','),
      ...banks.map((b) =>
        [
          b.name,
          b.websiteUrl,
          b.status,
          b.dealTypes,
          b.dealFocus,
          b.hqLocation,
          b.foundedYear,
          b.employeeCount,
          b.transactionsCount,
          b.peopleCount,
          b.lastScrapedAt ? new Date(b.lastScrapedAt).toISOString().slice(0, 10) : '',
          b.criteriaAutoFilled ? 'AI Scraped' : '',
        ]
          .map(esc)
          .join(','),
      ),
    ];
    const blob = new Blob(['\uFEFF', lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `investment-banks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }, [banks]);

  const summaryStats =
    banks.length > 0
      ? [
          { label: 'Banks', value: banks.length },
          {
            label: 'With Transactions',
            value: banks.filter((b) => b.transactionsCount > 0).length,
          },
          {
            label: 'Total Transactions',
            value: banks.reduce((s, b) => s + b.transactionsCount, 0),
          },
          {
            label: 'Total Professionals',
            value: banks.reduce((s, b) => s + b.peopleCount, 0),
          },
        ]
      : [];

  const opBusy = opMutation.isPending || isLoading;

  return (
    <div className="ibk-page">
      {/* Header — Replit: title left, all actions right */}
      <div className="ibk-header">
        <div>
          <h1 className="ibk-header__title">Investment Banks</h1>
          <p className="ibk-header__sub">
            Track investment banks, their deal focus, transactions, and professionals.
          </p>
        </div>

        <div className="ibk-toolbar">
          <button
            type="button"
            className="ibk-btn ibk-btn--outline ibk-btn--sm"
            onClick={downloadCsv}
            disabled={isLoading || banks.length === 0}
          >
            <i className="bi bi-download" aria-hidden="true" />
            Download CSV
            {banks.length > 0 && (
              <span className="ibk-btn__count">({banks.length.toLocaleString()})</span>
            )}
          </button>

          {isStaff && (
            <button
              type="button"
              className="ibk-btn ibk-btn--outline ibk-btn--sm"
              onClick={() => setImportOpen(true)}
              data-testid="ib-open-bulk-import"
            >
              <i className="bi bi-upload" aria-hidden="true" />
              Bulk Import
            </button>
          )}

          {/* Operator tools — same toolbar row as Replit; staff-only (backend require_staff). */}
          {isStaff && (
            <>
              {queueActive && (
                <span className="ibk-queue-badge">
                  <i className="bi bi-arrow-repeat ibk-spin" aria-hidden="true" />
                  {(queuePending + queueRunning).toLocaleString()} remaining
                </span>
              )}
              <span data-testid="ib-staff-ops" className="ibk-toolbar">
                <button
                  type="button"
                  className="ibk-btn ibk-btn--outline"
                  disabled={opBusy}
                  onClick={() => runOp(() => ibService.scanContactPages())}
                  data-testid="op-scan-contact-pages"
                  title="Scan contact pages to find email seeds for firms with no email data"
                >
                  <i className="bi bi-card-text" aria-hidden="true" />
                  Scan Contacts
                </button>
                <button
                  type="button"
                  className="ibk-btn ibk-btn--outline"
                  disabled={opBusy}
                  onClick={() => runOp(() => ibService.inferEmails())}
                  data-testid="op-infer-emails"
                  title="Detect email patterns per firm and fill in missing email addresses"
                >
                  <i className="bi bi-at" aria-hidden="true" />
                  Infer Emails
                </button>
                <button
                  type="button"
                  className="ibk-btn ibk-btn--outline"
                  disabled={opBusy}
                  onClick={() => runOp(() => ibService.rescrapePeople())}
                  data-testid="op-rescrape-people"
                  title="Re-scrape people for confirmed banks that have deal data but zero contacts"
                >
                  <i className="bi bi-cpu" aria-hidden="true" />
                  Re-scrape People
                </button>
                <button
                  type="button"
                  className="ibk-btn ibk-btn--outline"
                  disabled={opBusy}
                  onClick={() => runOp(() => ibService.rescrapeTransactions())}
                  data-testid="op-rescrape-transactions"
                  title="Re-scrape deal tombstones for banks that have team members but zero transactions"
                >
                  <i className="bi bi-graph-up-arrow" aria-hidden="true" />
                  Re-scrape Deals
                </button>
                <button
                  type="button"
                  className="ibk-btn ibk-btn--outline"
                  disabled={opBusy}
                  onClick={() => runOp(() => ibService.rescrapeZeroCoverage())}
                  data-testid="op-rescrape-zero"
                  title="Re-queue all banks with zero people and zero transactions for a fresh scrape"
                >
                  <i className="bi bi-search" aria-hidden="true" />
                  Re-scrape Empty
                </button>
              </span>
            </>
          )}

          {isStaff && (
            <>
              <button
                type="button"
                className="ibk-btn ibk-btn--outline"
                onClick={() => scrapeAll.mutate()}
                disabled={scrapeAll.isPending || isLoading || banks.length === 0}
                data-testid="ib-scrape-all"
                title="Trigger scrape for all active banks"
              >
                <i
                  className={`bi bi-arrow-clockwise${scrapeAll.isPending ? ' ibk-spin' : ''}`}
                  aria-hidden="true"
                />
                {scrapeAll.isPending ? 'Queuing…' : 'Scrape All'}
              </button>

              <button
                type="button"
                className="ibk-btn ibk-btn--primary"
                onClick={() => setAddOpen(true)}
                data-testid="ib-open-add-bank"
              >
                <i className="bi bi-plus-lg" aria-hidden="true" />
                Add Bank
              </button>
            </>
          )}
        </div>
      </div>

      {(scrapeMsg || opFeedback) && (
        <div
          className={`ibk-feedback${opFeedback?.tone === 'error' ? ' ibk-feedback--err' : ' ibk-feedback--ok'}`}
          role="status"
          data-testid={scrapeMsg ? 'ib-scrape-msg' : 'op-feedback'}
        >
          {scrapeMsg ?? opFeedback?.message}
        </div>
      )}

      {/* Stats bar */}
      {summaryStats.length > 0 && (
        <div className="ibk-stats">
          {summaryStats.map(({ label, value }) => (
            <div key={label} className="ibk-stat">
              <div className="ibk-stat__value">{value.toLocaleString()}</div>
              <div className="ibk-stat__label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction re-scrape live progress (QURALYST-20) */}
      {txProgress && (txProgress.running || txProgress.total > 0) && (
        <div
          className={`ibk-tx-progress${txProgress.running ? ' ibk-tx-progress--running' : ''}`}
          data-testid="ib-tx-rescrape-progress"
        >
          <div className="ibk-tx-progress__head">
            <div className="ibk-tx-progress__title">
              {txProgress.running ? (
                <i className="bi bi-arrow-repeat ibk-spin" aria-hidden="true" />
              ) : (
                <i
                  className="bi bi-check-circle-fill ibk-tx-progress__done-icon"
                  aria-hidden="true"
                />
              )}
              <span>{txProgress.running ? 'Re-scraping deals…' : 'Deal re-scrape complete'}</span>
            </div>
            <div className="ibk-tx-progress__meta">
              {txProgress.found > 0 && (
                <span className="ibk-tx-progress__found">
                  +{txProgress.found.toLocaleString()} deals found
                </span>
              )}
              {txProgress.running && txProgress.startedAt != null && (
                <span>
                  {(() => {
                    const elapsedMs = Date.now() - txProgress.startedAt;
                    const elapsedMin = Math.floor(elapsedMs / 60000);
                    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
                    const etaMs =
                      txProgress.done > 0
                        ? (elapsedMs / txProgress.done) * (txProgress.total - txProgress.done)
                        : null;
                    const etaMin = etaMs != null ? Math.ceil(etaMs / 60000) : null;
                    return `${elapsedMin}m ${elapsedSec}s elapsed${etaMin != null ? ` · ~${etaMin}m left` : ''}`;
                  })()}
                </span>
              )}
              <span>
                {txProgress.done.toLocaleString()} / {txProgress.total.toLocaleString()} banks
              </span>
            </div>
          </div>
          <div className="ibk-tx-progress__bar">
            <div
              className={`ibk-tx-progress__bar-fill${txProgress.running ? ' ibk-tx-progress__bar-fill--running' : ' ibk-tx-progress__bar-fill--done'}`}
              style={{
                width: `${txProgress.total > 0 ? Math.round((txProgress.done / txProgress.total) * 100) : 0}%`,
              }}
            />
          </div>
          {txProgress.running && (
            <div className="ibk-tx-progress__pct">
              {txProgress.total > 0 ? Math.round((txProgress.done / txProgress.total) * 100) : 0}%
            </div>
          )}
        </div>
      )}

      {/* Coverage breakdown */}
      {coverage && (
        <div className="ibk-coverage" data-testid="coverage-panel">
          <div className="ibk-coverage__head">
            <h2 className="ibk-coverage__title">Coverage Breakdown</h2>
            <span className="ibk-coverage__sub">
              {coverage.total.toLocaleString()} active bank
              {coverage.total === 1 ? '' : 's'}
            </span>
          </div>
          <div className="ibk-coverage__grid">
            {coverageSegments(coverage).map((s) => (
              <div key={s.key} className="ibk-cov-item">
                <div className="ibk-cov-item__label">
                  <i className={`bi ${s.icon}`} style={{ color: s.color }} aria-hidden="true" />
                  {s.label}
                </div>
                <div className="ibk-cov-item__nums">
                  <span className="ibk-cov-item__count">{s.count.toLocaleString()}</span>
                  <span className="ibk-cov-item__pct" data-testid={s.testId}>
                    {s.pct}%
                  </span>
                </div>
                <div className="ibk-cov-item__bar">
                  <div
                    className={`ibk-cov-item__bar-fill ${s.bar}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <div className="ibk-cov-item__desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="ibk-table-wrap">
        <table className="ibk-table" data-testid="ib-banks-table">
          <thead>
            <tr>
              <SortTh
                label="Bank Name"
                sortKey="name"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="ibk-th--bank"
              />
              <th>Deal Types</th>
              <th>Deal Focus</th>
              <SortTh
                label="HQ"
                sortKey="hqLocation"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortTh
                label="Transactions"
                sortKey="transactionsCount"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="ibk-th--num"
              />
              <SortTh
                label="People"
                sortKey="peopleCount"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="ibk-th--num"
              />
              {isStaff && <th className="ibk-th--actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: isStaff ? 7 : 6 }).map((_, j) => (
                    <td key={j} className={j === 6 ? 'ibk-td--actions' : undefined}>
                      <Skel w={80} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={isStaff ? 7 : 6}>
                  <div className="ibk-empty">
                    <i className="bi bi-bank ibk-empty__icon" aria-hidden="true" />
                    <div>
                      <p className="ibk-empty__title">No investment banks yet</p>
                      <p className="ibk-empty__sub">
                        Click &quot;Add Bank&quot; or &quot;Bulk Import&quot; to get started
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((bank) => (
                <tr key={bank.id}>
                  <td>
                    <div className="ibk-bank-stack">
                      <Link
                        to={paths.ib.bank(bank.id)}
                        className="ibk-bank-link"
                        aria-label={bank.name}
                      >
                        <i className="bi bi-bank ibk-bank-link__icon" aria-hidden="true" />
                        <div className="ibk-bank-link__body">
                          <div>{bank.name}</div>
                          {bank.lastScrapedAt && (
                            <div className="ibk-bank-updated">
                              Updated {fmtRelativeTime(bank.lastScrapedAt)}
                            </div>
                          )}
                        </div>
                      </Link>
                      <PriorContactBadge contact={priorContacts.get(bank.name)} />
                    </div>
                  </td>
                  <td
                    className="ibk-td--muted ibk-td--truncate"
                    title={bank.dealTypes ?? undefined}
                  >
                    {bank.dealTypes ?? <span className="ibk-dash">—</span>}
                  </td>
                  <td className="ibk-td--truncate-sm" title={bank.dealFocus ?? undefined}>
                    {bank.dealFocus ? (
                      <span className="ibk-td--xs">{bank.dealFocus}</span>
                    ) : (
                      <span className="ibk-dash--faint">—</span>
                    )}
                  </td>
                  <td className="ibk-td--muted">{bank.hqLocation ?? '—'}</td>
                  <td className="ibk-td--num">{bank.transactionsCount}</td>
                  <td className="ibk-td--num">{bank.peopleCount}</td>
                  {isStaff && (
                    <td className="ibk-td--actions">
                      <div className="ibk-row-actions">
                        <a
                          href={bank.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ibk-btn ibk-btn--ghost"
                          title="Open website"
                          aria-label={`Open ${bank.name} website`}
                        >
                          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          className="ibk-btn ibk-btn--secondary"
                          title="Scrape now"
                          disabled={scrapeBank.isPending && scrapingId === bank.id}
                          onClick={() => {
                            setScrapingId(bank.id);
                            scrapeBank.mutate(bank.id);
                          }}
                        >
                          <i
                            className={`bi bi-arrow-clockwise${scrapeBank.isPending && scrapingId === bank.id ? ' ibk-spin' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          type="button"
                          className="ibk-btn ibk-btn--danger"
                          title={`Delete ${bank.name}`}
                          onClick={() => setToDelete(bank)}
                          data-testid={`ib-delete-${bank.id}`}
                        >
                          <i className="bi bi-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="ibk-pagination">
          <span>
            {`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, sortedBanks.length).toLocaleString()} of ${sortedBanks.length.toLocaleString()}`}
          </span>
          <div className="ibk-pagination__btns">
            <button
              type="button"
              className="ibk-btn ibk-btn--outline ibk-btn--sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="ibk-btn ibk-btn--outline ibk-btn--sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <IBBulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refetchAll}
      />
      <IBAddBankModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={refetchAll} />
      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteBank.mutate(toDelete.id)}
        title="Delete bank"
        confirmLabel="Delete bank"
        danger
        pending={deleteBank.isPending}
        typedConfirm={toDelete?.name}
      >
        <p>
          This will permanently delete the bank and all associated transactions and professionals.
        </p>
      </ConfirmDialog>
    </div>
  );
}
