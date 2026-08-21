// Presentational primitives for the IB Vertical surface (F34.4). Component-only (per react-refresh);
// non-component utilities/labels live in ./ibUtils. Styling follows the repo's Bootstrap-class
// convention (NOT the reference's Tailwind), reusing the shared UI primitives (Badge). Tables-first
// v1 — no chart library (user decision 2026-07-07): the coverage panel + league table are plain
// tables/stat rows.
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { paths } from '@/routes/paths';
import {
  BANK_STATUS_TONE,
  fmtDealDate,
  fmtDealSize,
  fmtNum,
  FRESHNESS_LABEL,
  FRESHNESS_TONE,
  freshnessOf,
} from '@/components/pe/ib/ibUtils';
import type { IBBankStatus, IBCoverageStats, IBTransaction } from '@/types';

/** Simple stat card (label + big number). */
export function StatCard({
  label,
  value,
  testId,
}: {
  label: string;
  value: number | null | undefined;
  testId?: string;
}) {
  return (
    <div className="card p-3" data-testid={testId} style={{ minWidth: 150 }}>
      <div className="h4 mb-0">{fmtNum(value)}</div>
      <div className="text-muted small">{label}</div>
    </div>
  );
}

/** active/paused status pill. */
export function BankStatusBadge({ status }: { status: IBBankStatus }) {
  return (
    <Badge tone={BANK_STATUS_TONE[status]}>
      <span data-testid="bank-status" data-status={status}>
        {status === 'active' ? 'Active' : 'Paused'}
      </span>
    </Badge>
  );
}

/** Freshness pill derived from `lastScrapedAt`. */
export function FreshnessBadge({ lastScrapedAt }: { lastScrapedAt: string | null | undefined }) {
  const f = freshnessOf(lastScrapedAt);
  return (
    <Badge tone={FRESHNESS_TONE[f]}>
      <span data-testid="freshness-badge" data-freshness={f}>
        {FRESHNESS_LABEL[f]}
      </span>
    </Badge>
  );
}

/** Deal-type pill (canonical vocabulary value; muted dash when absent). */
export function DealTypeBadge({ dealType }: { dealType: string | null }) {
  if (!dealType) return <span className="text-muted">—</span>;
  return (
    <span className="badge bg-light text-dark border" data-testid="deal-type-badge">
      {dealType}
    </span>
  );
}

