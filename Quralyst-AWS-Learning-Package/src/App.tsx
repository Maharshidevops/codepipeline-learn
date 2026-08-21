import { useEffect } from 'react';
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/router';
import { paths } from '@/routes/paths';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { CellModalProvider } from '@/components/ui/Modal/CellModal';
import OfflineBanner from '@/components/feedback/OfflineBanner';
import ErrorBoundary from '@/components/feedback/ErrorBoundary';
import {
  setForbiddenHandler,
  setUnauthorizedHandler,
  clearClientAuthCookies,
} from '@/services/http';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/api';
import { normalizeApiError } from '@/lib/normalizeApiError';
import { emitErrorToast } from '@/lib/toastBus';
import { reportError } from '@/lib/reportError';
import { logger } from '@/lib/logger';

// Pull the HTTP status off an ApiError-shaped throw for the log line (undefined for non-API errors).
function apiStatus(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;
}

// Global error surfacing (Phase 15): any failed query/mutation raises a single normalized error toast
// (via the toastBus) so call sites don't each hand-roll one. Per-call try/catch is kept only where a
// bespoke message is needed. staleTime avoids constant refetching; refetchOnReconnect refreshes after
// the connection returns (paired with OfflineBanner).
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const message = normalizeApiError(error);
      emitErrorToast('Error', message);
      // Phase 40: log the popup so every error toast has a matching terminal line (message is the
      // user-facing normalized text — safe; no bodies/PII).
      logger.error('error toast', { source: 'query', status: apiStatus(error), message });
      reportError(error, { source: 'query' }); // env-gated no-op unless a DSN is set (Phase 33)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = normalizeApiError(error);
      emitErrorToast('Error', message);
      logger.error('error toast', { source: 'mutation', status: apiStatus(error), message });
      reportError(error, { source: 'mutation' });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 60_000,
    },
  },
});

export default function App() {
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt);

  // Wire the http 401 hook to the session: clear auth + redirect to login. Guard against a redirect
  // loop when a 401 happens on an auth route itself.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (window.location.pathname.startsWith('/auth')) return;
      clearClientAuthCookies();
      useAuthStore.getState().logout();
      void router.navigate(paths.auth.login);
    });
    // 403 ≠ 401 (Phase 32): the user stays logged in — surface action-level denials as a toast.
    // Route-level denials are handled by RoleRoute rendering ForbiddenPage; this path never
    // clears the session or redirects.
    setForbiddenHandler(() => {
      emitErrorToast('Access denied', "You don't have permission to perform this action.");
      logger.warn('access denied toast', { source: 'forbidden' });
    });
    return () => {
      setUnauthorizedHandler(null);
      setForbiddenHandler(null);
    };
  }, []);

  // Session bootstrap: restore user via GET /auth/me; if anonymous but refresh cookie may
  // exist, try POST /auth/refresh then re-probe /auth/me (OAuth 2.0 token rotation).
  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        let user = await authService.getCurrentUser();
        if (!user) {
          const refreshed = await authService.refreshSession();
          if (refreshed?.expiresIn) {
            useAuthStore.getState().scheduleTokenExpiry(refreshed.expiresIn);
          }
          if (refreshed) {
            user = await authService.getCurrentUser();
          } else {
            clearClientAuthCookies();
          }
        }
        if (active && user) useAuthStore.getState().setUser(user);
      } catch {
        /* backend unreachable → treat as signed out */
      } finally {
        if (active) useAuthStore.getState().markHydrated();
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  // Proactive access-token refresh ~2 minutes before expiry.
  useEffect(() => {
    if (!tokenExpiresAt) return undefined;

    const leadMs = 2 * 60 * 1000;
    const delay = Math.max(0, tokenExpiresAt - Date.now() - leadMs);
    const timer = window.setTimeout(() => {
      void authService.refreshSession().then((tokens) => {
        if (tokens?.expiresIn) {
          useAuthStore.getState().scheduleTokenExpiry(tokens.expiresIn);
        }
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [tokenExpiresAt]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CellModalProvider>
            <OfflineBanner />
            <RouterProvider router={router} />
          </CellModalProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
