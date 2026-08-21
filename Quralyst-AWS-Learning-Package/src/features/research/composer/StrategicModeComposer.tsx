// StrategicModeComposer — Replit-parity strategic buyer list composer.
// Uses the lb-* CSS design system (research-composer.css / strategic-research.css).
// Preserves: LLM provider selection, API key gating, credit calculation (1 credit = 10 companies).

import { useMemo, useState } from 'react';
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form';
import type { StrategicForm, OrgKeyName } from '@/types';
import { profileExampleUrl } from '@/features/research/composerPrefill';
import { memoryService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { LocationSelector } from '@/components/domain';
import { FileUpload } from '@/components/form';
import { useApiKeyStatus } from '../useApiKeyStatus';
import {
  gateFor,
  LLM_PROVIDER_KEY,
  isLastSelectedLlm,
  type LlmProviderName,
} from '../apiKeyGating';
import { ApiKeyDisabledNote } from '../ApiKeyNotices';
import InsightPresetChips from '../InsightPresetChips';
import { ComposerLayout, RunPanel, type ChecklistItem, type SummaryItem } from './ComposerLayout';
import { SectionGroup, SectionCard } from './Section';
import { SourceToggle, OptionToggle } from './SourceToggle';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StrategicBuyerMode = 'horizontal' | 'vertical' | 'adjacent';

const BUYER_MODES: { value: StrategicBuyerMode; label: string; tooltip: string }[] = [
  {
    value: 'horizontal',
    label: 'Horizontal',
    tooltip:
      'A buyer with the same kind of product, expanding into a new geography or customer segment.',
  },
  {
    value: 'vertical',
    label: 'Vertical',
    tooltip: 'A buyer upstream or downstream in the value chain, e.g. a supplier or a distributor.',
  },
  {
    value: 'adjacent',
    label: 'Adjacent',
    tooltip: 'A buyer with a complementary product that serves the same customers.',
  },
];

const LLM_PROVIDERS: { name: LlmProviderName; label: string }[] = [
  { name: 'openai', label: 'OpenAI (GPT)' },
  { name: 'anthropic', label: 'Anthropic (Claude)' },
  { name: 'google', label: 'Google (Gemini)' },
];

export interface StrategicModeComposerProps {
  form: UseFormReturn<StrategicForm>;
  files: File[];
  onFilesChange: (files: File[]) => void;
  customInsightsOpen: boolean;
  onToggleCustomInsights: () => void;
  skipWebsiteScraping: boolean;
  onSkipWebsiteScrapingChange: (v: boolean) => void;
  submitting: boolean;
  keysVerifying: boolean;
  llmBlock: string | null;
  onSubmit: () => void;
  onSaveDraft: () => void;
  dealId?: string;
  dealName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StrategicModeComposer({
  form,
  files,
  onFilesChange,
  skipWebsiteScraping,
  onSkipWebsiteScrapingChange,
  submitting,
  keysVerifying,
  llmBlock,
  onSubmit,
  onSaveDraft,
  dealId,
  dealName,
}: StrategicModeComposerProps) {
  const { control, register, watch, setValue } = form;
  const toast = useToast();
  // Example-URL profiling (path c): which URL is being profiled + which failed, for inline feedback.
  const [profilingUrl, setProfilingUrl] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const questions = useFieldArray({ control, name: 'customInsights.questions' });
  const businessQueries = useFieldArray({ control, name: 'businessQuery' });

  // -------------------------------------------------------------------------
  // Three ways to set buyer criteria
  // -------------------------------------------------------------------------
  // a = From the target (Target Details section is shown)
  // b = Directly (buyer profile / geography / size fields — always shown)
  // c = From an example (Example company websites card is shown)
  const [ways, setWays] = useState<'a' | 'b' | 'c'>('a');

  // Target HQ multi-location support (path a)
  const [targetLocations, setTargetLocations] = useState<string[]>(['']);
  // Target size (path a)
  const [targetRevenue, setTargetRevenue] = useState('');
  const [targetEmployees, setTargetEmployees] = useState('');

  // Example URLs (path c)
  const [exampleUrls, setExampleUrls] = useState<string[]>([]);
  const [exampleUrlInput, setExampleUrlInput] = useState('');

  // Strategic buyer angle pills
  const [buyerModes, setBuyerModes] = useState<StrategicBuyerMode[]>(['horizontal']);

  // Custom insights accordion
  const [insightsOpen, setInsightsOpen] = useState(false);

  // Discovery source max-result state (uncontrolled via local state to keep the form slim)
  const [apolloMax, setApolloMax] = useState('50');
  const [gmapsMax, setGmapsMax] = useState('50');
  const [coresignalMax, setCoresignalMax] = useState('50');
  const [linkedinMax, setLinkedinMax] = useState('50');
  const [findallMax, setFindallMax] = useState('50');

  // Enrichment local state
  const [enrichEnabled, setEnrichEnabled] = useState(false);

  // Form watches
  const useDefaultLlm = watch('llm.useDefault');
  const llmProviders = watch('llm.providers');
  const enableApollo = watch('additionalSearch.enableApolloSearch');
  const enableGmaps = watch('additionalSearch.enableGmapsSearch');
  const enableCoresignal = watch('additionalSearch.enableCoresignalSearch');
  const enableLinkedin = watch('additionalSearch.enableLinkedinSearch');
  const enableFindall = watch('additionalSearch.enableFindallSearch');

  // API key gating
  const { testResults, isVerifying } = useApiKeyStatus();
  const gate = (key: OrgKeyName) => gateFor(testResults, key, isVerifying);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const toggleBuyerMode = (mode: StrategicBuyerMode) => {
    setBuyerModes((prev) =>
      prev.includes(mode)
        ? prev.length > 1
          ? prev.filter((m) => m !== mode)
          : prev
        : [...prev, mode],
    );
    if (mode === 'horizontal') setValue('buyerHorizontal', !buyerModes.includes('horizontal'));
    if (mode === 'vertical') setValue('buyerVertical', !buyerModes.includes('vertical'));
    if (mode === 'adjacent') setValue('buyerAdjacent', !buyerModes.includes('adjacent'));
  };

  const handleAddExampleUrl = async () => {
    const u = exampleUrlInput.trim();
    if (!u) return;
    setExampleUrls((prev) => (prev.includes(u) ? prev : [...prev, u]));
    setExampleUrlInput('');

    // "Find buyers like this one": profile the example URL and fold its criteria into the buyer
    // profile. Intent 'example-buyer-profile' tells the parser to read it as an acquirer, not a
    // target. The example wins (overwrite) so the pasted company drives the search. Best-effort —
    // a profiling failure stays visible on the chip so the user knows it never entered the criteria.
    setFailedUrls((prev) => {
      const next = new Set(prev);
      next.delete(u);
      return next;
    });
    setProfilingUrl(u);
    try {
      const applied = await profileExampleUrl(
        u,
        'example-buyer-profile',
        form.getValues as unknown as () => Record<string, unknown>,
        form.setValue as unknown as (n: string, v: unknown, o?: { shouldDirty?: boolean }) => void,
      );
      if (applied > 0) {
        toast.success(`Profiled ${u} — buyer criteria updated.`);
        // Behavioral signal (best-effort): the profiled example becomes a positive preference in the
        // analyst's memory and an exemplar standing note in the buyer firm's shared memory. Fire-and-
        // forget — recordMandateExamples swallows failures so it can never affect the chip flow.
        const v = form.getValues() as unknown as Record<string, unknown>;
        void memoryService.recordMandateExamples({
          intent: 'example-buyer-profile',
          industry: (v.industry as string) || '',
          subIndustry: (v.subIndustry as string) || '',
          idealBuyerTypes: buyerModes,
          examples: [{ website: u }],
        });
      } else {
        setFailedUrls((prev) => new Set(prev).add(u));
        toast.error(`Couldn't extract criteria from ${u}.`);
      }
    } catch (err) {
      setFailedUrls((prev) => new Set(prev).add(u));
      toast.error((err as { message?: string })?.message ?? `Couldn't profile ${u}.`);
    } finally {
      setProfilingUrl(null);
    }
  };

  // -------------------------------------------------------------------------
  // Run summary calculations — our credit math: 1 credit = 10 companies
  // -------------------------------------------------------------------------

  const enabledSources = useMemo(() => {
    const list: string[] = [];
    if (enableApollo) list.push('Apollo');
    if (enableGmaps) list.push('Google Maps');
    if (enableCoresignal) list.push('Coresignal');
    if (enableLinkedin) list.push('LinkedIn');
    if (enableFindall) list.push('FindAll');
    return list;
  }, [enableApollo, enableGmaps, enableCoresignal, enableLinkedin, enableFindall]);

  const totalMaxCompanies = useMemo(() => {
    let n = 0;
    if (enableApollo) n += parseInt(apolloMax, 10) || 50;
    if (enableGmaps) n += parseInt(gmapsMax, 10) || 50;
    if (enableCoresignal) n += parseInt(coresignalMax, 10) || 50;
    if (enableLinkedin) n += parseInt(linkedinMax, 10) || 50;
    if (enableFindall) n += parseInt(findallMax, 10) || 50;
    if (files.length > 0) n += 100; // rough estimate for upload
    return n || 50;
  }, [
    enableApollo,
    enableGmaps,
    enableCoresignal,
    enableLinkedin,
    enableFindall,
    apolloMax,
    gmapsMax,
    coresignalMax,
    linkedinMax,
    findallMax,
    files.length,
  ]);

  const estimatedCredits = Math.ceil(totalMaxCompanies / 10);

  const hasSourceInput = enabledSources.length > 0 || files.length > 0;
  const hasTargetProfile = ways !== 'a' || !!watch('targetDescription')?.trim();
  const hasBuyerQuery = businessQueries.fields.some((q) => (q as { value: string }).value?.trim());

  const summaryItems: SummaryItem[] = useMemo(() => {
    const items: SummaryItem[] = [];
    if (dealId) items.push({ label: 'Deal', value: dealName || dealId });
    if (enabledSources.length > 0)
      items.push({ label: 'Sources', value: enabledSources.join(', ') });
    if (hasSourceInput) {
      items.push({ label: 'Max companies', value: String(totalMaxCompanies) });
      items.push({ label: 'Est. credits', value: `${estimatedCredits} (10 co/credit)` });
    }
    return items;
  }, [dealId, dealName, enabledSources, hasSourceInput, totalMaxCompanies, estimatedCredits]);

  const checklistItems: ChecklistItem[] = useMemo(() => {
    const list: ChecklistItem[] = [];
    if (ways === 'a') list.push({ label: 'Target profile filled in', done: hasTargetProfile });
    list.push({ label: 'Buyer description added', done: hasBuyerQuery });
    list.push({
      label: 'At least one data source enabled',
      done: hasSourceInput,
      nudge: !hasSourceInput,
    });
    return list;
  }, [ways, hasTargetProfile, hasBuyerQuery, hasSourceInput]);

  const outputsTags = [
    'Company',
    'Fit score',
    'Location',
    'Employees',
    'Revenue',
    'Website',
    'LinkedIn',
  ];

  // Dynamic step counters: step 1 = Target Details (ways=a only), always: Buyer Details, Find & enrich
  const targetStep = ways === 'a' ? 1 : 0;
  const buyerStep = ways === 'a' ? 2 : 1;
  const findStep = ways === 'a' ? 3 : 2;

  // Contextual tip
  const activeTip =
    ways === 'a'
      ? 'The more specific your company profile, the better the fit scores. Add revenue, headcount, and HQ so we can size the ideal buyer.'
      : ways === 'b'
        ? 'Pick the strategic angles that match your thesis, then describe the buyer in plain language, or use Suggest buyer profile to draft it for you.'
        : "Add a few company URLs to show the kind of buyers you're looking for. Each one fills the buyer criteria below automatically.";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <ComposerLayout
      left={
        <div className="lb-layout__main">
          {/* THREE WAYS TO SET BUYER CRITERIA */}
          <div className="lb-ways-card">
            <p className="lb-ways-card__title">Three ways to set buyer criteria</p>
            <p className="lb-ways-card__hint">
              Pick one method. The buyer profile, geography &amp; size fields plus the Find &amp;
              enrich step always show. Edit everything afterwards.
            </p>
            <div className="lb-ways-grid">
              {(['a', 'b', 'c'] as const).map((k) => {
                const meta = {
                  a: {
                    badge: 'a',
                    title: 'From the target',
                    body: "Fill Target Details and we'll suggest the buyer profile, size & location.",
                  },
                  b: {
                    badge: 'b',
                    title: 'Directly',
                    body: 'Type the buyer profile, geography, and size yourself in the fields below.',
                  },
                  c: {
                    badge: 'c',
                    title: 'From an example',
                    body: "Add a company website and we'll fill the buyer criteria from it automatically.",
                  },
                }[k];
                const active = ways === k;
                return (
                  <label
                    key={k}
                    htmlFor={`way_${k}_radio`}
                    aria-label={meta.title}
                    className={`lb-way-card${active ? ' is-active' : ''}`}
                  >
                    <input
                      type="radio"
                      id={`way_${k}_radio`}
                      name="buyer_criteria_method"
                      checked={active}
                      onChange={() => setWays(k)}
                      className="lb-way-card__radio"
                    />
                    <div className="lb-way-card__content">
                      <div className="lb-way-card__head">
                        <span className="lb-way-card__badge">{meta.badge}</span>
                        <span className="lb-way-card__label">{meta.title}</span>
                      </div>
                      <p className="lb-way-card__body">{meta.body}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* STEP 1: TARGET DETAILS — only shown on path (a) */}
          {ways === 'a' && (
            <SectionGroup
              step={targetStep}
              title="Target Details"
              description="The company being sold - used as context for buyer fit."
              id="strategic-step-target"
            >
              <SectionCard
                title="Company profile"
                hint="Describe the target company"
                icon="bi-wand2"
              >
                <textarea
                  id="targetDescriptionInput"
                  className="form-control"
                  rows={3}
                  placeholder="e.g. A mid-market provider of industrial IoT sensors for manufacturing plants…"
                  {...register('targetDescription')}
                />

                <div className="lb-divider" />

                <p
                  className="lb-section-card__title"
                  style={{ fontSize: '0.9rem', marginBottom: '0.2rem' }}
                >
                  Target size{' '}
                  <span className="lb-muted-label" style={{ fontWeight: 400 }}>
                    (for ascertaining ideal buyer size)
                  </span>
                </p>
                <p className="lb-section-card__hint" style={{ marginBottom: '0.9rem' }}>
                  Used for scoring only - not applied as a buyer filter.
                </p>

                <div className="lb-size-grid" style={{ marginBottom: '0.9rem' }}>
                  <div>
                    <label htmlFor="target_revenue_input" className="lb-field-label">
                      Annual revenue ($M)
                    </label>
                    <input
                      id="target_revenue_input"
                      type="number"
                      min={0}
                      step="any"
                      className="form-control form-control-sm"
                      placeholder="e.g. 25"
                      value={targetRevenue}
                      onChange={(e) => setTargetRevenue(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="target_employees_input" className="lb-field-label">
                      Approx. employees
                    </label>
                    <input
                      id="target_employees_input"
                      className="form-control form-control-sm"
                      placeholder="e.g. 150"
                      value={targetEmployees}
                      onChange={(e) => setTargetEmployees(e.target.value)}
                    />
                  </div>
                </div>

                <label htmlFor="target_hq_location_0" className="lb-field-label">
                  Location(s) / HQ
                </label>
                <div className="lb-location-stack">
                  {targetLocations.map((loc, idx) => (
                    <div key={idx} className="lb-location-row">
                      <input
                        id={`target_hq_location_${idx}`}
                        className="form-control form-control-sm"
                        placeholder="e.g. Austin, TX, USA"
                        value={loc}
                        onChange={(e) => {
                          const next = [...targetLocations];
                          next[idx] = e.target.value;
                          setTargetLocations(next);
                        }}
                      />
                      {targetLocations.length > 1 && (
                        <button
                          type="button"
                          className="lb-icon-btn"
                          aria-label="Remove location"
                          onClick={() =>
                            setTargetLocations(targetLocations.filter((_, i) => i !== idx))
                          }
                        >
                          <i className="bi bi-x" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm mt-2"
                  onClick={() => setTargetLocations([...targetLocations, ''])}
                >
                  <i className="bi bi-plus me-1" />
                  Add location
                </button>

                <p className="lb-fineprint mt-3">
                  The target's own size and HQ — used as context to generate better buyer segments
                  and to gauge each buyer's size fit. These are not buyer filters; set buyer Company
                  size and Geography below.
                </p>
              </SectionCard>
            </SectionGroup>
          )}

          {/* STEP 2: BUYER DETAILS — always shown */}
          <SectionGroup
            step={buyerStep}
            title="Buyer Details"
            description="Define the ideal acquirer — profile, examples, geography, and size."
            id="strategic-step-buyer"
          >
            {/* Example company websites — path (c) only */}
            {ways === 'c' && (
              <SectionCard
                title="Example company websites"
                icon="bi-link-45deg"
                hint="Add a company URL and we'll profile it into the buyer criteria — 'find me buyers like this one'. Add a few to blend them."
              >
                <div className="lb-url-input-row">
                  <input
                    className="form-control form-control-sm"
                    placeholder="https://example-acquirer.com"
                    value={exampleUrlInput}
                    disabled={profilingUrl !== null}
                    onChange={(e) => setExampleUrlInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), void handleAddExampleUrl())
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={profilingUrl !== null}
                    onClick={() => void handleAddExampleUrl()}
                  >
                    {profilingUrl !== null ? 'Profiling…' : 'Add'}
                  </button>
                </div>
                {exampleUrls.length > 0 && (
                  <ul className="lb-upload-list">
                    {exampleUrls.map((u, i) => {
                      const isProfiling = profilingUrl === u;
                      const failed = failedUrls.has(u);
                      const icon = isProfiling
                        ? 'bi-arrow-repeat'
                        : failed
                          ? 'bi-exclamation-triangle text-danger'
                          : 'bi-link-45deg text-primary';
                      return (
                        <li key={i}>
                          <span className="d-flex align-items-center gap-2 min-w-0">
                            <i className={`bi ${icon} flex-shrink-0`} />
                            <span
                              className="text-truncate"
                              style={{ fontSize: '0.8rem' }}
                              title={
                                failed
                                  ? "Couldn't profile this URL — it did not affect the criteria"
                                  : undefined
                              }
                            >
                              {u}
                              {isProfiling ? ' — profiling…' : failed ? ' — not profiled' : ''}
                            </span>
                          </span>
                          <button
                            type="button"
                            className="lb-icon-btn"
                            aria-label="Remove"
                            onClick={() => setExampleUrls(exampleUrls.filter((_, j) => j !== i))}
                          >
                            <i className="bi bi-x" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>
            )}

            {/* What are you looking for? */}
            <SectionCard
              title="What are you looking for?"
              icon="bi-target"
              hint="Describe the buyer/target profile — what kind of acquirer you're looking for."
            >
              {/* Strategic angles — shown on paths (a) and (c) */}
              {(ways === 'a' || ways === 'c') && (
                <div className="lb-angles-box">
                  <div className="lb-angles-box__head">
                    <span className="lb-field-label mb-0">Strategic angles</span>
                    <i
                      className="bi bi-info-circle text-muted ms-1"
                      title="Pick how an acquirer relates to the target."
                    />
                  </div>
                  <div className="lb-angles-pills">
                    {BUYER_MODES.map((m) => {
                      const active = buyerModes.includes(m.value);
                      return (
                        <span key={m.value} className="d-inline-flex align-items-center gap-1">
                          <button
                            type="button"
                            className={`lb-pill${active ? ' lb-pill--active' : ''}`}
                            onClick={() => toggleBuyerMode(m.value)}
                            title={m.tooltip}
                          >
                            {m.label}
                          </button>
                          <i
                            className="bi bi-info-circle text-muted"
                            style={{ fontSize: '0.75rem' }}
                            title={m.tooltip}
                          />
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Buyer description textareas */}
              <div className="lb-profile-queries">
                {businessQueries.fields.map((field, idx) => (
                  <div key={field.id} className="lb-profile-query">
                    <div className="form-group mb-0">
                      <textarea
                        aria-label={`Buyer description ${idx + 1}`}
                        className="form-control lb-profile-textarea"
                        rows={2}
                        placeholder="Describe a buyer…"
                        {...register(`businessQuery.${idx}.value`)}
                      />
                    </div>
                    {businessQueries.fields.length > 1 && (
                      <div className="lb-profile-query__actions">
                        <button
                          type="button"
                          className="lb-icon-btn"
                          aria-label="Remove"
                          onClick={() => businessQueries.remove(idx)}
                        >
                          <i className="bi bi-x" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="d-flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => businessQueries.append({ value: '' })}
                >
                  <i className="bi bi-plus me-1" />
                  Add description
                </button>
                {(ways === 'a' || ways === 'c') && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm lb-enrich-desc-btn"
                    disabled={buyerModes.length === 0}
                  >
                    <i className="bi bi-stars me-1" />
                    Suggest buyer profile
                  </button>
                )}
              </div>
            </SectionCard>

            {/* Geography */}
            <SectionCard
              title="Geography"
              icon="bi-geo-alt"
              hint="Comma-separated. Auto-suggested from the target's HQ — edit freely."
            >
              <Controller
                control={control}
                name="geography"
                render={({ field }) => (
                  <LocationSelector value={field.value} onChange={field.onChange} />
                )}
              />
            </SectionCard>

            {/* Company size */}
            <SectionCard
              title="Company size"
              icon="bi-rulers"
              hint="Auto-suggested from the target's size — edit freely."
            >
              <div
                className="lb-size-grid"
                style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '0.75rem' }}
              >
                <div>
                  <label htmlFor="min_emp_input" className="lb-field-label">
                    Min employees
                  </label>
                  <input
                    id="min_emp_input"
                    type="number"
                    className="form-control form-control-sm"
                    {...register('size.minEmployees')}
                  />
                </div>
                <div>
                  <label htmlFor="max_emp_input" className="lb-field-label">
                    Max employees
                  </label>
                  <input
                    id="max_emp_input"
                    type="number"
                    className="form-control form-control-sm"
                    {...register('size.maxEmployees')}
                  />
                </div>
                <div>
                  <label htmlFor="min_rev_input" className="lb-field-label">
                    Min revenue ($)
                  </label>
                  <input
                    id="min_rev_input"
                    type="number"
                    className="form-control form-control-sm"
                    {...register('size.minRevenue')}
                  />
                </div>
                <div>
                  <label htmlFor="max_rev_input" className="lb-field-label">
                    Max revenue ($)
                  </label>
                  <input
                    id="max_rev_input"
                    type="number"
                    className="form-control form-control-sm"
                    {...register('size.maxRevenue')}
                  />
                </div>
              </div>
              <div className="lb-size-logic mt-3">
                <span className="lb-field-label mb-0">Combine size criteria with</span>
                <select
                  aria-label="Combine size criteria logic"
                  className="form-select form-select-sm"
                  style={{ width: '6rem' }}
                  {...register('size.sizeCriteriaLogic')}
                >
                  <option value="OR">OR</option>
                  <option value="AND">AND</option>
                </select>
              </div>
            </SectionCard>

            {/* What do you want to know about each buyer? — collapsible */}
            <div className="lb-section-card">
              <button
                type="button"
                className="lb-more-toggle w-100"
                onClick={() => setInsightsOpen((o) => !o)}
                aria-expanded={insightsOpen}
              >
                <span className="d-flex align-items-center gap-3">
                  <span className="lb-section-card__icon" style={{ flexShrink: 0 }}>
                    <i className="bi bi-question-circle" />
                  </span>
                  <span>
                    <span className="lb-section-card__title" style={{ display: 'block' }}>
                      What do you want to know about each buyer?
                    </span>
                    <span className="lb-section-card__hint">
                      Optional questions answered per buyer. Click to add.
                    </span>
                  </span>
                </span>
                <i
                  className={`bi bi-chevron-down text-muted transition-transform${insightsOpen ? ' rotate-180' : ''}`}
                />
              </button>

              {insightsOpen && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(40,37,97,0.1)' }}>
                  <InsightPresetChips
                    onAdd={(qText: string) => questions.append({ value: qText })}
                  />
                  <div className="lb-profile-queries mt-2">
                    {questions.fields.map((q, idx) => (
                      <div key={q.id} className="lb-profile-query">
                        <div className="form-group mb-0">
                          <input
                            aria-label={`Custom insight question ${idx + 1}`}
                            className="form-control form-control-sm"
                            placeholder="e.g. Does this company have prior acquisition history?"
                            {...register(`customInsights.questions.${idx}.value`)}
                          />
                        </div>
                        <div className="lb-profile-query__actions">
                          <button
                            type="button"
                            className="lb-icon-btn"
                            aria-label="Remove"
                            onClick={() => questions.remove(idx)}
                          >
                            <i className="bi bi-x" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm mt-2"
                    onClick={() => questions.append({ value: '' })}
                  >
                    <i className="bi bi-plus me-1" />
                    Add question
                  </button>
                </div>
              )}
            </div>
          </SectionGroup>

          {/* STEP 3: FIND & ENRICH — always shown */}
          <SectionGroup
            step={findStep}
            title="Find & enrich"
            description="Where candidate companies come from, plus optional enrichment signals."
            id="strategic-step-find"
          >
            {/* Discovery sources */}
            <SectionCard
              title="Discovery sources"
              icon="bi-database"
              hint="Enable at least one source, or upload a company list below."
            >
              <div className="lb-source-stack">
                <Controller
                  control={control}
                  name="additionalSearch.enableApolloSearch"
                  render={({ field: f }) => (
                    <SourceToggle
                      label="Apollo"
                      description="B2B company database search."
                      enabled={f.value}
                      onToggle={f.onChange}
                      maxResults={apolloMax}
                      onMaxChange={setApolloMax}
                      disabled={gate('apollo_api_key').disabled}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="additionalSearch.enableCoresignalSearch"
                  render={({ field: f }) => (
                    <SourceToggle
                      label="Coresignal"
                      description="Firmographic & headcount data."
                      enabled={f.value}
                      onToggle={f.onChange}
                      maxResults={coresignalMax}
                      onMaxChange={setCoresignalMax}
                      disabled={gate('coresignal_api_key').disabled}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="additionalSearch.enableGmapsSearch"
                  render={({ field: f }) => (
                    <SourceToggle
                      label="Google Maps"
                      description="Local business discovery."
                      enabled={f.value}
                      onToggle={f.onChange}
                      maxResults={gmapsMax}
                      onMaxChange={setGmapsMax}
                      disabled={gate('gmaps_api_key').disabled}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="additionalSearch.enableLinkedinSearch"
                  render={({ field: f }) => (
                    <SourceToggle
                      label="LinkedIn"
                      description="Company profiles from LinkedIn."
                      enabled={f.value}
                      onToggle={f.onChange}
                      maxResults={linkedinMax}
                      onMaxChange={setLinkedinMax}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="additionalSearch.enableFindallSearch"
                  render={({ field: f }) => (
                    <SourceToggle
                      label="FindAll"
                      description="AI company discovery from Parallel.ai."
                      enabled={f.value}
                      onToggle={f.onChange}
                      maxResults={findallMax}
                      onMaxChange={setFindallMax}
                    />
                  )}
                />
              </div>
            </SectionCard>

            {/* Upload a company list */}
            <SectionCard
              title="Upload a company list (optional)"
              icon="bi-upload"
              hint=".xlsx / .csv of companies to score against the mandate."
            >
              <FileUpload files={files} onChange={onFilesChange} accept=".xlsx,.xls,.csv" />
            </SectionCard>

            {/* Enrichment */}
            <SectionCard
              title="Enrichment"
              icon="bi-stars"
              hint="Optional signals to add to each company."
            >
              <div className="lb-source-stack">
                <Controller
                  control={control}
                  name="enrichment.useNews"
                  render={({ field: f }) => (
                    <OptionToggle
                      label="Include recent news"
                      description="Surface recent news signals for each company."
                      enabled={f.value}
                      onToggle={f.onChange}
                      disabled={gate('news_api_key').disabled}
                    />
                  )}
                />
                <OptionToggle
                  label="Skip website scraping"
                  description="Faster, but less description data to validate fit."
                  enabled={skipWebsiteScraping}
                  onToggle={onSkipWebsiteScrapingChange}
                />
                <OptionToggle
                  label="Auto-enrich after generation (Apollo)"
                  description="Fetch contacts and/or firmographic data via Apollo once the list is ready."
                  enabled={enrichEnabled}
                  onToggle={setEnrichEnabled}
                  disabled={gate('apollo_api_key').disabled}
                />
              </div>
            </SectionCard>
          </SectionGroup>
        </div>
      }
      right={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* LLM PROVIDER SELECTION — preserved from ours */}
          <div className="lb-run-panel">
            <p className="lb-run-panel__title">
              <i className="bi bi-stars me-1" />
              LLM Provider
            </p>
            <Controller
              control={control}
              name="llm.useDefault"
              render={({ field: f }) => (
                <div className="form-check mt-2">
                  <input
                    id="llm_use_default_cb"
                    type="checkbox"
                    className="form-check-input"
                    checked={f.value}
                    onChange={(e) => f.onChange(e.target.checked)}
                  />
                  <label htmlFor="llm_use_default_cb" className="form-check-label small">
                    Use Default (All + Auto Failover)
                  </label>
                </div>
              )}
            />

            {!useDefaultLlm && (
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(40,37,97,0.1)' }}>
                {LLM_PROVIDERS.map((p) => {
                  const g = gate(LLM_PROVIDER_KEY[p.name]);
                  const lastLocked =
                    !g.disabled && llmProviders && isLastSelectedLlm(llmProviders, p.name);
                  return (
                    <Controller
                      key={p.name}
                      control={control}
                      name={`llm.providers.${p.name}`}
                      render={({ field: f }) => (
                        <div className="form-check mb-1">
                          <input
                            id={`llm_provider_${p.name}_cb`}
                            type="checkbox"
                            className="form-check-input"
                            checked={f.value}
                            disabled={g.disabled || !!lastLocked}
                            onChange={(e) => {
                              if (
                                !e.target.checked &&
                                llmProviders &&
                                isLastSelectedLlm(llmProviders, p.name)
                              )
                                return;
                              f.onChange(e.target.checked);
                            }}
                          />
                          <label
                            htmlFor={`llm_provider_${p.name}_cb`}
                            className="form-check-label small"
                          >
                            {p.label}
                          </label>
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
                    <div
                      className="form-check mt-1 pt-1"
                      style={{ borderTop: '1px solid rgba(40,37,97,0.08)' }}
                    >
                      <input
                        id="llm_fallback_cb"
                        type="checkbox"
                        className="form-check-input"
                        checked={f.value}
                        onChange={(e) => f.onChange(e.target.checked)}
                      />
                      <label htmlFor="llm_fallback_cb" className="form-check-label small">
                        Automatic Failover
                      </label>
                    </div>
                  )}
                />
              </div>
            )}
          </div>

          {/* RUN PANEL — our credit math: 1 credit = 10 companies */}
          <RunPanel
            summary={summaryItems}
            outputs={outputsTags}
            checklist={checklistItems}
            action={
              <>
                <button
                  type="button"
                  className="lb-run-panel__cta"
                  disabled={submitting || keysVerifying || !!llmBlock}
                  onClick={onSubmit}
                >
                  {submitting ? (
                    <>
                      <i className="bi bi-hourglass-split me-1" />
                      Starting…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-people-fill me-1" />
                      Build strategic buyer list
                    </>
                  )}
                </button>
                {llmBlock && <p className="text-danger small mt-2 mb-0 text-center">{llmBlock}</p>}
                <button
                  type="button"
                  className="btn btn-link text-muted btn-sm lb-run-panel__secondary"
                  onClick={onSaveDraft}
                >
                  Save Draft
                </button>
              </>
            }
          />

          {/* CONTEXTUAL TIP */}
          <div className="lb-tip-card">
            <p className="lb-tip-card__title">
              <i className="bi bi-lightbulb me-1" />
              TIP
            </p>
            <p className="lb-tip-card__body">{activeTip}</p>
          </div>
        </div>
      }
    />
  );
}
