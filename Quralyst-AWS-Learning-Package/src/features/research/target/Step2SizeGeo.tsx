// Target Step 2+3 — Replit Filters + Find & enrich SectionCards (not legacy criteria cards).
import { useEffect } from 'react';
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { LocationSelector } from '@/components/domain';
import type { TargetListForm, LocationGroup, OrgKeyName } from '@/types';
import { useApiKeyStatus } from '../useApiKeyStatus';
import {
  gateFor,
  keyOk,
  LLM_PROVIDER_KEY,
  isLastSelectedLlm,
  providerToForceSelect,
  type LlmProviderName,
} from '../apiKeyGating';
import { ApiKeyDisabledNote } from '../ApiKeyNotices';
import { SectionGroup, SectionCard } from '@/features/research/composer/Section';
import { SourceToggle, OptionToggle } from '@/features/research/composer/SourceToggle';
import '@/styles/pages/research-composer.css';

const LLM_PROVIDERS: { name: LlmProviderName; label: string }[] = [
  { name: 'openai', label: 'OpenAI (GPT)' },
  { name: 'anthropic', label: 'Anthropic (Claude)' },
  { name: 'google', label: 'Google (Gemini)' },
];

type GatedSearchPath =
  | 'additionalSearch.enableApolloSearch'
  | 'additionalSearch.enableGmapsSearch'
  | 'additionalSearch.enableCoresignalSearch'
  | 'additionalSearch.enableLinkedinSearch'
  | 'enrichment.useNews'
  | 'enrichment.apolloEnrichMode';

const GATED_TOGGLES: { field: GatedSearchPath; key: OrgKeyName }[] = [
  { field: 'additionalSearch.enableApolloSearch', key: 'apollo_api_key' },
  { field: 'additionalSearch.enableGmapsSearch', key: 'gmaps_api_key' },
  { field: 'additionalSearch.enableCoresignalSearch', key: 'coresignal_api_key' },
  { field: 'additionalSearch.enableLinkedinSearch', key: 'apify_api_key' },
  { field: 'enrichment.useNews', key: 'news_api_key' },
  { field: 'enrichment.apolloEnrichMode', key: 'apollo_api_key' },
];

