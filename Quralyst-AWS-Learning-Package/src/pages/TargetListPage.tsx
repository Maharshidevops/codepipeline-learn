// TargetListPage — Replit-parity single-page Target composer (/quralyst-research).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import '@/styles/pages/quralyst-research.css';
import '@/styles/pages/research-composer.css';
import { enrichService, researchService, type EnrichMode } from '@/services/api';
import { processService, type ActiveProcessing } from '@/services/api/processService';
import { useToast } from '@/hooks/useToast';
import PresetBar from '@/components/wizard/PresetBar';
import { hydrateFromCriteria } from '@/features/research/presets/hydrateFromCriteria';
import {
  useComposerPrefill,
  applyMandatePrefill,
  useRerunMeta,
  clearRerunMeta,
} from '@/features/research/composerPrefill';
import ColumnMappingDialog from '@/components/domain/ColumnMappingDialog';
import type { TemplateCriteria, ColumnOverrides, HeaderOverrides } from '@/services/api';
import type { TargetListForm, LocationGroup } from '@/types';
import Step1Activity from '@/features/research/target/Step1Activity';
import Step2SizeGeo from '@/features/research/target/Step2SizeGeo';
import { useApiKeyStatus } from '@/features/research/useApiKeyStatus';
import { preflightSubmitBlock } from '@/features/research/apiKeyGating';
import { gmapsNeedsLocation, GMAPS_LOCATION_MESSAGE } from '@/features/research/gmapsGuard';
import DealContextBanner from '@/features/deals/DealContextBanner';
import ProgressView from '@/features/research/composer/ProgressView';
import {
  RESUME_PLACEHOLDER,
  useAdoptActiveRun,
} from '@/features/research/composer/useAdoptActiveRun';
import { SectionGroup } from '@/features/research/composer/Section';
import ListBuilderShell from '@/features/research/composer/ListBuilderShell';
import { ComposerLayout, RunPanel } from '@/features/research/composer/ComposerLayout';
import RerunModeDialog, {
  RerunBanner,
  type RerunMode,
} from '@/features/research/composer/RerunModeDialog';
import { paths } from '@/routes/paths';

const DRAFT_KEY = 'quralyst:draft:target_list';

const schema = z.object({
  businessQuery: z.array(z.object({ value: z.string() })),
  industry: z.string(),
  subIndustry: z.string(),
  primaryActivity: z.enum(['Product', 'Service', 'Both', '']),
  secondaryActivity: z.enum(['Manufacturer', 'Distributor', 'Retailer', 'Not Applicable', '']),
  primaryBusinessOnly: z.boolean(),
  skipWebsiteScraping: z.boolean(),
  excludeTerms: z.array(z.string()),
  size: z.object({
    minRevenue: z.string().optional(),
    maxRevenue: z.string().optional(),
    minEmployees: z.string().optional(),
    maxEmployees: z.string().optional(),
    sizeCriteriaLogic: z.enum(['AND', 'OR']),
  }),
  geography: z.array(
    z.object({
      continent: z.string().optional(),
      country: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
    }),
  ),
  customInsights: z.object({
    scrapingPath: z.literal('strategic'),
    questions: z.array(z.object({ value: z.string() })),
    useCompanySizeInsight: z.boolean(),
  }),
  enrichment: z.object({
    useNews: z.boolean(),
    useApollo: z.boolean(),
    apolloEnrichMode: z.enum(['none', 'contacts', 'company_data', 'all']),
    enableLinkedinEnrichment: z.boolean(),
    ownershipEnrichment: z.boolean(),
    acquisitionEnrichment: z.boolean(),
    blankFieldBackfill: z.boolean(),
    acquisitionTargetReadiness: z.boolean(),
    sellSideMandateReadiness: z.boolean(),
  }),
  llm: z.object({
    useDefault: z.boolean(),
    providers: z.object({
      openai: z.boolean(),
      anthropic: z.boolean(),
      google: z.boolean(),
    }),
    enableFallback: z.boolean(),
  }),
  additionalSearch: z.object({
    enableApolloSearch: z.boolean(),
    apolloMaxResults: z.string().optional(),
    enableGmapsSearch: z.boolean(),
    gmapsMaxResults: z.string().optional(),
    enableCoresignalSearch: z.boolean(),
    coresignalMaxResults: z.string().optional(),
    enableLinkedinSearch: z.boolean(),
    linkedinMaxResults: z.string().optional(),
    enableFindallSearch: z.boolean(),
    findallMaxResults: z.string().optional(),
  }),
});

