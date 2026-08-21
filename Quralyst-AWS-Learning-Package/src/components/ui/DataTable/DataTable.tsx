/**
 * DataTable — backward-compatible wrapper around BaseTable.
 *
 * Maps the old Column<T> / DataTableProps<T> interface to the new BaseTable
 * so existing consumers (PreviewResultPage, PendingRegistrationsPage,
 * InvitesPage, MembersPage, CreditLedgerPage, CrmPage) keep working
 * with zero changes.
 *
 * New code should import BaseTable directly for full feature access.
 */
import type { ReactNode } from 'react';
import BaseTable, { type BaseTableColumn } from './BaseTable';

export interface Column<T> {
  key: string;
  header: string;
  width?: number;
  render?: (row: T) => ReactNode;
  expandable?: boolean;
  accessor?: (row: T) => string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  stickyHeader?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  getRowKey?: (row: T, index: number) => string | number;
  /** `quiet` = API Usage–style muted header (org settings, etc.).
   *  Both variants now render the same Replit design. */
  variant?: 'default' | 'quiet';
}

export default function DataTable<T>({
  columns,
  rows,
  stickyHeader = true,
  loading = false,
  emptyMessage = 'No data to display.',
  getRowKey,
}: DataTableProps<T>) {
  // Map old Column<T> → BaseTableColumn<T>
  const baseCols: BaseTableColumn<T>[] = columns.map((col) => ({
    key: col.key,
    header: col.header,
    width: col.width,
    expandable: col.expandable,
    accessor: col.accessor,
    render: col.render ? (row: T) => col.render!(row) : undefined,
  }));

  return (
    <BaseTable<T>
      columns={baseCols}
      rows={rows}
      stickyHeader={stickyHeader}
      loading={loading}
      emptyMessage={emptyMessage}
      getRowKey={getRowKey}
    />
  );
}
