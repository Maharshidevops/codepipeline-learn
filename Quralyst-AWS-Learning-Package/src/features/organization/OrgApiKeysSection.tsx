// Org default API keys — Settings ApiKeysTab UX (row expand / test / clear) wired to org endpoints.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { useModal } from '@/hooks/useModal';
import Modal from '@/components/ui/Modal/Modal';
import { organizationService } from '@/services/api';
import type { ApiKeyTestResult, OrgKeyName } from '@/types';
import type { EditData, EditPayload } from '@/services/api/organizationService';
import '@/styles/pages/settings.css';

interface KeyMeta {
  name: OrgKeyName;
  label: string;
  required?: boolean;
  apolloInfo?: boolean;
}

const KEYS: Record<OrgKeyName, KeyMeta> = {
  openai_api_key: { name: 'openai_api_key', label: 'OpenAI API Key', required: true },
  anthropic_api_key: { name: 'anthropic_api_key', label: 'Claude (Anthropic) API Key' },
  gemini_api_key: { name: 'gemini_api_key', label: 'Gemini (Google) API Key' },
  perplexity_api_key: { name: 'perplexity_api_key', label: 'Perplexity API Key' },
  apollo_api_key: { name: 'apollo_api_key', label: 'Apollo.io API Key', apolloInfo: true },
  coresignal_api_key: { name: 'coresignal_api_key', label: 'Coresignal API Key' },
  gmaps_api_key: { name: 'gmaps_api_key', label: 'Google Maps Extractor API Key' },
  apify_api_key: { name: 'apify_api_key', label: 'LinkedIn (Apify) API Key' },
  kickbox_api_key: { name: 'kickbox_api_key', label: 'Kickbox API Key' },
  serper_api_key: { name: 'serper_api_key', label: 'Serper (Google Search) API Key' },
  news_api_key: { name: 'news_api_key', label: 'News API Key (Brave Search API)' },
  gamma_api_key: { name: 'gamma_api_key', label: 'Gamma API Key (Tearsheet polish)' },
};

const KEY_GROUPS = [
  {
    title: 'Language Models',
    description: 'Required for scoring, rationale generation, and AI enrichment.',
    keys: ['openai_api_key', 'anthropic_api_key', 'gemini_api_key', 'perplexity_api_key'],
  },
  {
    title: 'Data Sources',
    description: 'Optional — each enabled source adds more company discovery coverage.',
    keys: [
      'apollo_api_key',
      'coresignal_api_key',
      'gmaps_api_key',
      'apify_api_key',
      'kickbox_api_key',
    ],
  },
  {
    title: 'Search Providers',
    description: 'Optional — used for broader market web searches.',
    keys: ['serper_api_key', 'news_api_key'],
  },
  {
    title: 'Tearsheet polish',
    description: 'Optional — Gamma generates the polished PDF deck after research.',
    keys: ['gamma_api_key'],
  },
] as const;

const APOLLO_ENDPOINTS = [
  { endpoint: '/api/v1/organizations/search', description: 'Required for Apollo Search.' },
  {
    endpoint: '/api/v1/organizations/enrich',
    description: 'Required for single company enrichment.',
  },
  { endpoint: '/api/v1/organizations/bulk_enrich', description: 'Required for bulk enrichment.' },
  {
    endpoint: '/api/v1/mixed_people/api_search',
    description: 'Required for contact/investor search.',
  },
  { endpoint: '/api/v1/people/match', description: 'Required for email matching/unlocking.' },
];

export interface OrgApiKeysSectionProps {
  slug: string;
  data: EditData;
  onKeyStatusChange: (next: Record<OrgKeyName, boolean>) => void;
  profileSnapshot: {
    name: string;
    allowMemberKeys: boolean;
    orgKeyFallback: boolean;
    membersSeeOrgUsage: boolean;
  };
}

