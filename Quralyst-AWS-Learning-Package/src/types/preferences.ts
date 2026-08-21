// User Preferences (API key) types. See PHASE-3 §2 + REF-API-CONTRACTS (Preferences).
import type { OrgKeyName } from './organization';

export type ApiKeySource = 'org' | 'user';

export type ApiKeyTestStatus =
  | 'valid'
  | 'not_configured'
  | 'invalid'
  | 'quota_exceeded'
  | 'credits_exhausted'
  | 'rate_limited'
  | 'timeout'
  | 'server_error'
  | 'error';

export interface ApiKeyTestResult {
  status: ApiKeyTestStatus;
  message: string;
  icon?: string; // optional Font Awesome class override
}

export interface PreferencesData {
  apiKeyStatus: Record<OrgKeyName, boolean>; // configured?
  apiKeySource: Partial<Record<OrgKeyName, ApiKeySource>>;
}

export interface UpdateApiKeysResult {
  success: boolean;
  message: string;
}

export interface TestApiKeysResult {
  success: boolean;
  message?: string;
  testResults: Record<OrgKeyName, ApiKeyTestResult>;
}