/** Coverage Breakdown panel (from /ib/coverage-stats): % banks with people vs transactions. */
export function CoveragePanel({
  stats,
  loading,
}: {
  stats: IBCoverageStats | undefined;
  loading: boolean;
}) {
  const rows: {
    key: keyof IBCoverageStats;
    pctKey: keyof IBCoverageStats;
    label: string;
    help: string;
  }[] = [
    {
      key: 'withBoth',
      pctKey: 'withBothPct',
      label: 'People + transactions',
      help: 'Fully covered — both professionals and tombstone deals scraped.',
    },
    {
      key: 'withTransactions',
      pctKey: 'withTransactionsPct',
      label: 'With transactions',
      help: 'At least one tombstone transaction on record.',
    },
    {
      key: 'withPeople',
      pctKey: 'withPeoplePct',
      label: 'With people',
      help: 'At least one professional on record.',
    },
    {
      key: 'withNeither',
      pctKey: 'withNeitherPct',
      label: 'No coverage yet',
      help: 'Neither transactions nor people — awaiting a successful scrape.',
    },
  ];
  return (
    <div className="card h-100" data-testid="coverage-panel">
      <div className="card-body">
        <h2 className="h5 mb-1">Coverage breakdown</h2>
        <p className="text-muted small mb-3">
          How many of the {fmtNum(stats?.total)} tracked banks have professionals vs. tombstone
          transactions on record.
        </p>
        {loading ? (
          <div className="text-muted small py-3 text-center">Loading…</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Coverage</th>
                  <th scope="col" className="text-end">
                    Banks
                  </th>
                  <th scope="col" className="text-end">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} data-testid={`coverage-row-${r.key}`}>
                    <td>
                      <div className="fw-medium">{r.label}</div>
                      <div className="text-muted small">{r.help}</div>
                    </td>
                    <td className="text-end">{fmtNum(stats?.[r.key])}</td>
                    <td className="text-end fw-semibold" data-testid={`coverage-pct-${r.key}`}>
                      {stats ? `${stats[r.pctKey]}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Reusable tombstone transactions table. `emptyState` lets the caller supply a reject-aware message. */
export function TransactionsTable({
  transactions,
  loading,
  showBank = true,
  emptyState,
  testId = 'transactions-table',
}: {
  transactions: IBTransaction[];
  loading: boolean;
  showBank?: boolean;
  emptyState?: React.ReactNode;
  testId?: string;
}) {
  const colSpan = showBank ? 8 : 7;
  return (
    <div className="table-responsive">
      <table className="table align-middle" data-testid={testId}>
        <thead>
          <tr>
            <th scope="col">Deal</th>
            <th scope="col">Type</th>
            <th scope="col">Size</th>
            <th scope="col">Date</th>
            <th scope="col">Target</th>
            <th scope="col">Acquirer</th>
            <th scope="col">Role</th>
            {showBank ? <th scope="col">Bank</th> : <th scope="col">Sector</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="text-center py-4 text-muted">
                Loading…
              </td>
            </tr>
          ) : transactions.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="text-center py-5 text-muted" data-testid="tx-empty">
                {emptyState ?? (
                  <>
                    <div className="fw-medium mb-1">No transactions</div>
                    <div className="small">
                      Unmappable tombstones are quarantined for review, never dropped — so a blank
                      list here means none were scraped yet.
                    </div>
                  </>
                )}
              </td>
            </tr>
          ) : (
            transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="fw-medium">
                  {tx.dealName ?? '—'}
                  {tx.sector && <div className="text-muted small">{tx.sector}</div>}
                </td>
                <td>
                  <DealTypeBadge dealType={tx.dealType} />
                </td>
                <td className="text-nowrap">{fmtDealSize(tx)}</td>
                <td className="text-muted small text-nowrap">{fmtDealDate(tx.dealDate)}</td>
                <td>{tx.targetCompany ?? '—'}</td>
                <td>{tx.acquirerCompany ?? '—'}</td>
                <td className="text-muted small">{tx.role ?? '—'}</td>
                {showBank ? (
                  <td>
                    {tx.bankId ? (
                      <Link to={paths.ib.bank(tx.bankId)}>{tx.bankName ?? '—'}</Link>
                    ) : (
                      (tx.bankName ?? '—')
                    )}
                  </td>
                ) : (
                  <td className="text-muted small">{tx.sector ?? '—'}</td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** One professional card: title, bio, contact links; inferred emails visually marked. */
export function PersonCard({
  person,
  showBank = true,
}: {
  person: {
    id: string;
    name: string;
    title: string | null;
    bio: string | null;
    email: string | null;
    emailInferred: boolean;
    linkedinUrl: string | null;
    location: string | null;
    bankId: string;
    bankName: string | null;
  };
  showBank?: boolean;
}) {
  return (
    <div className="card h-100" data-testid="person-card">
      <div className="card-body">
        <div className="fw-medium">{person.name}</div>
        {person.title && <div className="small text-muted mb-1">{person.title}</div>}
        {showBank && person.bankName && (
          <div className="small mb-2">
            <Link to={paths.ib.bank(person.bankId)}>{person.bankName}</Link>
          </div>
        )}
        {person.bio && <p className="small mb-2">{person.bio}</p>}
        <div className="d-flex flex-wrap gap-2 small">
          {person.email && (
            <span className="d-inline-flex align-items-center gap-1">
              <a href={`mailto:${person.email}`}>{person.email}</a>
              {person.emailInferred && (
                <span
                  className="badge bg-warning-subtle text-dark border"
                  data-testid="inferred-email"
                  title="Email inferred (first.last@domain), not directly confirmed"
                >
                  Inferred
                </span>
              )}
            </span>
          )}
          {person.linkedinUrl && (
            <a
              href={person.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${person.name} on LinkedIn`}
            >
              <i className="bi bi-linkedin" aria-hidden="true" /> LinkedIn
            </a>
          )}
          {person.location && <span className="text-muted">{person.location}</span>}
        </div>
      </div>
    </div>
  );
}

/** Small labelled row for the bank-detail overview panel. */
export function OverviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between border-bottom py-2">
      <span className="text-muted small">{label}</span>
      <span className="text-end">{value ?? '—'}</span>
    </div>
  );
}
