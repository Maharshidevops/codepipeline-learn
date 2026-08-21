// API-key gating for the research wizards. Ports the legacy validate*Toggle logic
// (Backup/static/js/components/api-key-tester.js + the research templates): each enrichment /
// additional-search / LLM-provider toggle depends on a provider key, and a toggle is disabled +
// grayed when its key's probe didn't come back 'valid'. The probe itself is POST
// /profile/user-preferences/test-api-keys (see useApiKeyStatus).
import type { ApiKeyTestResult, OrgKeyName } from '@/types';

export type TestResults = Partial<Record<OrgKeyName, ApiKeyTestResult>>;

// Short, human label for a provider key — used in the "<X> is unavailable" copy.
const KEY_LABEL: Record<OrgKeyName, string> = {
  openai_api_key: 'OpenAI',
  anthropic_api_key: 'Anthropic',
  gemini_api_key: 'Google (Gemini)',
  apollo_api_key: 'Apollo',
  news_api_key: 'News API',
  gmaps_api_key: 'Google Maps',
  coresignal_api_key: 'Coresignal',
  apify_api_key: 'LinkedIn (Apify)',
  serper_api_key: 'Serper (Search)',
  kickbox_api_key: 'Kickbox',
  perplexity_api_key: 'Perplexity',
  gamma_api_key: 'Gamma',
};

/** A key is usable only when its probe returned 'valid'. Anything else — missing, invalid, quota /
 *  credits exhausted, rate-limited, timeout, error, or simply absent from the response — disables
 *  the features that depend on it. */
export function keyOk(results: TestResults | undefined, key: OrgKeyName): boolean {
  return results?.[key]?.status === 'valid';
}

/** Human reason for a non-valid key, mirroring the legacy validate*Toggle copy. */
export function keyReason(results: TestResults | undefined, key: OrgKeyName): string {
  const label = KEY_LABEL[key];
  const result = results?.[key];
  switch (result?.status) {
    case 'not_configured':
      return `${label} API key is not configured.`;
    case 'invalid':
      return `${label} API key is invalid.`;
    case 'quota_exceeded':
      return `${label} API quota is exhausted.`;
    case 'credits_exhausted':
      return `${label} API credits are exhausted.`;
    case 'rate_limited':
      return `${label} API is rate limited — try again later.`;
    case 'timeout':
      return `Couldn't reach ${label} (request timed out).`;
    default:
      return result?.message ? `${label}: ${result.message}` : `${label} API is unavailable.`;
  }
}

export interface ToggleGate {
  disabled: boolean;
  reason: string; // '' when enabled or still verifying
}

/** Compute a toggle's gate from the probe state. While verifying we leave the toggle ENABLED (the
 *  user fills details freely; only the final "start processing" action is held). Once results are
 *  in, a non-valid key disables the toggle with a reason. */
export function gateFor(
  results: TestResults | undefined,
  key: OrgKeyName,
  verifying: boolean,
): ToggleGate {
  if (verifying) return { disabled: false, reason: '' };
  if (keyOk(results, key)) return { disabled: false, reason: '' };
  return { disabled: true, reason: keyReason(results, key) };
}

// Providers that can satisfy an LLM-backed feature (ownership enrichment runs through the modular
// LLM, so it needs at least one valid provider key).
const LLM_KEYS: OrgKeyName[] = ['openai_api_key', 'anthropic_api_key', 'gemini_api_key'];

export type LlmProviderName = 'openai' | 'anthropic' | 'google';

export const LLM_PROVIDER_NAMES: LlmProviderName[] = ['openai', 'anthropic', 'google'];

/** LLM provider toggle → the API key it depends on. */
export const LLM_PROVIDER_KEY: Record<LlmProviderName, OrgKeyName> = {
  openai: 'openai_api_key',
  anthropic: 'anthropic_api_key',
  google: 'gemini_api_key',
};

export type LlmProviderSelection = Record<LlmProviderName, boolean>;

export function anyLlmValid(results: TestResults | undefined): boolean {
  return LLM_KEYS.some((k) => keyOk(results, k));
}

/** Providers whose keys probed as valid (usable for selection). */
export function validLlmProviders(results: TestResults | undefined): LlmProviderName[] {
  return LLM_PROVIDER_NAMES.filter((p) => keyOk(results, LLM_PROVIDER_KEY[p]));
}

/** True when this is the only selected provider — turning it off would leave none
 *  (OpenAI / Claude / Gemini are treated the same). */
export function isLastSelectedLlm(providers: LlmProviderSelection, name: LlmProviderName): boolean {
  if (!providers[name]) return false;
  return !LLM_PROVIDER_NAMES.some((p) => p !== name && providers[p]);
}

/** When none of the usable providers are selected, return one to force back on. */
export function providerToForceSelect(
  results: TestResults | undefined,
  providers: LlmProviderSelection,
): LlmProviderName | null {
  const usable = validLlmProviders(results);
  if (!usable.length) return null;
  if (usable.some((p) => providers[p])) return null;
  // Prefer any already-selected name if somehow selected-but-invalid slipped through,
  // otherwise the first usable provider (openai → anthropic → google).
  return usable[0] ?? null;
}

/** Gate for an LLM-backed toggle (e.g. Ownership Enrichment): disabled once verified with no valid
 *  OpenAI/Anthropic/Gemini key. */
export function llmGate(results: TestResults | undefined, verifying: boolean): ToggleGate {
  if (verifying || anyLlmValid(results)) return { disabled: false, reason: '' };
  return {
    disabled: true,
    reason:
      'No valid LLM provider key (OpenAI / Anthropic / Gemini) — ownership enrichment is unavailable.',
  };
}

/** Submit-time preflight (Tier A / A9 / F8, thin). The per-toggle gates above disable optional
 *  enrichments whose keys are missing, but core scoring ALWAYS needs an LLM — so a run started
 *  with no valid LLM provider key would fail mid-pipeline. This is the final guard: returns a
 *  block reason to hold the "Generate" submit, or '' when allowed (or still verifying — the button
 *  is separately disabled while verifying). Frontend-only; reuses the existing probe results. */
export function preflightSubmitBlock(results: TestResults | undefined, verifying: boolean): string {
  if (verifying) return '';
  if (anyLlmValid(results)) return '';
  return 'No valid LLM provider key (OpenAI / Anthropic / Gemini). Add one in Settings before running.';
}
