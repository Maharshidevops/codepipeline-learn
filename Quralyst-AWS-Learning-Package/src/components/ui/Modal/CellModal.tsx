// CellModal — React port of Backup/static/js/components/modals.js. Provides a context-mounted
// modal (the #cellModal markup from base.html) plus useCellModal().showCellModal(title, content)
// for expanding truncated table cells. Closes on the × button, outside-click, and Escape.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CellModalContext } from './cellModalContext';
import './modal.css';

interface CellModalState {
  title: string;
  content: string;
}

export function CellModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CellModalState | null>(null);

  const showCellModal = useCallback((title: string, content: string) => {
    // Validate inputs (matches modals.js: ignore empty content).
    if (!title || !content || content.trim() === '') return;
    setState({ title, content });
  }, []);

  const close = useCallback(() => setState(null), []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state, close]);

  return (
    <CellModalContext.Provider value={{ showCellModal }}>
      {children}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop click-to-dismiss is a pointer-only convenience; keyboard users dismiss via Escape (document listener above) or the close button. */}
      <div
        className="cell-modal"
        id="cellModal"
        style={{ display: state ? 'block' : 'none' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="cell-modal-content">
          <div className="cell-modal-header">
            <h3 className="cell-modal-title" id="cellModalTitle">
              {state?.title ?? 'Cell Content'}
            </h3>
            {/* a11y (Phase 17): a real <button> so the close is keyboard-operable. .btn-unstyled
                resets the UA button chrome; modal.css keeps the ×-glyph in the surrounding font so
                the look from .cell-modal-close (color/size/float) is unchanged. */}
            <button
              type="button"
              className="cell-modal-close btn-unstyled"
              aria-label="Close"
              onClick={close}
            >
              &times;
            </button>
          </div>
          <div className="cell-modal-body" id="cellModalContent">
            {state?.content ?? ''}
          </div>
        </div>
      </div>
    </CellModalContext.Provider>
  );
}
