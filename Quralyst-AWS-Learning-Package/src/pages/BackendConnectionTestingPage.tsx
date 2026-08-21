// BackendConnectionTestingPage — verifies frontend ↔ backend connectivity via
// GET /api/health, GET /api/health/secrets, and build-time frontend VITE_* probes.
// Ops carve-outs return bare JSON (not the envelope), so this page uses raw fetch.
import { useMemo, useState } from 'react';
import { config, frontendSecretsHealth } from '@/config';
import { endpoints } from '@/services/endpoints';
import '@/styles/pages/backend-connection-testing.css';

// ── Helpers ─────────────────────────────────────────────────────────────────────

type CheckResult = {
  data: unknown;
  ts: number;
  httpStatus: number;
  ok: boolean;
};

function fmtValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function flattenEntries(data: unknown): Array<[string, unknown]> {
  if (typeof data !== 'object' || data === null) {
    return [['Response', data]];
  }
  const entries: Array<[string, unknown]> = [];
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if ((key === 'probes' || key === 'values') && typeof value === 'object' && value !== null) {
      for (const [probeKey, probeVal] of Object.entries(value as Record<string, unknown>)) {
        entries.push([`${key}.${probeKey}`, probeVal]);
      }
      continue;
    }
    entries.push([key, value]);
  }
  return entries;
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function BackendConnectionTestingPage() {
  const [health, setHealth] = useState<CheckResult | null>(null);
  const [secrets, setSecrets] = useState<CheckResult | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingSecrets, setLoadingSecrets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frontendSecrets = useMemo(() => frontendSecretsHealth(), []);
  const apiBase = config.backendConnectionTestUrl || config.apiBaseUrl;

  const runCheck = async (
    path: string,
    setResult: (r: CheckResult | null) => void,
    setLoading: (v: boolean) => void,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}${path}`, { credentials: 'include' });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      setResult({ data, ts: Date.now(), httpStatus: res.status, ok: res.ok });
      if (!res.ok && (data === null || typeof data !== 'object')) {
        setError(`HTTP ${res.status} from ${path}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = (e: React.MouseEvent) => {
    e.preventDefault();
    void runCheck(endpoints.ops.health, setHealth, setLoadingHealth);
  };

  const handleSecretsCheck = (e: React.MouseEvent) => {
    e.preventDefault();
    void runCheck(endpoints.ops.healthSecrets, setSecrets, setLoadingSecrets);
  };

  const frontendOk = frontendSecrets.status === 'healthy' || frontendSecrets.status === 'local';

  return (
    <div className="bct-container">
      <div className="bct-header">
        <h1 className="bct-title">Backend Connection Testing</h1>
        <p className="bct-subtitle">
          Verify Mongo/Redis health, backend secrets loaded at startup, and frontend VITE_* probes
          (baked at build time).
        </p>
      </div>

      <div className="bct-buttons">
        <button type="button" onClick={handleHealthCheck} disabled={loadingHealth}>
          {loadingHealth ? 'Checking…' : 'Check Health (/api/health)'}
        </button>
        <button type="button" onClick={handleSecretsCheck} disabled={loadingSecrets}>
          {loadingSecrets ? 'Checking…' : 'Check Secrets (/api/health/secrets)'}
        </button>
      </div>

      {error && (
        <div className="bct-alert bct-alert--error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="bct-cards">
        <ResultCard title="Health Check" result={health} emptyHint="Press Check Health above." />
        <ResultCard
          title="Backend Secrets (startup)"
          result={secrets}
          emptyHint="Press Check Secrets above. Shows boot-loaded values of AWS_SECRETS_HEALTH_PROBE_A/B (restart/redeploy to pick up AWS changes)."
        />
        <StaticCard
          title="Frontend Secrets (build-time)"
          ok={frontendOk}
          badge={frontendSecrets.status.toUpperCase()}
          data={frontendSecrets}
          emptyHint="Rebuild the frontend after changing VITE_* keys in Secrets Manager."
        />
      </div>
    </div>
  );
}

function ResultCard({
  title,
  result,
  emptyHint,
}: {
  title: string;
  result: CheckResult | null;
  emptyHint: string;
}) {
  const entries = result ? flattenEntries(result.data) : null;

  return (
    <div className={`bct-card${result ? ' bct-card--visible' : ''}`}>
      <div className="bct-card-header">
        <h2 className="bct-card-title">{title}</h2>
        {result && (
          <span className={`bct-badge ${result.ok ? 'bct-badge--ok' : 'bct-badge--fail'}`}>
            {result.httpStatus} {result.ok ? 'OK' : 'FAIL'}
          </span>
        )}
      </div>
      {result ? (
        <dl className="bct-dl">
          {entries &&
            entries.map(([key, value]) => (
              <div className="bct-dl-row" key={key}>
                <dt>{key}</dt>
                <dd>{fmtValue(value)}</dd>
              </div>
            ))}
          <div className="bct-dl-row">
            <dt>Checked at</dt>
            <dd>{new Date(result.ts).toLocaleTimeString()}</dd>
          </div>
        </dl>
      ) : (
        <p className="bct-card-empty">{emptyHint}</p>
      )}
    </div>
  );
}

function StaticCard({
  title,
  ok,
  badge,
  data,
  emptyHint,
}: {
  title: string;
  ok: boolean;
  badge: string;
  data: Record<string, unknown>;
  emptyHint: string;
}) {
  const entries = flattenEntries(data);
  const hasData = entries.some(([, value]) => value !== null && value !== '');

  return (
    <div className={`bct-card${hasData ? ' bct-card--visible' : ''}`}>
      <div className="bct-card-header">
        <h2 className="bct-card-title">{title}</h2>
        <span className={`bct-badge ${ok ? 'bct-badge--ok' : 'bct-badge--fail'}`}>{badge}</span>
      </div>
      {hasData ? (
        <dl className="bct-dl">
          {entries.map(([key, value]) => (
            <div className="bct-dl-row" key={key}>
              <dt>{key}</dt>
              <dd>{fmtValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="bct-card-empty">{emptyHint}</p>
      )}
    </div>
  );
}
