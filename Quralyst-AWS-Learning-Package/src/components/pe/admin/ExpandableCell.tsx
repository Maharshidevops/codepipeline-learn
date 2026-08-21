// ExpandableCell (F65) — a <td> that opens its full content in the app-wide cell modal.
//
// The PE admin queue tables truncate their most informative columns with CSS (`text-truncate` +
// an inline maxWidth): Error at 260–300px, Firm at 180–200px, and the warnings list only as a
// `title` tooltip. Anything past the ellipsis was simply unreadable — and on a failed row the
// error string is the entire reason the row is on screen. The results tables have had this
// affordance since Phase 28 via DataTable's `expandable` column flag; this brings the same
// interaction (click / Enter / Space → cell modal) to the hand-rolled admin tables.
//
// Deliberately NOT a DataTable conversion: these tables carry multi-line status cells, per-row
// action buttons and per-queue pagination, so porting them wholesale is a far larger change than
// giving their cells the affordance that was missing.
// Consumes the context DIRECTLY rather than via `useCellModal()`, which throws when no
// <CellModalProvider> is mounted. App.tsx always mounts one, but a table cell must never be able
// to take a whole page down over a missing optional affordance — and panels rendered in isolation
// (tests, any future embed) have no provider. Without one the cell degrades to plain text.
import { useContext } from 'react';
import { CellModalContext } from '@/components/ui/Modal/cellModalContext';

export interface ExpandableCellProps {
  /** Column name — becomes the modal title. */
  header: string;
  /** Full text. When empty the cell renders `fallback` and is not interactive. */
  value: string | null | undefined;
  /** Optional short form to display; defaults to `value`. */
  display?: React.ReactNode;
  className?: string;
  maxWidth?: number;
  fallback?: string;
  /** Native tooltip; defaults to the full value. */
  title?: string;
}

export default function ExpandableCell({
  header,
  value,
  display,
  className = '',
  maxWidth,
  fallback = '—',
  title,
}: ExpandableCellProps) {
  const showCellModal = useContext(CellModalContext)?.showCellModal;
  const text = (value ?? '').trim();

  // Nothing to expand, or no provider to expand into — render a plain cell so screen readers and
  // keyboard users are not offered a control that does nothing (showCellModal also ignores blank
  // content).
  if (!text || !showCellModal) {
    return (
      <td className={className} style={maxWidth ? { maxWidth } : undefined}>
        {display ?? fallback}
      </td>
    );
  }

  const expand = () => showCellModal(header, text);

  return (
    <td
      className={`clickable-cell ${className}`.trim()}
      style={maxWidth ? { maxWidth } : undefined}
      role="button"
      tabIndex={0}
      aria-label={`Expand ${header}`}
      title={title ?? text}
      onClick={expand}
      onKeyDown={(e) => {
        // Space must not scroll the page while a cell has focus.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          expand();
        }
      }}
    >
      {display ?? text}
    </td>
  );
}
