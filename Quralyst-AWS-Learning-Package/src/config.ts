// config (Phase 16) — read + validate the app's env vars once, in one typed place, instead of
// scattering `import.meta.env` reads across the codebase. See .env.example for the documented vars.
//   VITE_API_BASE_URL              — base URL prefixed to every request (empty = same-origin).
//   VITE_ERROR_REPORTING_DSN       — Sentry DSN; empty = reporting fully off.
//   VITE_LOG_SHIPPING              — 'true' ships batched frontend logs to /api/logs.
//   VITE_LOG_TO_TERMINAL           — mirror dev logs (warnings, errors, every API request/response) to the
//                                    `npm run dev` terminal (Phase 40). Default ON in dev; forced OFF in
//                                    tests (MODE='test') and production builds. Set 'false' to silence it.
//   VITE_BACKEND_CONNECTION_TEST_URL — ops page override for which backend to hit.
//   VITE_SECRETS_HEALTH_PROBE_A/B  — non-secret probes to verify AWS SM → build pipeline.
//   VITE_SECRETS_LOADED_FROM_AWS   — set by scripts/load-aws-secrets.mjs on prod builds.
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  errorReportingDsn: import.meta.env.VITE_ERROR_REPORTING_DSN ?? '',
  logShipping: import.meta.env.VITE_LOG_SHIPPING === 'true',
  backendConnectionTestUrl: import.meta.env.VITE_BACKEND_CONNECTION_TEST_URL ?? '',
  appVersion: import.meta.env.VITE_APP_VERSION ?? '',
  logToTerminal:
    import.meta.env.DEV &&
    import.meta.env.MODE !== 'test' &&
    (import.meta.env.VITE_LOG_TO_TERMINAL ?? 'true') !== 'false',
  secrets: {
    loadedFromAws: import.meta.env.VITE_SECRETS_LOADED_FROM_AWS === 'true',
    healthProbeA: import.meta.env.VITE_SECRETS_HEALTH_PROBE_A ?? '',
    healthProbeB: import.meta.env.VITE_SECRETS_HEALTH_PROBE_B ?? '',
  },
} as const;

export type FrontendSecretsHealth = {
  source: 'aws_secrets_manager' | 'local_env';
  status: 'healthy' | 'local' | 'degraded';
  connected: boolean;
  error: string | null;
  probes: {
    VITE_SECRETS_HEALTH_PROBE_A: string | null;
    VITE_SECRETS_HEALTH_PROBE_B: string | null;
  };
  missing_probes: string[];
};

/** Build-time frontend secrets status (baked into the bundle). */
export function frontendSecretsHealth(): FrontendSecretsHealth {
  const probeA = config.secrets.healthProbeA.trim();
  const probeB = config.secrets.healthProbeB.trim();
  const missing: string[] = [];
  if (!probeA) missing.push('VITE_SECRETS_HEALTH_PROBE_A');
  if (!probeB) missing.push('VITE_SECRETS_HEALTH_PROBE_B');

  const loadedFromAws = config.secrets.loadedFromAws;
  let status: FrontendSecretsHealth['status'];
  if (!loadedFromAws) {
    status = missing.length ? 'degraded' : 'local';
  } else {
    status = missing.length ? 'degraded' : 'healthy';
  }

  return {
    source: loadedFromAws ? 'aws_secrets_manager' : 'local_env',
    status,
    connected: loadedFromAws,
    error: missing.length
      ? `Probe key(s) missing in the built bundle: ${missing.join(', ')}`
      : loadedFromAws
        ? null
        : 'Built from local .env (AWS_SECRETS_ENABLED was off at build time).',
    probes: {
      VITE_SECRETS_HEALTH_PROBE_A: probeA || null,
      VITE_SECRETS_HEALTH_PROBE_B: probeB || null,
    },
    missing_probes: missing,
  };
}
