// Shared/common types. See REF-DATA-MODEL.md.

export interface Paginated<T> {
  items: T[]; // legacy: "records" | "results"
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  prevNum?: number;
  nextNum?: number;
}

// Phase 11.1 — the standardized `meta.pagination` shape every list endpoint returns. Services map
// it onto their existing per-page response interfaces.
export type PageMeta = Omit<Paginated<unknown>, 'items'>;

// Phase 11 — the uniform response envelope every JSON endpoint returns. `http()` unwraps `data`
// for callers; `http.full()` returns the whole envelope when `message`/`meta` are needed.
export type ApiMeta = Record<string, unknown>;

export interface ApiResponse<T> {
  success: boolean; // transport success (mirrors HTTP 2xx)
  statusCode: number; // the HTTP status, duplicated in the body
  data: T;
  message: string | null;
  meta: ApiMeta | null;
}

export interface ApiError {
  status: number;
  /** The envelope's `statusCode` when present (equals `status` for non-enveloped errors). */
  statusCode?: number;
  message: string;
  /** Error extras folded into the envelope `meta` (e.g. `lockedUntil`, `code`, `missingKeys`). */
  meta?: ApiMeta | null;
}
