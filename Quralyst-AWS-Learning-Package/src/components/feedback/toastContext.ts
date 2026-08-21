// Toast context + consumer hook, split out of ToastProvider.tsx so that file only
// exports components (react-refresh/only-export-components — HMR fast-refresh).
// Public hooks stay in src/hooks/useToast.ts + useConfirm.ts.
import { createContext, useContext } from 'react';
import type { ToastContextValue } from './ToastProvider';

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast/useConfirm must be used within <ToastProvider>');
  return ctx;
}
