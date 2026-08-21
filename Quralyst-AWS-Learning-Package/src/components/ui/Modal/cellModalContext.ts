// CellModal context + consumer hook, split out of CellModal.tsx so that file only
// exports components (react-refresh/only-export-components — HMR fast-refresh).
import { createContext, useContext } from 'react';

export interface CellModalContextValue {
  showCellModal: (title: string, content: string) => void;
}

export const CellModalContext = createContext<CellModalContextValue | null>(null);

export function useCellModal(): CellModalContextValue {
  const ctx = useContext(CellModalContext);
  if (!ctx) return { showCellModal: () => {} };
  return ctx;
}