const DEFAULTS: TargetListForm = {
  businessQuery: [{ value: '' }],
  industry: '',
  subIndustry: '',
  primaryActivity: '',
  secondaryActivity: '',
  primaryBusinessOnly: false,
  skipWebsiteScraping: false,
  excludeTerms: [],
  size: {
    minRevenue: '',
    maxRevenue: '',
    minEmployees: '',
    maxEmployees: '',
    sizeCriteriaLogic: 'AND',
  },
  geography: [{ continent: '', country: '', state: '', city: '' }],
  customInsights: { scrapingPath: 'strategic', questions: [], useCompanySizeInsight: false },
  enrichment: {
    useNews: false,
    useApollo: false,
    apolloEnrichMode: 'none',
    enableLinkedinEnrichment: false,
    ownershipEnrichment: false,
    acquisitionEnrichment: false,
    blankFieldBackfill: false,
    acquisitionTargetReadiness: false,
    sellSideMandateReadiness: false,
  },
  llm: {
    useDefault: true,
    providers: { openai: true, anthropic: true, google: true },
    enableFallback: true,
  },
  additionalSearch: {
    enableApolloSearch: true,
    apolloMaxResults: '50',
    enableGmapsSearch: false,
    gmapsMaxResults: '50',
    enableCoresignalSearch: false,
    coresignalMaxResults: '50',
    enableLinkedinSearch: false,
    linkedinMaxResults: '50',
    enableFindallSearch: false,
    findallMaxResults: '50',
  },
};

function loadDraft(): TargetListForm {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<TargetListForm>;
    return {
      ...DEFAULTS,
      ...parsed,
      excludeTerms: parsed.excludeTerms ?? DEFAULTS.excludeTerms,
      size: { ...DEFAULTS.size, ...parsed.size },
      customInsights: { ...DEFAULTS.customInsights, ...parsed.customInsights },
      enrichment: { ...DEFAULTS.enrichment, ...parsed.enrichment },
      llm: {
        ...DEFAULTS.llm,
        ...parsed.llm,
        providers: { ...DEFAULTS.llm.providers, ...parsed.llm?.providers },
      },
      additionalSearch: { ...DEFAULTS.additionalSearch, ...parsed.additionalSearch },
      businessQuery:
        parsed.businessQuery && parsed.businessQuery.length
          ? parsed.businessQuery
          : DEFAULTS.businessQuery,
      geography:
        parsed.geography && parsed.geography.length ? parsed.geography : DEFAULTS.geography,
    };
  } catch {
    return DEFAULTS;
  }
}

