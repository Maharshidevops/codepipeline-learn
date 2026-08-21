/**
 * BaseTable — the single reusable table component for the entire app.
 *
 * Replaces:
 * - The old blue-gradient `DataTable` (default variant)
 * - Per-page inline `<table>` markup (.pef-table, .ibk-table, .tx-table, etc.)
 *
 * Design: Replit / QURALYST-20 — muted header, subtle borders, clean hover.
 *
 * Features from across the codebase unified here:
 * - Column definitions with render, width, alignment
 * - Sortable columns (header click → onSort callback + sort indicators)
 * - Expandable cells (click → CellModal)
 * - Skeleton loading rows
 * - Empty state
 * - Sticky header (default on)
 * - Sticky first column (opt-in, responsive)
 * - Row click handler
 * - Row class callbacks (for selected/highlight states)
 * - Footer slot (for pagination, counts, etc.)
 * - Compact mode
 * - Borderless mode (for embedded tables)
 * - Striped rows (opt-in)
 * - data-testid support
 * - Fetching overlay (opacity reduction on background refetch)
 * - className passthrough for page-specific tweaks
 */
import {
  Fragment,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useCellModal } from '@/components/ui/Modal/cellModalContext';
import './base-table.css';

// ── Column definition ────────────────────────────────────────────────────────

export interface BaseTableColumn<T> {
  /** Unique key for the column (used as React key). */
  key: string;
  /** Header label — can be a string or ReactNode for custom headers. */
  header: string | ReactNode;
  /** CSS width (e.g. `180`, `'12rem'`). Defaults to auto. */
  width?: number | string;
  /** Text alignment. Defaults to `'left'`. */
  align?: 'left' | 'center' | 'right';
  /** Whether clicking the header triggers sort. */
  sortable?: boolean;
  /** The sort key to send to `onSort`. Defaults to `key`. */
  sortKey?: string;
  /** Whether clicking the cell opens the CellModal with full text. */
  expandable?: boolean;
  /** Extract raw text from a row (for CellModal or fallback display). */
  accessor?: (row: T) => string;
  /** Custom cell renderer. Receives the row and its index. */
  render?: (row: T, index: number) => ReactNode;
  /** Extra class(es) on the `<th>`. */
  headerClass?: string;
  /** Extra class(es) on the `<td>`. */
  cellClass?: string;
  /** `scope` attribute on `<th>`. Defaults to `'col'`. */
  scope?: string;
}

// ── Table props ──────────────────────────────────────────────────────────────

export interface BaseTableProps<T> {
  /** Column definitions. */
  columns: BaseTableColumn<T>[];
  /** Data rows. */
  rows: T[];
  /** Derive a stable React key per row. Falls back to the row index. */
  getRowKey?: (row: T, index: number) => string | number;

  // ── Loading ────────────────────────────────────────────────────────────────
  /** True while the initial data is loading. Shows skeleton rows. */
  loading?: boolean;
  /** Number of skeleton rows to show during loading. Default 5. */
  loadingRows?: number;
  /** True during a background refetch. Shows the table at reduced opacity. */
  fetching?: boolean;

  // ── Empty state ────────────────────────────────────────────────────────────
  /** Message (or ReactNode) when `rows` is empty and not loading. */
  emptyMessage?: string | ReactNode;

  // ── Layout / scroll ────────────────────────────────────────────────────────
  /** Sticky header inside the scroll container. Default true. */
  stickyHeader?: boolean;
  /** Sticky first column on screens ≤ 1200px. Default false. */
  stickyFirstCol?: boolean;
  /** Max-height for the scroll container (CSS value). */
  maxHeight?: string | number;

  // ── Sorting ────────────────────────────────────────────────────────────────
  /** Currently active sort column key. */
  sortKey?: string;
  /** Current sort direction. */
  sortDir?: 'asc' | 'desc';
  /** Called when a sortable header is clicked. Receives the column's sortKey. */
  onSort?: (key: string) => void;

  // ── Row interaction ────────────────────────────────────────────────────────
  /** Called when a row is clicked. */
  onRowClick?: (row: T, index: number) => void;
  /** Extra class(es) per row — can be a static string or a function. */
  rowClass?: string | ((row: T, index: number) => string | undefined);
  /** Predicate determining if a row is expanded. */
  isRowExpanded?: (row: T, index: number) => boolean;
  /** Function rendering an expanded sub-row under the parent row. */
  renderExpandedRow?: (row: T, index: number) => ReactNode;

