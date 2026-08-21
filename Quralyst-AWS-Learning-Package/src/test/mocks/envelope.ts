// Phase 11 — MSW helpers that wrap mock responses in the backend's uniform envelope
// `{success, statusCode, data, message, meta}`, so the mocks match what `http.ts` now unwraps.
import { HttpResponse } from 'msw';

interface OkOpts {
  message?: string | null;
  meta?: Record<string, unknown> | null;
  status?: number;
}

/** Success envelope (2xx). `data` is the payload the service/consumer reads. */
export function ok<T>(data: T = null as T, opts: OkOpts = {}): Response {
  const status = opts.status ?? 200;
  return HttpResponse.json(
    {
      success: true,
      statusCode: status,
      data,
      message: opts.message ?? null,
      meta: opts.meta ?? null,
    },
    { status },
  );
}

/** Error envelope (4xx/5xx). `message` is what the FE surfaces; `meta` carries extras. */
export function err(
  status: number,
  message: string,
  meta: Record<string, unknown> | null = null,
): Response {
  return HttpResponse.json(
    { success: false, statusCode: status, data: null, message, meta },
    { status },
  );
}
