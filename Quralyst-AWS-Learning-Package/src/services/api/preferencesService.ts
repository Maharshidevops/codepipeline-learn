// Preferences service (API keys). UserPreferencesPage reads status/source, updates keys (only
// non-empty), tests keys, and clears keys. Also exposes the GPT-key test used by process-preference.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { OrgKeyName, PreferencesData, TestApiKeysResult, UpdateApiKeysResult } from '@/types';

export interface GptKeyTestResult {
  success: boolean;
  message: string;
  redirect_url?: string;
}

export interface PreferencesService {
  getPreferences(): Promise<PreferencesData>;
  updateApiKeys(keys: Partial<Record<OrgKeyName, string>>): Promise<UpdateApiKeysResult>;
  testApiKeys(): Promise<TestApiKeysResult>;
  testSingleApiKey(keyName: OrgKeyName, keyValue?: string): Promise<TestApiKeysResult>;
  clearApiKeys(): Promise<UpdateApiKeysResult>;
  testGptKey(): Promise<GptKeyTestResult>;
}

export const preferencesService: PreferencesService = {
  // getPreferences/updateApiKeys/testGptKey: the payload already matches the envelope's `data`.
  getPreferences: () => http<PreferencesData>(endpoints.profile.currentApiKeys),
  updateApiKeys: (keys) =>
    http<UpdateApiKeysResult>(endpoints.profile.updateApiKeys, {
      method: 'POST',
      body: JSON.stringify(keys),
    }),
  // testApiKeys: `data` carries only {testResults}; re-add the (always-true) success flag.
  testApiKeys: async () => {
    const data = await http<Pick<TestApiKeysResult, 'testResults'>>(endpoints.profile.testApiKeys, {
      method: 'POST',
    });
    return { success: true, ...data };
  },
  testSingleApiKey: async (keyName, keyValue) => {
    const data = await http<Pick<TestApiKeysResult, 'testResults'>>(
      `${endpoints.profile.testApiKeys}/${keyName}`,
      {
        method: 'POST',
        body: keyValue ? JSON.stringify({ keyValue }) : undefined,
      },
    );
    return { success: true, ...data };
  },
  // clearApiKeys: pure mutation — toast comes from the envelope `message`.
  clearApiKeys: async () => {
    const env = await http.full(endpoints.profile.clearApiKeys, { method: 'POST' });
    return { success: true, message: env.message ?? '' };
  },
  testGptKey: () => http<GptKeyTestResult>(endpoints.profile.testGptKey, { method: 'POST' }),
};