export default function TargetListPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dealId, setDealId] = useState(searchParams.get('deal') ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [prefilledFromBrief, setPrefilledFromBrief] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [runProgress, setRunProgress] = useState<ActiveProcessing | null>(null);
  const [rerunDialogOpen, setRerunDialogOpen] = useState(false);
  const [pendingRerunMode, setPendingRerunMode] = useState<RerunMode | null>(null);
  const enrichmentStartedRef = useRef(false);
  // Redis can lag behind submit; the first poll often returns {active:false}.
  // Only treat "inactive" as finished after we've observed this processId running.
  const seenRunningRef = useRef(false);
  const {
    adopted: reconnected,
    clearAdopted,
    checking: resumeChecking,
  } = useAdoptActiveRun('target', setRunProgress);
  const rerunMeta = useRerunMeta();
  const { isVerifying: keysVerifying, testResults } = useApiKeyStatus();
  const llmBlock = preflightSubmitBlock(testResults, keysVerifying);

  const { control, setValue, getValues } = useForm<TargetListForm>({
    resolver: zodResolver(schema) as Resolver<TargetListForm>,
    defaultValues: useMemo(loadDraft, []),
    mode: 'onChange',
  });

  const watched = useWatch({ control });
  const dealLocked = !!searchParams.get('deal');

  const runSummary = useMemo(() => {
    const v = (watched ?? getValues()) as TargetListForm;
    const queries = (v.businessQuery ?? []).map((q) => (q.value || '').trim()).filter(Boolean);
    const hasQuery = queries.length > 0;
    const a = v.additionalSearch ?? DEFAULTS.additionalSearch;
    const enabledSources = [
      a.enableApolloSearch && 'Apollo',
      a.enableCoresignalSearch && 'Coresignal',
      a.enableGmapsSearch && 'Google Maps',
      a.enableLinkedinSearch && 'LinkedIn',
      a.enableFindallSearch && 'FindAll',
    ].filter(Boolean) as string[];
    const geoCount = (v.geography ?? []).filter(
      (g) => g.continent || g.country || g.state || g.city,
    ).length;
    const size = v.size ?? DEFAULTS.size;
    const sizeParts = [
      (size.minEmployees || size.maxEmployees) && 'headcount',
      (size.minRevenue || size.maxRevenue) && 'revenue',
    ].filter(Boolean) as string[];
    const insightCount = (v.customInsights?.questions ?? []).filter((q) =>
      (q.value || '').trim(),
    ).length;
    const hasInput = enabledSources.length > 0 || files.length > 0 || !!rerunMeta;
    const hasGeoOrSize = geoCount > 0 || sizeParts.length > 0;

    return {
      canSubmit: hasQuery && hasInput && !submitting && !keysVerifying && !llmBlock,
      summary: [
        { label: 'Profiles', value: hasQuery ? String(queries.length) : '' },
        {
          label: 'Industry',
          value: [v.industry, v.subIndustry].filter(Boolean).join(' · '),
        },
        {
          label: 'Geography',
          value: geoCount ? `${geoCount} filter${geoCount > 1 ? 's' : ''}` : '',
        },
        { label: 'Size', value: sizeParts.join(' + ') },
        { label: 'Sources', value: enabledSources.join(', ') },
        {
          label: 'Uploads',
          value: files.length ? `${files.length} file${files.length > 1 ? 's' : ''}` : '',
        },
        {
          label: 'Insights',
          value: insightCount ? `${insightCount} question${insightCount > 1 ? 's' : ''}` : '',
        },
      ],
      checklist: [
        { label: 'Target profile described', done: hasQuery },
        { label: 'At least one data source enabled', done: hasInput },
        { label: 'Geography or size filter set', done: hasGeoOrSize, nudge: true },
      ],
      outputs: [
        'Company',
        'Fit score',
        'Location',
        'Employees',
        'Revenue',
        'Website',
        'LinkedIn',
        ...(insightCount ? ['Custom insights'] : []),
      ],
    };
  }, [watched, getValues, files.length, rerunMeta, submitting, keysVerifying, llmBlock]);

  useComposerPrefill((prefill) => {
    const n = applyMandatePrefill(
      prefill,
      getValues as unknown as () => Record<string, unknown>,
      setValue as unknown as (n: string, v: unknown, o?: { shouldDirty?: boolean }) => void,
    );
    if (n) {
      if (dealId) setPrefilledFromBrief(true);
      success('Prefilled from your mandate — review the criteria before running.');
    }
  });

  // Poll active-processing while a run is in flight on this page.
  useEffect(() => {
    if (!runProgress?.active || runProgress.completed) return;
    const expectedProcessId = runProgress.processId;
    const id = window.setInterval(() => {
      void processService.getActiveProcessing().then((active) => {
        const startRequestedEnrichment = (resultId?: string | null) => {
          const mode = getValues('enrichment.apolloEnrichMode');
          if (!resultId || !mode || mode === 'none' || enrichmentStartedRef.current) {
            return;
          }
          enrichmentStartedRef.current = true;
          const attempt = (triesLeft: number) => {
            void enrichService
              .start({ resultId, mode: mode as EnrichMode, listType: 'target' })
              .then(() => success('Apollo enrichment started in the background.'))
              .catch((err: unknown) => {
                const status =
                  err && typeof err === 'object' && 'status' in err
                    ? Number((err as { status?: number }).status)
                    : 0;
                // Result rows can lag a beat behind the completed progress flag.
                if (status === 404 && triesLeft > 0) {
                  window.setTimeout(() => attempt(triesLeft - 1), 2000);
                  return;
                }
                enrichmentStartedRef.current = false;
                error('The list was built, but Apollo enrichment could not be started.');
              });
          };
          attempt(3);
        };

        if (!active.active) {
          // Startup race: job not in Redis yet. Keep waiting until we've seen it run.
          if (!seenRunningRef.current) return;
          startRequestedEnrichment(active.resultId || active.processId || expectedProcessId);
          setRunProgress((prev) =>
            prev
              ? {
                  ...prev,
                  completed: true,
                  overallPercentage: 100,
                  status: 'completed',
                  currentStage: 'completed',
                }
              : prev,
          );
          return;
        }

        // Ignore another user's/mode job bleeding through while ours is still starting.
        if (
          expectedProcessId &&
          active.processId &&
          active.processId !== expectedProcessId &&
          !seenRunningRef.current
        ) {
          return;
        }

        seenRunningRef.current = true;
        setRunProgress(active);
        const depleted =
          active.depletionPaused || (active.status || '').toLowerCase() === 'depletion_paused';
        if (depleted) {
          setRunProgress({ ...active, completed: true, status: 'depletion_paused' });
          return;
        }
        if (active.completed || (active.overallPercentage ?? 0) >= 100) {
          startRequestedEnrichment(active.resultId || active.processId || expectedProcessId);
          setRunProgress({ ...active, completed: true });
        }
      });
    }, 2500);
    return () => window.clearInterval(id);
  }, [
    runProgress?.active,
    runProgress?.completed,
    runProgress?.processId,
    getValues,
    success,
    error,
  ]);

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
    success('Draft saved');
  };

  const buildFormData = (v: TargetListForm, rerunMode?: RerunMode | null): FormData => {
    const fd = new FormData();
    v.businessQuery.forEach((q) => fd.append('business_query[]', q.value));
    fd.append('industry', v.industry);
    fd.append('sub_industry', v.subIndustry);
    fd.append('primary_activity', v.primaryActivity);
    fd.append('secondary_activity', v.secondaryActivity);
    if (v.primaryBusinessOnly) fd.append('primary_business_only', 'true');
    else fd.append('primary_business_only', 'false');
    if (v.skipWebsiteScraping) fd.append('skip_website_scraping', 'true');
    else fd.append('skip_website_scraping', 'false');
    (v.excludeTerms ?? []).forEach((t) => {
      if (t.trim()) fd.append('exclude_term[]', t.trim());
    });

    fd.append('min_revenue', v.size.minRevenue ?? '');
    fd.append('max_revenue', v.size.maxRevenue ?? '');
    fd.append('min_employees', v.size.minEmployees ?? '');
    fd.append('max_employees', v.size.maxEmployees ?? '');
    fd.append('size_criteria_logic', v.size.sizeCriteriaLogic);

    v.geography.forEach((g: LocationGroup) => {
      fd.append('continent[]', g.continent ?? '');
      fd.append('country[]', g.country ?? '');
      fd.append('state[]', g.state ?? '');
      fd.append('city[]', g.city ?? '');
    });

    files.forEach((file) => fd.append('files', file));
    if (dealId) fd.append('deal_id', dealId);

    if (v.enrichment.useNews) fd.append('use_news', 'true');
    // Replit couples Apollo discovery to the in-run Apollo contact pass.
    if (v.additionalSearch.enableApolloSearch) fd.append('use_apollo', 'true');
    // LinkedIn enrichment is not part of Replit TargetMode — leave off.
    // Ownership has no TargetMode toggle, but Replit defaults ownership enrichment ON.
    fd.append('ownership_enrichment', 'true');
    if (v.enrichment.blankFieldBackfill) fd.append('blank_field_backfill', 'true');
    if (v.enrichment.acquisitionTargetReadiness) fd.append('acquisition_target_readiness', 'true');
    if (v.enrichment.sellSideMandateReadiness) fd.append('sell_side_mandate_readiness', 'true');

    if (!v.llm.useDefault) {
      (['openai', 'anthropic', 'google'] as const).forEach((p) => {
        if (v.llm.providers[p]) fd.append('llm_providers[]', p);
      });
      if (v.llm.enableFallback) fd.append('llm_fallback_enabled', 'true');
    }

    const a = v.additionalSearch;
    if (a.enableApolloSearch) {
      fd.append('enable_apollo_search', 'true');
      fd.append('apollo_max_results', a.apolloMaxResults ?? '');
    }
    if (a.enableGmapsSearch) {
      fd.append('enable_gmaps_search', 'true');
      fd.append('gmaps_max_results', a.gmapsMaxResults ?? '');
    }
    if (a.enableCoresignalSearch) {
      fd.append('enable_coresignal_search', 'true');
      fd.append('coresignal_max_results', a.coresignalMaxResults ?? '');
    }
    if (a.enableLinkedinSearch) {
      fd.append('enable_linkedin_search', 'true');
      fd.append('linkedin_max_results', a.linkedinMaxResults ?? '');
    }
    if (a.enableFindallSearch) {
      fd.append('enable_findall_search', 'true');
      fd.append('findall_max_results', a.findallMaxResults ?? '');
    }

    if (v.customInsights.useCompanySizeInsight) fd.append('use_company_size_insight', 'true');
    const questions = v.customInsights.questions.map((q) => q.value).filter((q) => q.trim());
    fd.append(
      'custom_insights_questions',
      JSON.stringify({ questions, pathType: v.customInsights.scrapingPath }),
    );

    const mode = rerunMode ?? pendingRerunMode;
    if (rerunMeta?.sourceProcessId) {
      fd.append('rerun_source_process_id', rerunMeta.sourceProcessId);
      fd.append('rerun_mode', mode ?? 'fresh');
    }

    return fd;
  };

  const doSubmit = async (
    columnOverrides: ColumnOverrides = {},
    headerOverrides: HeaderOverrides = {},
    rerunMode?: RerunMode | null,
  ) => {
    setSubmitting(true);
    try {
      const v = getValues();
      const fd = buildFormData(v, rerunMode);
      if (Object.keys(columnOverrides).length) {
        fd.append('column_overrides', JSON.stringify(columnOverrides));
      }
      if (Object.keys(headerOverrides).length) {
        fd.append('header_overrides', JSON.stringify(headerOverrides));
      }
      const res = await researchService.submitTargetList(fd);
      enrichmentStartedRef.current = false;
      seenRunningRef.current = false;
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      clearRerunMeta();
      setPendingRerunMode(null);
      setRunProgress({
        active: true,
        completed: false,
        processId: res.process_id,
        overallPercentage: 0,
        processType: 'target_list',
        status: 'processing',
        currentStage: 'initializing',
        startedAt: Date.now() / 1000,
        stagePlan: [],
      });
    } catch {
      error('Failed to start target list generation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    // GMaps needs a state or city — block a country-only run that would error server-side with no results.
    const gv = getValues();
    if (gmapsNeedsLocation(gv.additionalSearch.enableGmapsSearch, gv.geography)) {
      error(GMAPS_LOCATION_MESSAGE);
      return;
    }
    if (llmBlock) {
      error(llmBlock);
      return;
    }
    if (rerunMeta?.sourceProcessId && !pendingRerunMode) {
      setRerunDialogOpen(true);
      return;
    }
    if (files.length > 0) {
      setMappingOpen(true);
      return;
    }
    await doSubmit();
  };

  const handleRerunChoice = (mode: RerunMode) => {
    setPendingRerunMode(mode);
    setRerunDialogOpen(false);
    if (files.length > 0) {
      setMappingOpen(true);
      return;
    }
    void doSubmit({}, {}, mode);
  };

  if (runProgress?.active || resumeChecking) {
    return (
      <div className="rc-page rc-page--progress">
        <ProgressView
          progress={runProgress ?? RESUME_PLACEHOLDER}
          processType="target_list"
          runningTitle="Building your target list"
          reconnected={reconnected}
          onBack={() => {
            clearAdopted();
            setRunProgress(null);
          }}
          onViewResult={(id) => navigate(`/quralyst-research/result/${id}/data`)}
        />
      </div>
    );
  }

  return (
    <ListBuilderShell
      mode="target"
      dealId={dealId}
      onDealChange={setDealId}
      dealLocked={dealLocked}
      onDetachDeal={() => {
        setDealId('');
        navigate(paths.targetList);
      }}
    >
      {dealId && <DealContextBanner dealId={dealId} fromBrief={prefilledFromBrief} />}

      <ComposerLayout
        left={
          <>
            {rerunMeta && <RerunBanner version={rerunMeta.version} title={rerunMeta.title} />}

            <PresetBar
              mode="target"
              getCurrentCriteria={() => getValues() as unknown as TemplateCriteria}
              onLoad={(criteria) => {
                const { dropped } = hydrateFromCriteria(
                  criteria,
                  () => getValues() as unknown as Record<string, unknown>,
                  setValue as unknown as (n: string, v: unknown) => void,
                );
                success(
                  dropped.length
                    ? `Preset loaded (${dropped.length} old field(s) skipped).`
                    : 'Preset loaded.',
                );
              }}
            />

            <SectionGroup
              step={1}
              title="Target profile"
              description="Describe what you're looking for, what to leave out, and what to learn about each company."
            >
              <Step1Activity control={control} setValue={setValue} getValues={getValues} />
            </SectionGroup>

            <Step2SizeGeo
              control={control}
              setValue={setValue}
              files={files}
              onFilesChange={setFiles}
            />
          </>
        }
        right={
          <RunPanel
            summary={runSummary.summary}
            outputs={runSummary.outputs}
            checklist={runSummary.checklist}
            action={
              <>
                <button
                  type="button"
                  className="lb-run-panel__cta"
                  disabled={!runSummary.canSubmit}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" /> Starting…
                    </>
                  ) : keysVerifying ? (
                    'Verifying API keys…'
                  ) : (
                    <>
                      <i className="bi bi-play-fill" aria-hidden /> Build target list
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm lb-run-panel__secondary"
                  onClick={saveDraft}
                >
                  Save draft
                </button>
                {llmBlock && <p className="text-danger small mt-2 mb-0">{llmBlock}</p>}
              </>
            }
          />
        }
      />

      <RerunModeDialog
        open={rerunDialogOpen}
        onClose={() => setRerunDialogOpen(false)}
        onChoose={handleRerunChoice}
        busy={submitting}
      />

      {mappingOpen && files.length > 0 && (
        <ColumnMappingDialog
          files={files}
          onCancel={() => setMappingOpen(false)}
          onConfirm={({ columnOverrides, headerOverrides }) => {
            setMappingOpen(false);
            void doSubmit(columnOverrides, headerOverrides, pendingRerunMode);
          }}
        />
      )}
    </ListBuilderShell>
  );
}
