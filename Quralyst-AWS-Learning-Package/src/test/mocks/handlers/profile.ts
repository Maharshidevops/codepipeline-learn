// MSW handlers for profile + preferences (Phase 3). Profile update/password/image succeed;
// preferences return seeded status/source; test-keys returns a mix of statuses; GPT-key test passes.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import type { OrgKeyName, ApiKeyTestResult } from '@/types';

const apiKeyStatus: Record<OrgKeyName, boolean> = {
  openai_api_key: true,
  apollo_api_key: true,
  news_api_key: false,
  gmaps_api_key: false,
  coresignal_api_key: true,
  apify_api_key: false,
  anthropic_api_key: true,
  gemini_api_key: false,
  serper_api_key: false,
  kickbox_api_key: false,
  perplexity_api_key: false,
  gamma_api_key: false,
};

const apiKeySource: Partial<Record<OrgKeyName, 'org' | 'user'>> = {
  openai_api_key: 'org',
  apollo_api_key: 'user',
  coresignal_api_key: 'org',
  anthropic_api_key: 'user',
};

const testResults: Record<OrgKeyName, ApiKeyTestResult> = {
  openai_api_key: { status: 'valid', message: 'OpenAI key is valid.' },
  apollo_api_key: { status: 'valid', message: 'Apollo.io key is valid.' },
  news_api_key: { status: 'error', message: 'No News API key configured.' },
  gmaps_api_key: { status: 'error', message: 'No Google Maps key configured.' },
  coresignal_api_key: { status: 'quota_exceeded', message: 'Coresignal quota exceeded.' },
  apify_api_key: { status: 'error', message: 'No Apify key configured.' },
  anthropic_api_key: { status: 'valid', message: 'Anthropic key is valid.' },
  gemini_api_key: { status: 'error', message: 'No Gemini key configured.' },
  serper_api_key: { status: 'error', message: 'No Serper key configured.' },
  kickbox_api_key: { status: 'error', message: 'No Kickbox key configured.' },
  perplexity_api_key: { status: 'error', message: 'No Perplexity key configured.' },
  gamma_api_key: { status: 'error', message: 'No Gamma key configured.' },
};

export const profileHandlers = [
  http.post(endpoints.profile.update, () => ok(null, { message: 'Profile updated successfully' })),
  http.post(endpoints.profile.changePassword, () =>
    ok(null, { message: 'Password updated successfully.' }),
  ),
  // uploadImage: data carries imageUrl (the service maps it to image_url); toast in message.
  http.post(endpoints.profile.uploadImage, () =>
    ok({ imageUrl: '/images/logo.png' }, { message: 'Profile image updated.' }),
  ),

  http.get(endpoints.profile.currentApiKeys, () => ok({ apiKeyStatus, apiKeySource })),
  // updateApiKeys: data is the domain {success, message} the service returns verbatim.
  http.post(endpoints.profile.updateApiKeys, () =>
    ok({ success: true, message: 'API keys updated successfully.' }),
  ),
  // testApiKeys: data carries only {testResults} (the service re-adds success).
  http.post(endpoints.profile.testApiKeys, () => ok({ testResults })),
  // Per-key test used by Settings → API Keys expand/test flow.
  http.post(`${endpoints.profile.testApiKeys}/:keyName`, ({ params }) => {
    const keyName = params.keyName as OrgKeyName;
    const result = testResults[keyName] ?? {
      status: 'error' as const,
      message: 'No result for key.',
    };
    return ok({ testResults: { [keyName]: result } });
  }),
  http.post(endpoints.profile.clearApiKeys, () =>
    ok(null, { message: 'All API keys have been cleared.' }),
  ),
  // testGptKey: data keeps the domain {success, message} the consumer reads.
  http.post(endpoints.profile.testGptKey, () => ok({ success: true, message: 'GPT key valid.' })),
  // Bootstrap poll (processService.getActiveProcessing). No job running in mock mode — without this
  // handler the request fell through to the /api dev proxy and logged ECONNREFUSED.
  http.get(endpoints.profile.activeProcessing, () => ok({ active: false, completed: false })),
];
