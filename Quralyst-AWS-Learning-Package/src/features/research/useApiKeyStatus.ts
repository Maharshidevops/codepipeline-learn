// Probe all provider API keys once, shared across the research wizard. Both the page (to disable
// Next/Submit while verifying — the legacy "validation guard") and its Step-2 component (to gray out
// toggles whose key isn't valid) call this; React Query dedupes by key, so it runs a single
// POST /profile/user-preferences/test-api-keys per staleTime window.
import { useQuery } from '@tanstack/react-query';
import { preferencesService } from '@/services/api';
import type { TestResults } from './apiKeyGating';

export interface ApiKeyStatus {
  testResults: TestResults;
  isVerifying: boolean;
}

export function useApiKeyStatus(): ApiKeyStatus {
  const query = useQuery({
    queryKey: ['apiKeyStatus'],
    // Resolve to an empty result on failure instead of throwing — a probe outage shouldn't pop the
    // global error toast; empty results just conservatively gray out every gated toggle (matches the
    // legacy per-key catch behaviour).
    queryFn: async (): Promise<TestResults> => {
      try {
        const res = await preferencesService.testApiKeys();
        return res.testResults ?? {};
      } catch {
        return {};
      }
    },
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { testResults: query.data ?? {}, isVerifying: query.isLoading };
}
