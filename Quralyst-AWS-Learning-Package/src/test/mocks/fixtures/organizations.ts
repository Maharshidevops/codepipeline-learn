// Seed organization fixture (dummy-data mode).
import type { Organization } from '@/types';

export const mockOrganization: Organization = {
  id: 'org_quralyst',
  name: 'Quralyst',
  slug: 'quralyst',
  joinCode: 'QR-QURALY',
  settings: { allowMemberKeys: true, orgKeyFallback: true, membersSeeOrgUsage: true },
  keyStatus: {
    openai_api_key: true,
    apollo_api_key: true,
    news_api_key: false,
    gmaps_api_key: true,
    coresignal_api_key: false,
    apify_api_key: false,
    anthropic_api_key: true,
    gemini_api_key: false,
    serper_api_key: false,
    kickbox_api_key: false,
    perplexity_api_key: false,
    gamma_api_key: false,
  },
  domains: [
    {
      value: 'indago-research.com',
      verifiedAt: '2026-01-10T00:00:00Z',
      verificationToken: 'quralyst-verify-abc123',
    },
  ],
};
