// toastBus (Phase 15) — a tiny bridge so non-React code (the QueryClient's global error handler, the
// http 401 hook) can raise an error toast through the single <ToastProvider>. The provider registers
// its error fn on mount via registerErrorToast; callers emit through emitErrorToast. If no provider
// is mounted (e.g. before hydration), emits are silently dropped.
type ErrorToastFn = (title: string, message?: string) => void;

let errorToast: ErrorToastFn | null = null;

export function registerErrorToast(fn: ErrorToastFn | null): void {
  errorToast = fn;
}

export function emitErrorToast(title: string, message?: string): void {
  errorToast?.(title, message);
}
