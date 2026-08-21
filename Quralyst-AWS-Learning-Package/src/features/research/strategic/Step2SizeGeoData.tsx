// Step 2 — Size, Geography & Data.
// Mirrors strategic_research.html wizard-step[data-step=2]: Size Criteria (min/max revenue +
// employees + AND/OR logic), deep-navy Geographic Criteria (LocationSelector), File upload +
// inline Custom Insights (toggle reveals scraping strategy + dynamic question array + company-size
// toggle), Enrichment toggles, and Additional Company Search (with count rows revealed by each
// toggle). Cross-field rules:
//   • Apollo enrichment auto-locks (force-checked + disabled) when gmaps/coresignal/linkedin search on.
//   • Coresignal search auto-disables when Skip Website Scraping is checked.
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form';
import { useEffect } from 'react';
import { CriteriaCard, Toggle, NumberInput, TextInput } from '@/components/ui';
import { LocationSelector } from '@/components/domain';
import { FileUpload } from '@/components/form';
import type { StrategicForm, OrgKeyName } from '@/types';
import { useApiKeyStatus } from '../useApiKeyStatus';
import {
  gateFor,
  keyOk,
  llmGate,
  anyLlmValid,
  LLM_PROVIDER_KEY,
  isLastSelectedLlm,
  providerToForceSelect,
  type LlmProviderName,
} from '../apiKeyGating';
import { ApiKeyVerifyingBanner, ApiKeyDisabledNote } from '../ApiKeyNotices';
import { AdditionalSearchOption } from '../AdditionalSearchOption';
import InsightPresetChips from '../InsightPresetChips';

const SIZE_LOGIC = [
  { value: 'AND', label: 'Require BOTH to match (AND)', id: 'size_logic_and_strategic' },
  { value: 'OR', label: 'Either one is enough (OR)', id: 'size_logic_or_strategic' },
];

const LLM_PROVIDERS: { name: LlmProviderName; label: string }[] = [
  { name: 'openai', label: 'OpenAI (GPT)' },
  { name: 'anthropic', label: 'Anthropic (Claude)' },
  { name: 'google', label: 'Google (Gemini)' },
];

// Boolean toggles gated on a provider key being valid (see apiKeyGating / the legacy validate*Toggle).
type GatedBoolPath =
  | 'enrichment.useApollo'
  | 'enrichment.useNews'
  | 'enrichment.acquisitionEnrichment'
  | 'enrichment.enableLinkedinEnrichment'
  | 'additionalSearch.enableApolloSearch'
  | 'additionalSearch.enableGmapsSearch'
  | 'additionalSearch.enableCoresignalSearch'
  | 'additionalSearch.enableLinkedinSearch'
  | 'llm.providers.openai'
  | 'llm.providers.anthropic'
  | 'llm.providers.google';

const GATED_TOGGLES: { field: GatedBoolPath; key: OrgKeyName }[] = [
  { field: 'enrichment.useApollo', key: 'apollo_api_key' },
  { field: 'enrichment.useNews', key: 'news_api_key' },
  { field: 'enrichment.acquisitionEnrichment', key: 'news_api_key' },
  { field: 'enrichment.enableLinkedinEnrichment', key: 'apify_api_key' },
  { field: 'additionalSearch.enableApolloSearch', key: 'apollo_api_key' },
  { field: 'additionalSearch.enableGmapsSearch', key: 'gmaps_api_key' },
  { field: 'additionalSearch.enableCoresignalSearch', key: 'coresignal_api_key' },
  { field: 'additionalSearch.enableLinkedinSearch', key: 'apify_api_key' },
  { field: 'llm.providers.openai', key: LLM_PROVIDER_KEY.openai },
  { field: 'llm.providers.anthropic', key: LLM_PROVIDER_KEY.anthropic },
  { field: 'llm.providers.google', key: LLM_PROVIDER_KEY.google },
];

export interface Step2Props {
  form: UseFormReturn<StrategicForm>;
  files: File[];
  onFilesChange: (files: File[]) => void;
  customInsightsOpen: boolean;
  onToggleCustomInsights: () => void;
  skipWebsiteScraping: boolean;
  onSkipWebsiteScrapingChange: (v: boolean) => void;
}

