import { Fragment, useContext, useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PriorContact } from '@/services/api';
import { CellModalContext } from '@/components/ui/Modal/cellModalContext';
import PriorContactBadge from '@/features/emailSync/PriorContactBadge';
import { EnrichDot } from './EnrichDot';
import RowDetailPanel from './RowDetailPanel';
import { companyNameOf, fitBucket } from './fitBucket';
import type { FixedCol, RowData } from './types';

function FixedCell({ col, row }: { col: FixedCol; row: RowData }) {
  const val = col.get(row);
  if (!val) return <span className="text-muted">—</span>;
  if (col.kind === 'email') {
    return (
      <a href={`mailto:${val}`} className="rd-link" onClick={(e) => e.stopPropagation()}>
        {val}
      </a>
    );
  }
  if (col.kind === 'link') {
    const href = /^https?:\/\//i.test(val) ? val : `https://${val}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="rd-link"
        onClick={(e) => e.stopPropagation()}
      >
        {val}
      </a>
    );
  }
  return <>{val}</>;
}

function isExpandableTextCol(col: FixedCol): boolean {
  return col.kind !== 'email' && col.kind !== 'link' && col.label !== 'Fit/No Fit';
}

function FixedTableRow({
  columns,
  row,
  resultId,
  panelWidth,
  enrichStatus,
  prior,
  selected,
  onToggleSelect,
  onSaved,
}: {
  columns: FixedCol[];
  row: RowData;
  resultId: string;
  panelWidth?: number;
  enrichStatus?: string;
  prior?: PriorContact;
  selected?: boolean;
  onToggleSelect?: () => void;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const showCellModal = useContext(CellModalContext)?.showCellModal;
  const name = companyNameOf(row);
  const bucket = fitBucket(row);

  const openCellModal = (title: string, content: string) => {
    const text = content.trim();
    if (!text || !showCellModal) return;
    showCellModal(title, text);
  };

  const onExpandableKeyDown = (e: KeyboardEvent, title: string, content: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCellModal(title, content);
    }
  };

  return (
    <Fragment>
      <tr className={`rd-row is-${bucket}${open ? ' is-open' : ''}`}>
        <td className="rd-col-select">
          <input
            type="checkbox"
            className="form-check-input"
            style={{ margin: '0 auto', display: 'block' }}
            checked={!!selected}
            onChange={() => onToggleSelect?.()}
            aria-label={`Select ${name || 'company'}`}
            disabled={!name}
          />
        </td>
        <td className="rd-col-expand">
          <button
            type="button"
            className="rd-expand-btn"
            aria-expanded={open}
            aria-label={
              open
                ? `Collapse details for ${name || 'company'}`
                : `Expand details for ${name || 'company'}`
            }
            onClick={() => setOpen((o) => !o)}
          >
            <span className="d-flex flex-column align-items-center gap-1">
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <EnrichDot status={enrichStatus} />
            </span>
          </button>
        </td>
        {columns.map((col) => {
          const raw = col.get(row);
          const expandable = Boolean(raw?.trim()) && isExpandableTextCol(col) && !!showCellModal;

          if (col.label === 'Company Name') {
            return (
              <td
                key={col.label}
                style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                className={expandable ? 'clickable-cell' : undefined}
                role={expandable ? 'button' : undefined}
                tabIndex={expandable ? 0 : undefined}
                aria-label={expandable ? `Expand ${col.label}` : undefined}
                title={raw || undefined}
                onClick={expandable ? () => openCellModal(col.label, raw) : undefined}
                onKeyDown={expandable ? (e) => onExpandableKeyDown(e, col.label, raw) : undefined}
              >
                <div className="fw-semibold text-truncate">
                  <FixedCell col={col} row={row} />
                </div>
                <PriorContactBadge contact={prior} />
              </td>
            );
          }
          if (col.label === 'Fit/No Fit') {
            return (
              <td
                key={col.label}
                style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
              >
                <span className={`rd-fitpill rd-fitpill--${bucket}`}>{raw || '—'}</span>
              </td>
            );
          }
          return (
            <td
              key={col.label}
              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
              className={expandable ? 'clickable-cell' : undefined}
              role={expandable ? 'button' : undefined}
              tabIndex={expandable ? 0 : undefined}
              aria-label={expandable ? `Expand ${col.label}` : undefined}
              title={raw || undefined}
              onClick={expandable ? () => openCellModal(col.label, raw) : undefined}
              onKeyDown={expandable ? (e) => onExpandableKeyDown(e, col.label, raw) : undefined}
            >
              <div className="text-truncate">
                <FixedCell col={col} row={row} />
              </div>
            </td>
          );
        })}
      </tr>
      {open ? (
        <tr className="rd-row-detail">
          <td colSpan={columns.length + 2} className="p-0">
            <RowDetailPanel
              row={row}
              resultId={resultId}
              panelWidth={panelWidth}
              onSaved={onSaved}
            />
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

export default function FixedResultsTable({
  columns,
  rows,
  resultId,
  panelWidth,
  enrichByCompany,
  priorContacts,
  selected,
  allSelected,
  onToggleSelect,
  onToggleSelectAll,
  onSaved,
}: {
  columns: FixedCol[];
  rows: RowData[];
  resultId: string;
  panelWidth?: number;
  enrichByCompany?: Record<string, string>;
  priorContacts?: Map<string, PriorContact>;
  selected: Set<string>;
  allSelected: boolean;
  onToggleSelect: (companyName: string) => void;
  onToggleSelectAll: () => void;
  onSaved: () => void;
}) {
  if (columns.length === 0) {
    return <div className="rd-empty text-muted">No columns available for this result type.</div>;
  }
  if (rows.length === 0) {
    return <div className="rd-empty text-muted">No companies match your filters.</div>;
  }

  return (
    <table className="rd-table">
      <thead>
        <tr>
          <th className="rd-col-select">
            <input
              type="checkbox"
              className="form-check-input"
              style={{ margin: '0 auto', display: 'block' }}
              checked={allSelected}
              onChange={onToggleSelectAll}
              aria-label="Select all visible companies"
            />
          </th>
          <th className="rd-col-expand">
            <span className="visually-hidden">Details</span>
          </th>
          {columns.map((col) => (
            <th
              key={col.label}
              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const name = companyNameOf(row);
          return (
            <FixedTableRow
              key={`${name}-${idx}`}
              columns={columns}
              row={row}
              resultId={resultId}
              panelWidth={panelWidth}
              enrichStatus={name ? enrichByCompany?.[name] : undefined}
              prior={name ? priorContacts?.get(name) : undefined}
              selected={!!name && selected.has(name)}
              onToggleSelect={name ? () => onToggleSelect(name) : undefined}
              onSaved={onSaved}
            />
          );
        })}
      </tbody>
    </table>
  );
}