export default function OrgApiKeysSection({
  slug,
  data,
  onKeyStatusChange,
  profileSnapshot,
}: OrgApiKeysSectionProps) {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const apolloModal = useModal();

  const [results, setResults] = useState<Partial<Record<OrgKeyName, ApiKeyTestResult>>>({});
  const [busy, setBusy] = useState<'update' | 'test' | 'clear' | null>(null);
  const [expandedKey, setExpandedKey] = useState<OrgKeyName | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expandedKey) inputRef.current?.focus();
  }, [expandedKey]);

  const configured = useMemo(
    () => data.keyStatus ?? ({} as Record<OrgKeyName, boolean>),
    [data.keyStatus],
  );

  const profilePayload = (): Omit<EditPayload, 'keys'> => ({
    name: profileSnapshot.name.trim(),
    allow_member_keys: profileSnapshot.allowMemberKeys,
    org_key_fallback: profileSnapshot.orgKeyFallback,
    members_see_org_usage: profileSnapshot.membersSeeOrgUsage,
  });

  const runTest = async () => {
    setBusy('test');
    try {
      const res = await organizationService.testApiKeys(slug);
      if (res.success) {
        setResults(res.testResults);
        const keys = Object.keys(res.testResults) as OrgKeyName[];
        const valid = keys.filter((k) => res.testResults[k].status === 'valid').length;
        let summary = `${valid}/${keys.length} API keys are working properly.\n\n`;
        keys.forEach((k) => {
          const name = k
            .replace(/_/g, ' ')
            .replace(/api key/i, '')
            .trim();
          summary += `${name.charAt(0).toUpperCase()}${name.slice(1)}: ${res.testResults[k].message}\n`;
        });
        success('API Keys Test Complete', summary, false);
      } else {
        error('API Keys Test Failed', res.message || 'Unknown error occurred');
      }
    } catch {
      error('API Keys Test Error', 'Failed to test API keys. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const testSingleKey = async (keyName: OrgKeyName, keyValue?: string) => {
    setBusy('test');
    try {
      const res = await organizationService.testSingleApiKey(slug, keyName, keyValue);
      if (res.success) {
        if (!keyValue) {
          setResults((prev) => ({ ...prev, [keyName]: res.testResults[keyName] }));
        }
        const row = res.testResults[keyName];
        if (row.status === 'valid') {
          success('Test Successful', row.message);
        } else {
          error('Test Failed', row.message);
        }
      } else {
        error('Test Failed', res.message || 'Unknown error occurred');
      }
    } catch {
      error('Test Error', 'Failed to test API key. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const updateKey = async (keyName: OrgKeyName) => {
    const v = inputValue.trim();
    if (!v) {
      error('Empty API Key', 'Please enter a valid API key to save.');
      return;
    }
    setBusy('update');
    try {
      const result = await organizationService.saveEdit(slug, {
        ...profilePayload(),
        keys: { [keyName]: v },
      });
      if (result.success) {
        onKeyStatusChange({ ...configured, [keyName]: true });
        setResults((r) => {
          const next = { ...r };
          delete next[keyName];
          return next;
        });
        success('API Key Saved', result.message || 'Organization API key updated.');
        setExpandedKey(null);
        setInputValue('');
        // Only verify the key that was just saved — full suite is "Test All API Keys".
        setTimeout(() => void testSingleKey(keyName), 600);
      } else {
        error('Update Failed', result.message || 'Failed to update API key.');
      }
    } catch {
      error('Error', 'An error occurred while updating the API key.');
    } finally {
      setBusy(null);
    }
  };

  const clearKey = async (keyName: OrgKeyName) => {
    const ok = await confirm({
      title: 'Clear API Key',
      message: 'Are you sure you want to clear this organization API key?',
      confirmText: 'Clear Key',
      cancelText: 'Cancel',
    });
    if (!ok) return;

    setBusy('clear');
    try {
      const result = await organizationService.saveEdit(slug, {
        ...profilePayload(),
        keys: { [keyName]: '' },
      });
      if (result.success) {
        onKeyStatusChange({ ...configured, [keyName]: false });
        setResults((r) => {
          const next = { ...r };
          delete next[keyName];
          return next;
        });
        success('API Key Cleared', result.message || 'The organization API key has been removed.');
      } else {
        error('Clear Failed', result.message || 'Failed to clear API key.');
      }
    } catch {
      error('Error', 'An error occurred while clearing API key.');
    } finally {
      setBusy(null);
    }
  };

  const clearAllKeys = async () => {
    const ok = await confirm({
      title: 'Clear All API Keys',
      message:
        'Are you sure you want to clear all organization default API keys? This cannot be undone.',
      confirmText: 'Clear All Keys',
      cancelText: 'Cancel',
    });
    if (!ok) return;

    setBusy('clear');
    try {
      const result = await organizationService.clearApiKeys(slug);
      if (result.success) {
        const nextStatus = { ...configured };
        (Object.keys(nextStatus) as OrgKeyName[]).forEach((k) => {
          nextStatus[k] = false;
        });
        onKeyStatusChange(nextStatus);
        setResults({});
        setExpandedKey(null);
        setInputValue('');
        success(
          'API Keys Cleared',
          result.message || 'All organization API keys have been cleared.',
        );
      } else {
        error('Clear Failed', result.message || 'Failed to clear API keys.');
      }
    } catch {
      error('Error', 'An error occurred while clearing API keys.');
    } finally {
      setBusy(null);
    }
  };

  const toggleExpand = (keyName: OrgKeyName) => {
    if (expandedKey === keyName) {
      setExpandedKey(null);
    } else {
      setExpandedKey(keyName);
      setInputValue('');
    }
  };

  const getStatusIcon = (keyName: OrgKeyName) => {
    const isConfig = configured[keyName];
    const res = results[keyName];

    if (res) {
      if (res.status === 'valid') return <i className="bi bi-shield-check" title={res.message} />;
      if (['quota_exceeded', 'credits_exhausted', 'rate_limited', 'timeout'].includes(res.status))
        return <i className="bi bi-shield-exclamation text-warning" title={res.message} />;
      return <i className="bi bi-shield-x text-danger" title={res.message} />;
    }

    if (isConfig) {
      return <i className="bi bi-shield-check" title="Configured" />;
    }
    return <i className="bi bi-shield" title="Not configured" />;
  };

  return (
    <div className="org-section">
      <div className="org-section-header">
        <div>
          <h2 className="org-section-title">Default API keys</h2>
          <p className="org-section-sub">
            Used when members rely on organization defaults. Same layout and testing as User
            Settings.
          </p>
        </div>
        <div className="org-section-actions">
          <button
            type="button"
            className="btn btn-outline-standard"
            onClick={clearAllKeys}
            disabled={busy !== null}
          >
            {busy === 'clear' ? 'Clearing...' : 'Clear All Keys'}
          </button>
          <button
            type="button"
            className="btn btn-standard"
            onClick={runTest}
            disabled={busy === 'test'}
          >
            {busy === 'test' ? 'Testing...' : 'Test All API Keys'}
          </button>
        </div>
      </div>
      <div className="org-section-body">
        <div className="api-keys-tab">
          <div className="api-keys-groups">
            {KEY_GROUPS.map((group) => (
              <div key={group.title} className="api-keys-group mb-4">
                <h5 className="api-keys-group-title">{group.title}</h5>
                <p className="api-keys-group-desc">{group.description}</p>
                <div className="api-keys-list">
                  {group.keys.map((keyName) => {
                    const meta = KEYS[keyName as OrgKeyName];
                    if (!meta) return null;
                    const kn = keyName as OrgKeyName;
                    const isExpanded = expandedKey === kn;

                    return (
                      <div
                        key={keyName}
                        className={`api-key-row-wrapper${isExpanded ? ' expanded' : ''}`}
                      >
                        <div className="api-key-row">
                          <div className="api-key-info">
                            <span
                              className={`api-key-status-icon ${configured[kn] ? 'status-configured' : 'status-empty'}`}
                            >
                              {getStatusIcon(kn)}
                            </span>
                            <div className="api-key-details">
                              <div className="api-key-header">
                                <span className="api-key-name fw-medium">{meta.label}</span>
                                <div className="api-key-badges ms-2">
                                  {meta.required && (
                                    <span className="settings-badge settings-badge--required">
                                      REQUIRED
                                    </span>
                                  )}
                                  <span className="settings-badge settings-badge--app">
                                    Org default
                                  </span>
                                </div>
                                {meta.apolloInfo && (
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 ms-2 text-muted"
                                    onClick={apolloModal.show}
                                    title="View required endpoints"
                                  >
                                    <i className="bi bi-info-circle" />
                                  </button>
                                )}
                              </div>
                              <div className="api-key-status-text">
                                {configured[kn] ? (
                                  <>
                                    <i className="bi bi-check-circle me-1 text-success" />
                                    Configured
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-dash-circle me-1 text-muted" />
                                    Not configured
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="api-key-actions d-flex align-items-center">
                            <button
                              type="button"
                              className="btn btn-icon text-muted me-2 border-0 bg-transparent"
                              onClick={() => testSingleKey(kn)}
                              title="Test Current Key"
                              disabled={busy === 'test' || !configured[kn]}
                            >
                              <i className="bi bi-play-circle" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-icon text-muted me-3 border-0 bg-transparent"
                              onClick={() => clearKey(kn)}
                              title="Clear Key"
                              disabled={busy === 'clear' || !configured[kn]}
                            >
                              <i className="bi bi-trash" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-standard api-key-update-btn px-3"
                              onClick={() => toggleExpand(kn)}
                            >
                              Update{' '}
                              <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} ms-1`} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="api-key-expand-content">
                            <div className="mb-3">
                              <input
                                ref={inputRef}
                                type="text"
                                className="api-key-input"
                                placeholder={`Paste your ${meta.label} here`}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                              />
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                              <button
                                type="button"
                                className="btn btn-standard"
                                onClick={() => updateKey(kn)}
                                disabled={busy === 'update' || !inputValue.trim()}
                              >
                                {busy === 'update' ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-standard"
                                disabled={busy === 'test' || !inputValue.trim()}
                                onClick={() => testSingleKey(kn, inputValue.trim())}
                              >
                                {busy === 'test' ? 'Testing...' : 'Test key'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-clear-all-text"
                                onClick={() => toggleExpand(kn)}
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="small text-muted">
                              <i className="bi bi-info-circle me-1" />
                              Organization default keys are used for member runs when allowed by
                              profile settings. They are stored encrypted and never logged.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={apolloModal.open}
        onClose={apolloModal.close}
        title="Required Apollo.io API Endpoints"
        size="md"
      >
        <p className="mb-3">
          The following endpoints must be enabled when creating your Apollo.io API key:
        </p>
        <div className="d-flex flex-column gap-2 mb-4">
          {APOLLO_ENDPOINTS.map((item, i) => (
            <div className="d-flex align-items-baseline" key={i}>
              <span className="me-2 text-muted">{i + 1}.</span>
              <span className="font-monospace small bg-light px-1 rounded me-2">
                {item.endpoint}
              </span>
              <span className="small text-muted">— {item.description}</span>
            </div>
          ))}
        </div>
        <div className="d-flex justify-content-end">
          <button type="button" className="btn btn-standard" onClick={apolloModal.close}>
            Got it
          </button>
        </div>
      </Modal>
    </div>
  );
}