export default function Step2SizeGeoData({
  form,
  files,
  onFilesChange,
  customInsightsOpen,
  onToggleCustomInsights,
  skipWebsiteScraping,
  onSkipWebsiteScrapingChange,
}: Step2Props) {
  const { control, register, watch, setValue } = form;
  const questions = useFieldArray({ control, name: 'customInsights.questions' });

  const gmaps = watch('additionalSearch.enableGmapsSearch');
  const coresignal = watch('additionalSearch.enableCoresignalSearch');
  const linkedinSearch = watch('additionalSearch.enableLinkedinSearch');
  const useDefaultLlm = watch('llm.useDefault');
  const llmProviders = watch('llm.providers');

  // API-key guard: probe all provider keys, gray out toggles whose key isn't valid.
  const { testResults, isVerifying } = useApiKeyStatus();
  const gate = (key: OrgKeyName) => gateFor(testResults, key, isVerifying);

  // Apollo enrichment auto-lock: force-checked & disabled while any of gmaps/coresignal/linkedin
  // search is enabled (those sources REQUIRE Apollo enrichment).
  const apolloLocked = gmaps || coresignal || linkedinSearch;
  useEffect(() => {
    if (apolloLocked) setValue('enrichment.useApollo', true, { shouldDirty: true });
  }, [apolloLocked, setValue]);

  // Coresignal auto-disable when Skip Website Scraping is checked.
  useEffect(() => {
    if (skipWebsiteScraping && coresignal) {
      setValue('additionalSearch.enableCoresignalSearch', false, { shouldDirty: true });
    }
  }, [skipWebsiteScraping, coresignal, setValue]);

  // Once probing finishes, force-uncheck any toggle whose key isn't valid so a stale draft can't
  // submit an unusable option (skip Apollo while it's auto-locked by an enabled search source).
  useEffect(() => {
    if (isVerifying) return;
    GATED_TOGGLES.forEach(({ field, key }) => {
      if (field === 'enrichment.useApollo' && apolloLocked) return;
      if (!keyOk(testResults, key)) setValue(field, false);
    });
    // Ownership enrichment / blank-field backfill run through the modular LLM — need ≥1 valid provider key.
    if (!anyLlmValid(testResults)) {
      setValue('enrichment.ownershipEnrichment', false);
      setValue('enrichment.blankFieldBackfill', false);
    }
  }, [isVerifying, testResults, setValue, apolloLocked]);

  // Keep ≥1 of OpenAI / Claude / Gemini selected when the user customizes the list.
  useEffect(() => {
    if (isVerifying || useDefaultLlm || !llmProviders) return;
    const force = providerToForceSelect(testResults, llmProviders);
    if (force) setValue(`llm.providers.${force}`, true);
  }, [isVerifying, useDefaultLlm, llmProviders, testResults, setValue]);

  return (
    <>
      {/* Step 2 header */}
      <div className="wizard-header mb-4">
        <h2 className="criteria-title wizard-title">Other Preferred Buyer Attributes</h2>
      </div>

      {/* Size Criteria Card */}
      <CriteriaCard variant="white" className="size-criteria-card mb-4 p-4">
        <div className="mb-2">
          <h3 className="mb-1">Size Criteria</h3>
          {/* a11y (Phase 35): captions for input groups are <span>s, not <label>s — label[for]
              cannot target a group; the inputs carry aria-labels instead. */}
          <span className="form-label fw-bold">Mention the size criteria</span>
        </div>
        <div className="row g-2 align-items-center mb-3">
          <div className="col-12 col-md-4">
            <span className="form-label mb-0">Revenue:</span>
          </div>
          <div className="col-6 col-md-3">
            <NumberInput
              pill
              min={0}
              placeholder="Min"
              aria-label="Minimum revenue"
              {...register('size.minRevenue')}
            />
          </div>
          <div className="col-6 col-md-3">
            <NumberInput
              pill
              min={0}
              placeholder="Max"
              aria-label="Maximum revenue"
              {...register('size.maxRevenue')}
            />
          </div>
        </div>
        <div className="row g-2 align-items-center mb-3">
          <div className="col-12 col-md-4">
            <span className="form-label mb-0">No. of Employees:</span>
          </div>
          <div className="col-6 col-md-3">
            <NumberInput
              pill
              min={0}
              placeholder="Min"
              aria-label="Minimum employees"
              {...register('size.minEmployees')}
            />
          </div>
          <div className="col-6 col-md-3">
            <NumberInput
              pill
              min={0}
              placeholder="Max"
              aria-label="Maximum employees"
              {...register('size.maxEmployees')}
            />
          </div>
        </div>
        <div className="mt-2 mb-2">
          <span className="form-label d-block mb-2">Size match logic:</span>
          <Controller
            control={control}
            name="size.sizeCriteriaLogic"
            render={({ field: f }) => (
              <div className="d-flex flex-wrap gap-4 form-check">
                {SIZE_LOGIC.map((opt) => (
                  <div className="form-check-inline" key={opt.value}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name="size_criteria_logic"
                      id={opt.id}
                      value={opt.value}
                      checked={f.value === opt.value}
                      onChange={() => f.onChange(opt.value)}
                    />
                    <label className="form-check-label" htmlFor={opt.id}>
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          />
        </div>
      </CriteriaCard>

      {/* Geographic Criteria Card (deep-navy) */}
      <CriteriaCard variant="deep" className="mb-4 p-4">
        <div className="mb-2">
          <h3 className="mb-2">Geographic Criteria</h3>
          <span className="form-label">Select the geographical criteria</span>
        </div>
        <Controller
          control={control}
          name="geography"
          render={({ field: f }) => (
            <LocationSelector value={f.value} onChange={(rows) => f.onChange(rows)} />
          )}
        />
      </CriteriaCard>

      {/* Upload & Custom Insights Combined Card (deep-navy) */}
      <CriteriaCard variant="deep" className="p-4 mb-4">
        <div className="flex-grow-1 w-100 mb-3">
          <FileUpload
            files={files}
            onChange={onFilesChange}
            accept=".xlsx,.xls,.csv"
            multiple
            inputId="file-upload-input"
            listId="file-list"
          />
        </div>

        <button
          type="button"
          className="btn btn-standard btn-custom-insights rounded-pill py-2"
          id="toggle-custom-insights-btn"
          onClick={onToggleCustomInsights}
        >
          <i className="bi bi-stars me-2" aria-hidden="true" />
          Generate Custom Insights
          <i className="bi bi-chevron-down ms-2" aria-hidden="true" />
        </button>

        {customInsightsOpen && (
          <div className="custom-insights-inline mt-3">
            <div className="custom-insights-inline-card rounded-4 p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="mb-0">Custom Insights</h3>
                <button
                  type="button"
                  className="btn-close-insights rounded-circle"
                  id="close-custom-insights-inline"
                  title="Clear and close"
                  onClick={onToggleCustomInsights}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>

              <p className="text-muted mb-3">
                Enter your questions to generate custom insights from your data.
              </p>

              <InsightPresetChips onAdd={(label) => questions.append({ value: label })} />

              {/* Scraping Strategy (strategic only) */}
              <div className="mb-4">
                <span className="form-label fw-bold">Scraping Strategy</span>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="scrapingPaths"
                    id="strategicPaths"
                    value="strategic"
                    checked
                    readOnly
                  />
                  <label className="form-check-label" htmlFor="strategicPaths">
                    <strong>Strategic Paths</strong> - General business websites (about, services,
                    contact, etc.)
                  </label>
                </div>
              </div>

              {/* Dynamic question array */}
              <div id="question-inputs-container" className="mb-3">
                {questions.fields.map((field, i) => (
                  <div className="question-input-group mb-2" key={field.id}>
                    <div className="input-group">
                      <TextInput
                        pill
                        className="question-input"
                        placeholder="Enter your question?"
                        {...register(`customInsights.questions.${i}.value`)}
                      />
                      {i === questions.fields.length - 1 ? (
                        <button
                          type="button"
                          className="btn btn-standard rounded-circle ms-2"
                          id="add-question-btn"
                          title="Add another question"
                          onClick={() => questions.append({ value: '' })}
                        >
                          <i className="bi bi-plus" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-clear-all ms-2"
                          title="Remove question"
                          onClick={() => questions.remove(i)}
                        >
                          <i className="bi bi-x-lg" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Company Size Insight Toggle */}
              <div className="company-size-toggle-section pt-2">
                <Controller
                  control={control}
                  name="customInsights.useCompanySizeInsight"
                  render={({ field: f }) => (
                    <Toggle
                      id="use_company_size_insight"
                      checked={f.value}
                      onChange={(e) => f.onChange(e.target.checked)}
                      label="Alternate Company Size Insights"
                    />
                  )}
                />
                <div className="text-muted small mt-1">
                  Automatically analyzes company size including financials, employees, facilities,
                  vehicles, clients, and other quantitative metrics
                </div>
              </div>
            </div>
          </div>
        )}
      </CriteriaCard>

      {/* Skip Website Scraping (drives the Coresignal auto-disable rule) */}
      <CriteriaCard variant="white" className="mb-4 p-4">
        <Toggle
          id="skip_website_scraping"
          checked={skipWebsiteScraping}
          onChange={(e) => onSkipWebsiteScrapingChange(e.target.checked)}
          label="Skip Website Scraping"
        />
        <div className="text-muted small">
          Skip website scraping and validate companies only from the uploaded or source-provided
          business descriptions.
        </div>
      </CriteriaCard>

      {/* Enrichment Options Card */}
      <CriteriaCard variant="white" className="mb-4 p-4">
        <div className="mb-3">
          <h3 className="mb-2">Enrichment Options</h3>
        </div>

        {isVerifying && <ApiKeyVerifyingBanner />}

        <span className="form-label">
          Select the toggle to include recent news articles and updates about companies
        </span>
        <Controller
          control={control}
          name="enrichment.useNews"
          render={({ field: f }) => {
            const g = gate('news_api_key');
            return (
              <div className="mb-3" style={g.disabled ? { opacity: 0.5 } : undefined}>
                <Toggle
                  id="use_news"
                  checked={f.value}
                  disabled={g.disabled}
                  onChange={(e) => f.onChange(e.target.checked)}
                  label="Include News Enrichment"
                />
                <ApiKeyDisabledNote reason={g.reason} />
              </div>
            );
          }}
        />

        <span className="form-label">
          Select the toggle to include additional contact and company data from Apollo API
        </span>
        <Controller
          control={control}
          name="enrichment.useApollo"
          render={({ field: f }) => {
            const g = gate('apollo_api_key');
            return (
              <div className="mb-3" style={g.disabled ? { opacity: 0.5 } : undefined}>
                <Toggle
                  id="use_apollo"
                  checked={f.value}
                  disabled={apolloLocked || g.disabled}
                  onChange={(e) => f.onChange(e.target.checked)}
                  label="Include Apollo Data Enrichment"
                />
                {apolloLocked && (
                  <div className="text-muted small">
                    Required and locked on while Google Maps, Coresignal, or LinkedIn search is
                    enabled.
                  </div>
                )}
                <ApiKeyDisabledNote reason={g.reason} />
              </div>
            );
          }}
        />

        <span className="form-label">Select the toggle to include LinkedIn profile data</span>
        <Controller
          control={control}
          name="enrichment.enableLinkedinEnrichment"
          render={({ field: f }) => {
            const g = gate('apify_api_key');
            return (
              <div className="mb-3" style={g.disabled ? { opacity: 0.5 } : undefined}>
                <Toggle
                  id="enable_linkedin_enrichment"
                  checked={f.value}
                  disabled={g.disabled}
                  onChange={(e) => f.onChange(e.target.checked)}
                  label="Include LinkedIn Enrichment"
                />
                <ApiKeyDisabledNote reason={g.reason} />
              </div>
            );
          }}
        />

        <span className="form-label">
          Select the toggle to enrich results with ownership structure and key stakeholders
        </span>
        <Controller
          control={control}
          name="enrichment.ownershipEnrichment"
          render={({ field: f }) => {
            const g = llmGate(testResults, isVerifying);
            return (
              <div className="mb-3" style={g.disabled ? { opacity: 0.5 } : undefined}>
                <Toggle
                  id="ownership_enrichment"
                  checked={f.value}
                  disabled={g.disabled}
                  onChange={(e) => f.onChange(e.target.checked)}
                  label="Ownership Enrichment"
                />
                <div className="text-muted small">
                  Enrich results with ownership structure and key stakeholder information.
                </div>
                <ApiKeyDisabledNote reason={g.reason} />
              </div>
            );
          }}
        />

        <span className="form-label">
          Select the toggle to fill blank Parent Company / Owner Type / Active Investors via web
          search
        </span>
        <Controller
          control={control}
          name="enrichment.blankFieldBackfill"
          render={({ field: f }) => {
            const g = llmGate(testResults, isVerifying);
            return (
              <div className="mb-3" style={g.disabled ? { opacity: 0.5 } : undefined}>
                <Toggle
                  id="blank_field_backfill"
                  checked={f.value}
                  disabled={g.disabled}
                  onChange={(e) => f.onChange(e.target.checked)}
                  label="Blank-field Web Backfill"
                />
                <div className="text-muted small">
                  Web-search still-blank Parent Company, Owner Type, and Active Investors (Serper →
                  LLM, with Perplexity fallback).
                </div>
                <ApiKeyDisabledNote reason={g.reason} />
              </div>
            );
          }}
        />

        <span className="form-label">
          Select the toggle to enrich results with acquisition-related data
        </span>
        <Controller
          control={control}
          name="enrichment.acquisitionEnrichment"
          render={({ field: f }) => {
            const g = gate('news_api_key');
            return (
              <div className="mb-3" style={g.disabled ? { opacity: 0.5 } : undefined}>
                <Toggle
                  id="acquisition_enrichment"
                  checked={f.value}
                  disabled={g.disabled}
                  onChange={(e) => f.onChange(e.target.checked)}
                  label="Acquisition Enrichment"
                />
                <div className="text-muted small">
                  Enrich results with acquisition-related data and market trends.
                </div>
                <ApiKeyDisabledNote reason={g.reason} />
              </div>
            );
          }}
        />
      </CriteriaCard>

      {/* LLM Model Selection Card */}
      <CriteriaCard variant="white" className="mb-4 p-4">
        <div className="mb-3">
          <h3 className="mb-2">LLM Model Selection</h3>
        </div>

        <Controller
          control={control}
          name="llm.useDefault"
          render={({ field: f }) => (
            <div className="mb-2">
              <Toggle
                id="use_default_llm_models"
                checked={f.value}
                onChange={(e) => f.onChange(e.target.checked)}
                label="Use default LLM models (recommended)"
              />
              <div className="text-muted small">
                Use all available providers with automatic failover. Turn this off to choose
                specific models.
              </div>
            </div>
          )}
        />

        {!useDefaultLlm && (
          <div className="ms-3 ps-2 border-start">
            <span className="form-label">Select the LLM providers to use</span>
            <p className="text-muted small mb-2">Select at least one: OpenAI, Claude, or Gemini.</p>
            {LLM_PROVIDERS.map((p) => {
              const g = gate(LLM_PROVIDER_KEY[p.name]);
              const lastLocked =
                !!llmProviders && !isVerifying && isLastSelectedLlm(llmProviders, p.name);
              const lockedOff = g.disabled;
              return (
                <Controller
                  key={p.name}
                  control={control}
                  name={`llm.providers.${p.name}`}
                  render={({ field: f }) => (
                    <div
                      className="mb-2"
                      style={lockedOff || lastLocked ? { opacity: 0.5 } : undefined}
                    >
                      <Toggle
                        id={`llm_provider_${p.name}`}
                        checked={f.value}
                        disabled={lockedOff || lastLocked}
                        onChange={(e) => {
                          const next = e.target.checked;
                          if (!next && llmProviders && isLastSelectedLlm(llmProviders, p.name)) {
                            return;
                          }
                          f.onChange(next);
                        }}
                        label={p.label}
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
                <div className="mb-1 mt-2">
                  <Toggle
                    id="llm_fallback_enabled"
                    checked={f.value}
                    onChange={(e) => f.onChange(e.target.checked)}
                    label="Enable automatic fallback"
                  />
                  <div className="text-muted small">
                    If a selected provider fails, automatically try the others.
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </CriteriaCard>

      {/* Additional Company Search Options Card */}
      <CriteriaCard variant="white" className="mb-4 p-4">
        <div className="mb-3">
          <h3 className="mb-2">Additional Company Search Options</h3>
        </div>

        <AdditionalSearchOption
          control={control}
          enableName="additionalSearch.enableApolloSearch"
          countName="additionalSearch.apolloMaxResults"
          sectionId="apollo-search-section"
          enableId="enable_apollo_search"
          countId="apollo_max_results"
          countRowId="apollo_search_count_row"
          intro="Search for additional companies from Apollo database"
          title="Enrich more companies from Apollo"
          desc="Searches Apollo database for matching companies and adds them to your results"
          countLabel="Maximum companies to fetch from Apollo:"
          placeholder="Leave empty for all available"
          max={1000}
          {...gate('apollo_api_key')}
        />
        <AdditionalSearchOption
          control={control}
          enableName="additionalSearch.enableGmapsSearch"
          countName="additionalSearch.gmapsMaxResults"
          sectionId="gmaps-search-section"
          enableId="enable_gmaps_search"
          countId="gmaps_max_results"
          countRowId="gmaps_search_count_row"
          intro="Search for additional companies from Google Maps"
          title="Enrich more companies from Google Maps"
          desc="Searches Google Maps for matching companies and adds them to your results"
          countLabel="Maximum companies to fetch from Google Maps:"
          placeholder="Leave empty for all available (up to 500)"
          max={500}
          {...gate('gmaps_api_key')}
        />
        <div id="coresignal-search-section">
          <AdditionalSearchOption
            control={control}
            enableName="additionalSearch.enableCoresignalSearch"
            countName="additionalSearch.coresignalMaxResults"
            enableId="enable_coresignal_search"
            countId="coresignal_max_results"
            countRowId="coresignal_search_count_row"
            intro="Search for additional companies from Coresignal"
            title="Enrich more companies from Coresignal"
            desc="Searches Coresignal API for matching companies and adds them to your results. Apollo Data Enrichment is REQUIRED - ensure it's enabled above."
            countLabel="Maximum companies to fetch from Coresignal:"
            placeholder="Leave empty for all available (up to 500)"
            max={500}
            disabled={skipWebsiteScraping || gate('coresignal_api_key').disabled}
            reason={gate('coresignal_api_key').reason}
          />
          {skipWebsiteScraping && (
            <div id="coresignal-fast-track-note" className="text-muted small mb-2">
              Skip Website Scraping disables Coresignal because the current Coresignal search
              preview does not provide enough description data to validate fit without website
              scraping.
            </div>
          )}
        </div>
        <AdditionalSearchOption
          control={control}
          enableName="additionalSearch.enableLinkedinSearch"
          countName="additionalSearch.linkedinMaxResults"
          sectionId="linkedin-search-section"
          enableId="enable_linkedin_search"
          countId="linkedin_max_results"
          countRowId="linkedin_search_count_row"
          intro="Search for additional companies from LinkedIn"
          title="Enrich more companies from LinkedIn"
          desc="Uses Apify to find and scrape LinkedIn company data based on your business criteria"
          countLabel="Maximum companies to fetch from LinkedIn:"
          placeholder="Leave empty for default (50)"
          max={200}
          {...gate('apify_api_key')}
        />
        <AdditionalSearchOption
          control={control}
          enableName="additionalSearch.enableFindallSearch"
          countName="additionalSearch.findallMaxResults"
          sectionId="findall-search-section"
          enableId="enable_findall_search"
          countId="findall_max_results"
          countRowId="findall_search_count_row"
          intro="Discover companies with FindAll (Parallel.ai)"
          title="FindAll discovery"
          desc="Uses Parallel.ai FindAll Fast Entity Search to discover matching companies"
          countLabel="Maximum companies to fetch from FindAll:"
          placeholder="Leave empty for default (40)"
          max={200}
        />
      </CriteriaCard>
    </>
  );
}