  // ── Variants ───────────────────────────────────────────────────────────────
  /** Compact mode — less padding, smaller font. */
  compact?: boolean;
  /** Borderless mode — for inline/embedded tables. */
  borderless?: boolean;
  /** Striped alternating rows. */
  striped?: boolean;

  // ── Styling / testing ──────────────────────────────────────────────────────
  /** Extra class on the outer wrapper `.bt-wrap`. */
  className?: string;
  /** Extra class on the `<table>` element. */
  tableClass?: string;
  /** `data-testid` on the `<table>`. */
  testId?: string;
  /** Function returning a `data-testid` for each `<tr>`. */
  rowTestId?: (row: T, index: number) => string;

  // ── Footer slot ────────────────────────────────────────────────────────────
  /** Content rendered below the table inside the card (e.g. Pagination). */
  footer?: ReactNode;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function cellText<T>(col: BaseTableColumn<T>, row: T): string {
  if (col.accessor) return col.accessor(row);
  const raw = (row as Record<string, unknown>)[col.key];
  return raw == null ? '' : String(raw);
}

function colStyle(col: { width?: number | string }): CSSProperties | undefined {
  if (col.width == null) return undefined;
  const w = typeof col.width === 'number' ? `${col.width}px` : col.width;
  return { width: w, minWidth: w, maxWidth: w };
}

const ALIGN_CLASS: Record<string, string> = {
  center: 'bt-align-center',
  right: 'bt-align-right',
  left: 'bt-align-left',
};

// ── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow<T>({ columns }: { columns: BaseTableColumn<T>[] }) {
  return (
    <tr>
      {columns.map((col) => (
        <td key={col.key} style={colStyle(col)} className={col.cellClass}>
          <span
            className="bt-skel"
            style={{ width: `${60 + Math.random() * 60}px` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Sort header ──────────────────────────────────────────────────────────────

function SortIndicator({
  active,
  dir,
}: {
  active: boolean;
  dir?: 'asc' | 'desc';
}) {
  if (!active) {
    return (
      <span className="bt-sort-arrow" aria-hidden="true">
        ↕
      </span>
    );
  }
  return (
    <span className="bt-sort-arrow bt-sort-arrow--active" aria-hidden="true">
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  );
}

// ── BaseTable ────────────────────────────────────────────────────────────────

export default function BaseTable<T>({
  columns,
  rows,
  getRowKey,
  loading = false,
  loadingRows = 5,
  fetching = false,
  emptyMessage = 'No data to display.',
  stickyHeader = true,
  stickyFirstCol = false,
  maxHeight,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  rowClass,
  isRowExpanded,
  renderExpandedRow,
  compact = false,
  borderless = false,
  striped = false,
  className,
  tableClass,
  testId,
  rowTestId,
  footer,
}: BaseTableProps<T>) {
  const { showCellModal } = useCellModal();
  const tableRef = useRef<HTMLDivElement>(null);

  // Track active expandable cell for keyboard grid navigation.
  const [activeCell, setActiveCell] = useState<{
    r: number;
    c: number;
  } | null>(null);

  const expandableCols = useMemo(
    () =>
      columns
        .map((col, i) => (col.expandable ? i : -1))
        .filter((i) => i >= 0),
    [columns],
  );
  const firstExpandableCol = expandableCols[0] ?? -1;

  const isTabbableCell = (r: number, c: number): boolean =>
    activeCell
      ? activeCell.r === r && activeCell.c === c
      : r === 0 && c === firstExpandableCol;

  const focusCell = (r: number, c: number) => {
    const el = tableRef.current?.querySelector<HTMLElement>(
      `td[data-cell="${r}-${c}"]`,
    );
    if (el) {
      setActiveCell({ r, c });
      el.focus();
    }
  };

  const onCellKeyDown = (
    e: React.KeyboardEvent,
    r: number,
    c: number,
    expand: () => void,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expand();
      return;
    }
    const pos = expandableCols.indexOf(c);
    let tr = r;
    let tc = c;
    switch (e.key) {
      case 'ArrowRight':
        if (pos < expandableCols.length - 1) tc = expandableCols[pos + 1];
        break;
      case 'ArrowLeft':
        if (pos > 0) tc = expandableCols[pos - 1];
        break;
      case 'ArrowDown':
        if (r < rows.length - 1) tr = r + 1;
        break;
      case 'ArrowUp':
        if (r > 0) tr = r - 1;
        break;
      case 'Home':
        tc = expandableCols[0];
        break;
      case 'End':
        tc = expandableCols[expandableCols.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    focusCell(tr, tc);
  };

  // ── Wrapper classes ──────────────────────────────────────────────────────

  const wrapClass = [
    'bt-wrap',
    borderless ? 'bt-wrap--borderless' : '',
    fetching ? 'is-fetching' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const tblClass = [
    'bt-table',
    !stickyHeader ? 'bt-table--no-sticky' : '',
    stickyFirstCol ? 'bt-table--sticky-col' : '',
    compact ? 'bt-table--compact' : '',
    striped ? 'bt-table--striped' : '',
    tableClass ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const scrollStyle: CSSProperties | undefined = maxHeight
    ? {
        maxHeight:
          typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
      }
    : undefined;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={wrapClass} ref={tableRef}>
      <div className="bt-scroll" style={scrollStyle}>
        <table className={tblClass} data-testid={testId}>
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={colStyle(col)} />
            ))}
          </colgroup>

          <thead>
            <tr>
              {columns.map((col) => {
                const sk = col.sortKey ?? col.key;
                const isSortable = col.sortable && onSort;
                const isActive = sortKey === sk;
                const alignCls = col.align
                  ? ALIGN_CLASS[col.align]
                  : '';

                const thClass = [
                  isSortable ? 'bt-sortable' : '',
                  isActive ? 'is-active' : '',
                  alignCls,
                  col.headerClass ?? '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <th
                    key={col.key}
                    className={thClass || undefined}
                    scope={col.scope ?? 'col'}
                    onClick={
                      isSortable ? () => onSort!(sk) : undefined
                    }
                    aria-sort={
                      isActive
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {isSortable ? (
                      <span className="bt-sort-icon">
                        {col.header}
                        <SortIndicator
                          active={isActive}
                          dir={sortDir}
                        />
                      </span>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <SkeletonRow key={i} columns={columns} />
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="bt-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => {
                const rk = getRowKey
                  ? getRowKey(row, rowIdx)
                  : rowIdx;
                const extraClass =
                  typeof rowClass === 'function'
                    ? rowClass(row, rowIdx)
                    : rowClass;
                const isClickable = !!onRowClick;

                const trClass = [
                  isClickable ? 'bt-row--clickable' : '',
                  extraClass ?? '',
                ]
                  .filter(Boolean)
                  .join(' ');

                const isExpanded = isRowExpanded ? isRowExpanded(row, rowIdx) : false;

                return (
                  <Fragment key={rk}>
                    <tr
                      data-testid={rowTestId ? rowTestId(row, rowIdx) : undefined}
                      className={trClass || undefined}
                      onClick={
                        isClickable
                          ? () => onRowClick!(row, rowIdx)
                          : undefined
                      }
                    >
                      {columns.map((col, colIdx) => {
                        const content = col.render
                          ? col.render(row, rowIdx)
                          : cellText(col, row);

                        const alignCls = col.align
                          ? ALIGN_CLASS[col.align]
                          : '';

                        const tdClass = [
                          col.expandable ? 'bt-expandable' : '',
                          alignCls,
                          col.cellClass ?? '',
                        ]
                          .filter(Boolean)
                          .join(' ');

                        // Expandable cell — click → CellModal
                        if (col.expandable) {
                          const text = cellText(col, row);
                          const expand = () => {
                            const headerStr =
                              typeof col.header === 'string'
                                ? col.header
                                : col.key;
                            showCellModal(headerStr, text);
                          };

                          return (
                            <td
                              key={col.key}
                              className={tdClass || undefined}
                              role="button"
                              tabIndex={
                                isTabbableCell(rowIdx, colIdx)
                                  ? 0
                                  : -1
                              }
                              aria-label={`Expand ${typeof col.header === 'string' ? col.header : col.key}`}
                              data-cell={`${rowIdx}-${colIdx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                expand();
                              }}
                              onFocus={() =>
                                setActiveCell({
                                  r: rowIdx,
                                  c: colIdx,
                                })
                              }
                              onKeyDown={(e) =>
                                onCellKeyDown(
                                  e,
                                  rowIdx,
                                  colIdx,
                                  expand,
                                )
                              }
                            >
                              {content}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col.key}
                            className={tdClass || undefined}
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && renderExpandedRow ? (
                      <tr className="bt-row--expanded">
                        {renderExpandedRow(row, rowIdx)}
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {footer && <div className="bt-footer">{footer}</div>}
    </div>
  );
}
