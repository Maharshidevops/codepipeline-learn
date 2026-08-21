/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ERROR_REPORTING_DSN: string;
  readonly VITE_LOG_SHIPPING: string;
  readonly VITE_BACKEND_CONNECTION_TEST_URL: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_SECRETS_HEALTH_PROBE_A: string;
  readonly VITE_SECRETS_HEALTH_PROBE_B: string;
  readonly VITE_SECRETS_LOADED_FROM_AWS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
