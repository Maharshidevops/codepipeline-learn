// Phase 40 — pure formatter shared by the dev terminal bridge (the clientLogToTerminal plugin in
// vite.config.ts) and its unit test. Turns one client log entry into a single, scannable terminal
// line. It has NO imports on purpose, so it loads safely in the Vite (Node) config and in the browser
// bundle alike.

export interface ClientLogEntry {
  level?: string;
  message?: string;
  route?: string;
  fields?: Record<string, unknown>;
  ts?: string;
}

const MAX_VALUE_LEN = 200;

function shortRequestId(id: unknown): string {
  return typeof id === 'string' && id.length > 8 ? id.slice(0, 8) : String(id ?? '');
}

/** An API request/response entry (from http.ts) — rendered as a compact `VERB path → status` line. */
function isApiEntry(f: Record<string, unknown>): boolean {
  return typeof f.method === 'string' && typeof f.path === 'string' && f.status !== undefined;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  let s: string;
  if (typeof value === 'object') {
    try {
      s = JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  } else {
    s = String(value);
  }
  if (s.length > MAX_VALUE_LEN) s = `${s.slice(0, MAX_VALUE_LEN - 1)}…`;
  return typeof value === 'string' && /\s/.test(s) ? `"${s}"` : s;
}

/** Remaining fields as ` key=value` pairs (compact + greppable; beats a raw JSON blob in a terminal). */
function renderFields(fields?: Record<string, unknown>): string {
  if (!fields || typeof fields !== 'object') return '';
  const parts = Object.entries(fields).map(([k, v]) => `${k}=${renderValue(v)}`);
  return parts.length ? ` ${parts.join(' ')}` : '';
}

/**
 * Format a client log entry for the dev terminal. API entries get a compact request line
 * (`[client INFO ] GET /api/x → 200 (42ms) [req abc12345]`); everything else renders as
 * `[client LEVEL] /route message key=value …`.
 */
export function formatClientLog(entry: ClientLogEntry): string {
  const level = String(entry.level ?? 'info')
    .toUpperCase()
    .padEnd(5);
  const fields = entry.fields ?? {};

  if (isApiEntry(fields)) {
    const ms = fields.ms != null ? ` (${String(fields.ms)}ms)` : '';
    const req = fields.requestId ? ` [req ${shortRequestId(fields.requestId)}]` : '';
    return `[client ${level}] ${String(fields.method)} ${String(fields.path)} → ${String(fields.status)}${ms}${req}`;
  }

  const route = entry.route ? ` ${entry.route}` : '';
  const message = entry.message ?? '';
  return `[client ${level}]${route} ${message}${renderFields(entry.fields)}`.trimEnd();
}
