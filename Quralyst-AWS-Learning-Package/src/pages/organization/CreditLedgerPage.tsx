// Org credit ledger via shared DataTable + pagination.
import { useEffect, useMemo, useState } from 'react';
import { DataTable, Pagination, Spinner } from '@/components/ui';
import type { Column } from '@/components/ui';
import { organizationService } from '@/services/api';
import { useOrgPageMeta, useOrgSlug } from '@/layouts/orgSettingsMeta';
import { formatDateTime } from '@/lib/datetime';
import type { LedgerRow } from '@/types';

export default function CreditLedgerPage() {
  const slug = useOrgSlug();
  useOrgPageMeta('Credit ledger', <>Full credit movement history for this organization.</>);

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    organizationService
      .getCreditLedger(slug, page)
      .then((data) => {
        if (!active) return;
        setRows(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, page]);

  const columns: Column<LedgerRow>[] = useMemo(
    () => [
      {
        key: 'createdAt',
        header: 'Timestamp',
        width: 180,
        expandable: true,
        accessor: (r) => (r.createdAt ? formatDateTime(r.createdAt) : ''),
        render: (r) => (r.createdAt ? formatDateTime(r.createdAt) : ''),
      },
      {
        key: 'source',
        header: 'Source',
        width: 120,
        expandable: true,
        render: (r) => <span className="badge bg-light text-dark">{r.source}</span>,
      },
      { key: 'creditType', header: 'Type', width: 120, expandable: true },
      {
        key: 'delta',
        header: 'Delta',
        width: 100,
        expandable: true,
        render: (r) => (
          <span className={r.delta && r.delta.startsWith('-') ? 'org-delta-neg' : 'org-delta-pos'}>
            {r.delta}
          </span>
        ),
      },
      { key: 'balanceAfter', header: 'Balance after', width: 130, expandable: true },
      { key: 'user', header: 'User', width: 160, expandable: true },
      {
        key: 'jobId',
        header: 'Job',
        width: 140,
        expandable: true,
        render: (r) => <code className="small">{r.jobId}</code>,
      },
      {
        key: 'batchRef',
        header: 'Batch',
        width: 140,
        expandable: true,
        render: (r) => <code className="small">{r.batchRef}</code>,
      },
      {
        key: 'description',
        header: 'Description',
        width: 240,
        expandable: true,
        render: (r) => <span className="text-muted small">{r.description}</span>,
      },
    ],
    [],
  );

  return (
    <div className="org-section">
      <div className="org-section-header">
        <div>
          <h2 className="org-section-title">Credit ledger</h2>
          <p className="org-section-sub">Credit movements for this organization</p>
        </div>
        <span className="text-muted small">{total} entries</span>
      </div>
      {loading ? (
        <div className="org-tab-loading">
          <Spinner />
        </div>
      ) : (
        <div className="org-section-body is-table">
          <DataTable
            columns={columns}
            rows={rows}
            emptyMessage="No credit movements yet."
            getRowKey={(r, i) => `${r.createdAt}-${r.jobId}-${i}`}
            variant="quiet"
          />
        </div>
      )}

      {totalPages > 1 && (
        <div className="org-pagination-wrap">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