export interface Step2SizeGeoProps {
  control: Control<TargetListForm>;
  setValue: UseFormSetValue<TargetListForm>;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function Step2SizeGeo({
  control,
  setValue,
  files,
  onFilesChange,
}: Step2SizeGeoProps) {
  const { testResults, isVerifying } = useApiKeyStatus();
  const gate = (key: OrgKeyName) => gateFor(testResults, key, isVerifying);

  const apolloOn = useWatch({ control, name: 'additionalSearch.enableApolloSearch' });
  const coresignalOn = useWatch({ control, name: 'additionalSearch.enableCoresignalSearch' });
  const gmapsOn = useWatch({ control, name: 'additionalSearch.enableGmapsSearch' });
  const linkedinOn = useWatch({ control, name: 'additionalSearch.enableLinkedinSearch' });
  const findallOn = useWatch({ control, name: 'additionalSearch.enableFindallSearch' });
  const apolloEnrichMode = useWatch({ control, name: 'enrichment.apolloEnrichMode' });
  const useDefaultLlm = useWatch({ control, name: 'llm.useDefault' });
  const llmProviders = useWatch({ control, name: 'llm.providers' });
  const enableSourceWithCompanyEnrichment = (
    enabled: boolean,
    onChange: (enabled: boolean) => void,
  ) => {
    onChange(enabled);
    if (enabled && (!apolloEnrichMode || apolloEnrichMode === 'none')) {
      setValue('enrichment.apolloEnrichMode', 'company_data', { shouldDirty: true });
    }
  };
  const hasSource =
    !!apolloOn || !!coresignalOn || !!gmapsOn || !!linkedinOn || !!findallOn || files.length > 0;

  useEffect(() => {
    if (isVerifying) return;
    GATED_TOGGLES.forEach(({ field, key }) => {
      if (!keyOk(testResults, key)) {
        if (field === 'enrichment.apolloEnrichMode') setValue(field, 'none');
        else setValue(field, false);
      }
    });
    // These belonged to the legacy target form and are not part of Replit TargetMode.
    setValue('enrichment.useApollo', false);
    setValue('enrichment.enableLinkedinEnrichment', false);
    setValue('enrichment.ownershipEnrichment', false);
    setValue('enrichment.acquisitionEnrichment', false);
  }, [isVerifying, testResults, setValue]);

  useEffect(() => {
    if (isVerifying || useDefaultLlm || !llmProviders) return;
    const force = providerToForceSelect(testResults, llmProviders);
    if (force) setValue(`llm.providers.${force}`, true);
  }, [isVerifying, useDefaultLlm, llmProviders, testResults, setValue]);

  return (
    <>
      <SectionGroup
        step={2}
        title="Filters"
        description="Narrow discovery by geography and company size."
      >
        <SectionCard
          icon="bi-geo-alt"
          title="Geography"
          hint="Add one or more locations to filter by geography."
        >
          <Controller
            control={control}
            name="geography"
            render={({ field: f }) => (
              <LocationSelector
                value={f.value as LocationGroup[]}
                onChange={(rows) => f.onChange(rows)}
              />
            )}
          />
        </SectionCard>

        <SectionCard icon="bi-rulers" title="Size criteria" hint="Filter by headcount and revenue.">
          <div className="lb-size-grid">
            <div>
              <label className="lb-field-label" htmlFor="target-min-employees">
                Min employees
              </label>
              <Controller
                control={control}
                name="size.minEmployees"
                render={({ field: f }) => (
                  <input
                    id="target-min-employees"
                    type="number"
                    min={0}
                    className="form-control"
                    value={f.value ?? ''}
                    onChange={(e) => f.onChange(e.target.value)}
                    placeholder="Min"
                  />
                )}
              />
            </div>
            <div>
              <label className="lb-field-label" htmlFor="target-max-employees">
                Max employees
              </label>
              <Controller
                control={control}
                name="size.maxEmployees"
                render={({ field: f }) => (
                  <input
                    id="target-max-employees"
                    type="number"
                    min={0}
                    className="form-control"
                    value={f.value ?? ''}
                    onChange={(e) => f.onChange(e.target.value)}
                    placeholder="Max"
                  />
                )}
              />
            </div>
            <div>
              <label className="lb-field-label" htmlFor="target-min-revenue">
                Min revenue (USD)
              </label>
              <Controller
                control={control}
                name="size.minRevenue"
                render={({ field: f }) => (
                  <input
                    id="target-min-revenue"
                    type="number"
                    min={0}
                    className="form-control"
                    value={f.value ?? ''}
                    onChange={(e) => f.onChange(e.target.value)}
                    placeholder="Min"
                  />
                )}
              />
            </div>
            <div>
              <label className="lb-field-label" htmlFor="target-max-revenue">
                Max revenue (USD)
              </label>
              <Controller
                control={control}
                name="size.maxRevenue"
                render={({ field: f }) => (
                  <input
                    id="target-max-revenue"
                    type="number"
                    min={0}
                    className="form-control"
                    value={f.value ?? ''}
                    onChange={(e) => f.onChange(e.target.value)}
                    placeholder="Max"
                  />
                )}
              />
            </div>
          </div>
          <div className="lb-size-logic mt-3">
            <label className="lb-field-label mb-0" htmlFor="target-size-logic">
              Combine size filters with
            </label>
            <Controller
              control={control}
              name="size.sizeCriteriaLogic"
              render={({ field: f }) => (
                <select
                  id="target-size-logic"
                  className="form-select form-select-sm"
                  style={{ width: '7rem' }}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}
            />
          </div>
        </SectionCard>
      </SectionGroup>

      <SectionGroup
        step={3}
        title="Find & enrich"
        description="Choose where to find companies and how to enrich them."
      >
        <SectionCard
          icon="bi-database"
          title="Discovery sources"
          hint="Enable at least one source to find companies."
        >
          <div className="lb-source-stack">
            <Controller
              control={control}
              name="additionalSearch.enableApolloSearch"
              render={({ field: f }) => (
                <Controller
                  control={control}
                  name="additionalSearch.apolloMaxResults"
                  render={({ field: max }) => (
                    <SourceToggle
                      label="Apollo"
                      description="Discover additional companies from Apollo's database."
                      enabled={!!f.value}
                      onToggle={f.onChange}
                      maxResults={max.value}
                      onMaxChange={max.onChange}
                      hint="50 is a good starting point. Increase if your criteria are broad."
                      disabled={gate('apollo_api_key').disabled}
                    />
                  )}
                />
              )}
            />
            <Controller
              control={control}
              name="additionalSearch.enableCoresignalSearch"
              render={({ field: f }) => (
                <Controller
                  control={control}
                  name="additionalSearch.coresignalMaxResults"
                  render={({ field: max }) => (
                    <SourceToggle
                      label="Coresignal"
                      description="Firmographic discovery from Coresignal."
                      enabled={!!f.value}
                      onToggle={f.onChange}
                      maxResults={max.value}
                      onMaxChange={max.onChange}
                      disabled={gate('coresignal_api_key').disabled}
                    />
                  )}
                />
              )}
            />
            <Controller
              control={control}
              name="additionalSearch.enableGmapsSearch"
              render={({ field: f }) => (
                <Controller
                  control={control}
                  name="additionalSearch.gmapsMaxResults"
                  render={({ field: max }) => (
                    <SourceToggle
                      label="Google Maps"
                      description="Local business discovery via Google Maps."
                      enabled={!!f.value}
                      onToggle={(enabled) => enableSourceWithCompanyEnrichment(enabled, f.onChange)}
                      maxResults={max.value}
                      onMaxChange={max.onChange}
                      disabled={gate('gmaps_api_key').disabled}
                    />
                  )}
                />
              )}
            />
            <Controller
              control={control}
              name="additionalSearch.enableFindallSearch"
              render={({ field: f }) => (
                <Controller
                  control={control}
                  name="additionalSearch.findallMaxResults"
                  render={({ field: max }) => (
                    <SourceToggle
                      label="FindAll"
                      description="AI company discovery from Parallel.ai."
                      enabled={!!f.value}
                      onToggle={(enabled) => enableSourceWithCompanyEnrichment(enabled, f.onChange)}
                      maxResults={max.value}
                      onMaxChange={max.onChange}
                    />
                  )}
                />
              )}
            />
            <Controller
              control={control}
              name="additionalSearch.enableLinkedinSearch"
              render={({ field: f }) => (
                <Controller
                  control={control}
                  name="additionalSearch.linkedinMaxResults"
                  render={({ field: max }) => (
                    <SourceToggle
                      label="LinkedIn"
                      description="Company discovery via LinkedIn search."
                      enabled={!!f.value}
                      onToggle={(enabled) => enableSourceWithCompanyEnrichment(enabled, f.onChange)}
                      maxResults={max.value}
                      onMaxChange={max.onChange}
                      disabled={gate('apify_api_key').disabled}
                    />
                  )}
                />
              )}
            />
          </div>
          {!hasSource && (
            <p className="text-danger small mt-3 mb-0">
              Enable at least one discovery source or upload a company list to run.
            </p>
          )}
        </SectionCard>

        <SectionCard
          icon="bi-cloud-upload"
          title="Upload a company list (optional)"
          hint="Have your own list? Upload a spreadsheet (.xlsx or .csv) of companies to enrich and score against your mandate."
        >
          <label className="lb-upload-drop">
            <i className="bi bi-cloud-arrow-up" aria-hidden />
            <span className="lb-upload-drop__title">Click to choose file(s)</span>
            <span className="lb-upload-drop__hint">.xlsx, .xls or .csv</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              className="d-none"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length) onFilesChange([...files, ...picked]);
                e.target.value = '';
              }}
            />
          </label>
          {files.length > 0 && (
            <ul className="lb-upload-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  <span>
                    <i className="bi bi-file-earmark-spreadsheet me-2" aria-hidden />
                    {f.name}
                    <span className="text-muted small ms-2">{(f.size / 1024).toFixed(0)} KB</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-muted"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon="bi-stars"
          title="Enrichment & options"
          hint="Tune how companies are enriched and validated."
        >
          <div className="lb-source-stack">
            <Controller
              control={control}
              name="enrichment.apolloEnrichMode"
              render={({ field: mode }) => (
                <OptionToggle
                  label="Auto-enrich after generation (Apollo)"
                  description="Fetch contacts and/or firmographic data via Apollo once the list is ready."
                  enabled={!!mode.value && mode.value !== 'none'}
                  onToggle={(enabled) => mode.onChange(enabled ? 'contacts' : 'none')}
                  disabled={gate('apollo_api_key').disabled}
                  details={
                    <div className="lb-option-toggle__details">
                      <label className="lb-field-label" htmlFor="apollo-enrichment-mode">
                        Enrichment type
                      </label>
                      <select
                        id="apollo-enrichment-mode"
                        className="form-select form-select-sm"
                        value={mode.value === 'none' ? 'contacts' : mode.value}
                        onChange={(e) => mode.onChange(e.target.value)}
                      >
                        <option value="contacts">Contacts only</option>
                        <option value="company_data">Company data only</option>
                        <option value="all">Contacts + company data</option>
                      </select>
                      <p className="lb-fineprint mt-1 mb-0">
                        Runs automatically after the target list finishes.
                      </p>
                    </div>
                  }
                />
              )}
            />
            <Controller
              control={control}
              name="enrichment.useNews"
              render={({ field: f }) => (
                <OptionToggle
                  label="Include recent news"
                  description="Pull recent news signals for each company."
                  enabled={!!f.value}
                  onToggle={f.onChange}
                  disabled={gate('news_api_key').disabled}
                />
              )}
            />
            <Controller
              control={control}
              name="enrichment.blankFieldBackfill"
              render={({ field: f }) => (
                <OptionToggle
                  label="Blank-field web backfill"
                  description="Fill still-blank Parent Company, Owner Type, and Active Investors via web search (Serper / Perplexity)."
                  enabled={!!f.value}
                  onToggle={f.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="enrichment.acquisitionTargetReadiness"
              render={({ field: f }) => (
                <OptionToggle
                  label="Acquisition Target Readiness"
                  description="Add an AI-researched readiness score for each company as an acquisition target."
                  enabled={!!f.value}
                  onToggle={f.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="enrichment.sellSideMandateReadiness"
              render={({ field: f }) => (
                <OptionToggle
                  label="Sell-side Mandate Readiness"
                  description="Add an AI-researched score gauging each company's readiness for a sell-side mandate."
                  enabled={!!f.value}
                  onToggle={f.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="primaryBusinessOnly"
              render={({ field: f }) => (
                <OptionToggle
                  label="Primary business only"
                  description="On = primary line of business only. Off = includes companies where this is a secondary or adjacent business unit."
                  enabled={!!f.value}
                  onToggle={f.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="skipWebsiteScraping"
              render={({ field: f }) => (
                <OptionToggle
                  label="Skip website scraping"
                  description="Faster, but less description data to validate fit."
                  enabled={!!f.value}
                  onToggle={f.onChange}
                />
              )}
            />
          </div>
        </SectionCard>

        <SectionCard
          icon="bi-cpu"
          title="LLM model selection"
          hint="Choose which AI providers score and enrich companies for this run."
        >
          <Controller
            control={control}
            name="llm.useDefault"
            render={({ field: f }) => (
              <OptionToggle
                label="Use default LLM models (recommended)"
                description="Use all available providers with automatic failover. Turn this off to choose specific models."
                enabled={!!f.value}
                onToggle={f.onChange}
              />
            )}
          />
          {!useDefaultLlm && (
            <div className="lb-llm-providers">
              <p className="lb-field-label mb-1">Select the LLM providers to use</p>
              <p className="lb-fineprint mb-2">Select at least one: OpenAI, Claude, or Gemini.</p>
              <div className="lb-source-stack">
                {LLM_PROVIDERS.map((p) => {
                  const g = gate(LLM_PROVIDER_KEY[p.name]);
                  const lastLocked =
                    !!llmProviders && !isVerifying && isLastSelectedLlm(llmProviders, p.name);
                  return (
                    <Controller
                      key={p.name}
                      control={control}
                      name={`llm.providers.${p.name}`}
                      render={({ field: f }) => (
                        <div>
                          <OptionToggle
                            label={p.label}
                            enabled={!!f.value}
                            onToggle={(next) => {
                              if (
                                !next &&
                                llmProviders &&
                                isLastSelectedLlm(llmProviders, p.name)
                              ) {
                                return;
                              }
                              f.onChange(next);
                            }}
                            disabled={g.disabled || lastLocked}
                          />
                          <ApiKeyDisabledNote reason={g.reason} />
                        </div>
                      )}
                    />
                  );
                })}
                <Controller
                  control={control}
                  name="llm.enableFallback"
                  render={({ field: f }) => (
                    <OptionToggle
                      label="Enable automatic fallback"
                      description="If a selected provider fails, automatically try the others."
                      enabled={!!f.value}
                      onToggle={f.onChange}
                    />
                  )}
                />
              </div>
            </div>
          )}
        </SectionCard>
      </SectionGroup>
    </>
  );
}
