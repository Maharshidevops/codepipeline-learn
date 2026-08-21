import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { CellModalContext } from '../Modal/cellModalContext';
import './TruncatedCell.css';

export interface TruncatedCellProps {
  header: string;
  value?: string | null;
  linkTo?: string;
  href?: string;
  extra?: React.ReactNode;
  maxWidth?: string | number;
  className?: string;
}

export function TruncatedCell({
  header,
  value,
  linkTo,
  href,
  extra,
  maxWidth = '16rem',
  className = '',
}: TruncatedCellProps) {
  const showCellModal = useContext(CellModalContext)?.showCellModal;
  const text = (value ?? '').trim();

  const handleCellClick = (e: React.MouseEvent) => {
    // If the user clicked directly on a link or action button inside the cell,
    // allow the link/button click handler to execute instead of opening the modal.
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }
    if (text && showCellModal) {
      showCellModal(header, text);
    }
  };

  return (
    <div
      className={`pe-truncated-cell ${className}`.trim()}
      style={{ maxWidth, minWidth: 0, cursor: text && showCellModal ? 'pointer' : 'default' }}
      title={text}
      role={text && showCellModal ? 'button' : undefined}
      tabIndex={text && showCellModal ? 0 : undefined}
      onClick={handleCellClick}
      onKeyDown={
        text && showCellModal
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showCellModal(header, text);
              }
            }
          : undefined
      }
    >
      {linkTo ? (
        <Link to={linkTo} className="pe-truncated-cell__link">
          {text || '—'}
        </Link>
      ) : href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="pe-truncated-cell__link">
          {text || '—'}
        </a>
      ) : (
        <span className="pe-truncated-cell__text">{text || '—'}</span>
      )}
      {extra}
    </div>
  );
}

export default TruncatedCell;
