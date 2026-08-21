// Typed fetch wrapper. Components never call this directly — services/api/* do.
// OAuth 2.0: access + refresh tokens live in httpOnly cookies (`qly_access`, `qly_refresh`).
// `credentials: 'include'` on every request; mutating methods echo CSRF (`XSRF-TOKEN` → header).
// On 401 the client attempts one silent POST /auth/refresh (token rotation) then retries.
import type { ApiError, ApiResponse } from '@/types';
import { config } from '@/config';
import { logger } from '@/lib/logger';
import { endpoints } from '@/services/endpoints';
import { clearClientAuthCookies, CSRF_COOKIE } from '@/lib/authCookies';

const BASE = config.apiBaseUrl;

const CSRF_HEADER = 'X-CSRF-Token';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Phase 40 — per-request timing for the request/response log lines (metadata only; never bodies).
const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const elapsedMs = (startedAt: number): number => Math.round(nowMs() - startedAt);

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

type ForbiddenHandler = (message: string) => void;
let forbiddenHandler: ForbiddenHandler | null = null;
export function setForbiddenHandler(handler: ForbiddenHandler | null): void {
  forbiddenHandler = handler;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const csrf = readCookie(CSRF_COOKIE);
      if (csrf) headers[CSRF_HEADER] = csrf;
      const res = await fetch(BASE + endpoints.auth.refresh, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      if (!res.ok) clearClientAuthCookies();
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: { skipRefresh?: boolean },
): Promise<ApiResponse<T>> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  const method = (init?.method ?? 'GET').toUpperCase();
  if (MUTATING_METHODS.has(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers[CSRF_HEADER] = csrf;
  }

  const requestId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '';
  if (requestId) headers['X-Request-ID'] = requestId;

  const doFetch = () => fetch(BASE + path, { ...init, headers, credentials: 'include' });

  const startedAt = nowMs();
  let res = await doFetch();
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');

  if (
    res.status === 401 &&
    !options?.skipRefresh &&
    path !== endpoints.auth.refresh &&
    !path.startsWith('/api/auth/login') &&
    !path.startsWith('/api/auth/signup') &&
    !path.startsWith('/api/auth/forgot-password') &&
    !path.startsWith('/api/auth/reset-password')
  ) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let body: Partial<ApiResponse<unknown>> = {};
    if ((res.headers.get('content-type') ?? '').includes('application/json')) {
      try {
        body = (await res.json()) as Partial<ApiResponse<unknown>>;
      } catch {
        /* ignore */
      }
    }
    const message =
      typeof body.message === 'string' && body.message ? body.message : res.statusText;
    if (res.status === 401 && !path.startsWith('/api/auth/')) unauthorizedHandler?.();
    if (res.status === 403) forbiddenHandler?.(message);
    logger.error('api request failed', {
      method,
      path,
      status: res.status,
      ms: elapsedMs(startedAt),
      requestId,
    });
    const err: ApiError = {
      status: res.status,
      statusCode: typeof body.statusCode === 'number' ? body.statusCode : res.status,
      message,
      meta: body.meta ?? null,
    };
    throw err;
  }

  // Phase 40 — record every successful request too (not just failures) for full terminal visibility.
  // Dev-only: in prod this would flood the Phase 33 ship buffer (cap 200, drop-oldest) and could
  // evict error logs from shipped batches; failures are still logged at error level in every env.
  if (import.meta.env.DEV) {
    logger.info('api request', {
      method,
      path,
      status: res.status,
      ms: elapsedMs(startedAt),
      requestId,
    });
  }

  if (!isJson && !(res.headers.get('content-type') ?? '').includes('application/json')) {
    return {
      success: true,
      statusCode: res.status,
      data: undefined as T,
      message: null,
      meta: null,
    };
  }
  return (await res.json()) as ApiResponse<T>;
}

/**
 * Raw-Response fetch for non-JSON carve-outs (e.g. the PE People CSV export, which the backend
 * streams as `text/csv` outside the JSON envelope). Mirrors `request`'s credentials + CSRF echo +
 * single silent-refresh retry, but returns the raw `Response` so the caller can read a Blob. On a
 * non-ok status it parses the JSON error envelope (400 missing key / 409 already running / …) and
 * throws the same `ApiError` shape `request` throws.
 */
async function download(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (MUTATING_METHODS.has(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers[CSRF_HEADER] = csrf;
  }

  const doFetch = () => fetch(BASE + path, { ...init, headers, credentials: 'include' });
  const startedAt = nowMs();
  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) res = await doFetch();
  }

  if (!res.ok) {
    let body: Partial<ApiResponse<unknown>> = {};
    if ((res.headers.get('content-type') ?? '').includes('application/json')) {
      try {
        body = (await res.json()) as Partial<ApiResponse<unknown>>;
      } catch {
        /* ignore */
      }
    }
    const message =
      typeof body.message === 'string' && body.message ? body.message : res.statusText;
    if (res.status === 403) forbiddenHandler?.(message);
    logger.error('api download failed', {
      method,
      path,
      status: res.status,
      ms: elapsedMs(startedAt),
    });
    const err: ApiError = {
      status: res.status,
      statusCode: typeof body.statusCode === 'number' ? body.statusCode : res.status,
      message,
      meta: body.meta ?? null,
    };
    throw err;
  }
  if (import.meta.env.DEV) {
    logger.info('api download', { method, path, status: res.status, ms: elapsedMs(startedAt) });
  }
  return res;
}

interface Http {
  <T>(path: string, init?: RequestInit): Promise<T>;
  full<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>>;
  download(path: string, init?: RequestInit): Promise<Response>;
  refreshSession(): Promise<boolean>;
}

export { clearClientAuthCookies } from '@/lib/authCookies';

export const http: Http = Object.assign(
  async function http<T>(path: string, init?: RequestInit): Promise<T> {
    return (await request<T>(path, init)).data;
  },
  {
    full<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
      return request<T>(path, init);
    },
    download(path: string, init?: RequestInit): Promise<Response> {
      return download(path, init);
    },
    refreshSession(): Promise<boolean> {
      return tryRefreshSession();
    },
  },
);
