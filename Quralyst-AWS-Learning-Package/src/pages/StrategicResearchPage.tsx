// StrategicResearchPage — Strategic / Buyer List 3-step research wizard.
// Port of Backup/templates/strategic_research/strategic_research.html into the React wizard shell.
//
//  Step 1  Company Attributes        — selling-company attributes + Ideal Buyer Recommendation card
//  Step 2  Size, Geography & Data    — size/geo/files/custom-insights/enrichment/additional-search
//  Step 3  Review & Submit           — ReviewSummary → "Generate List →"
//
// State is React Hook Form (StrategicForm) + Zod. Save Draft persists to localStorage
// (quralyst:draft:strategic) and is restored as defaultValues on mount. A successful submit
// clears the draft so the next visit starts fresh. Submit builds legacy snake_case FormData
// (+ custom_insights_questions JSON), calls researchService.submitStrategic, then
// startProgress({ processType:'strategic_buyer_list' }) — the app-wide ProgressModal opens.
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { paths } from '@/routes/paths';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { researchService } from '@/services/api';
import { processService, type ActiveProcessing } from '@/services/api/processService';
import { useToast } from '@/hooks/useToast';
import PresetBar from '@/components/wizard/PresetBar';
import { hydrateFromCriteria } from '@/features/research/presets/hydrateFromCriteria';
import ColumnMappingDialog from '@/components/domain/ColumnMappingDialog';
import type { TemplateCriteria, ColumnOverrides, HeaderOverrides } from '@/services/api';
import type { StrategicForm } from '@/types';
import {
  strategicSchema,
  loadDraft,
  saveDraft,
  clearDraft,
} from '@/features/research/strategic/schema';
import { useApiKeyStatus } from '@/features/research/useApiKeyStatus';
import { preflightSubmitBlock } from '@/features/research/apiKeyGating';
import { gmapsNeedsLocation, GMAPS_LOCATION_MESSAGE } from '@/features/research/gmapsGuard';
import {
  useComposerPrefill,
  applyMandatePrefill,
  useRerunMeta,
  clearRerunMeta,
} from '@/features/research/composerPrefill';
import DealContextBanner from '@/features/deals/DealContextBanner';
import ProgressView from '@/features/research/composer/ProgressView';
import {
  RESUME_PLACEHOLDER,
  useAdoptActiveRun,
} from '@/features/research/composer/useAdoptActiveRun';
import ListBuilderShell from '@/features/research/composer/ListBuilderShell';
import RerunModeDialog, {
  RerunBanner,
  type RerunMode,
} from '@/features/research/composer/RerunModeDialog';
import '@/styles/pages/strategic-research.css';
import '@/styles/pages/research-composer.css';
import { useEffect, useMemo, useRef, useState } from 'react';

/** Append a value to FormData only when it is non-empty (keeps the payload close to the legacy form). */
function appendIf(fd: FormData, name: string, value: string | undefined): void {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    fd.append(name, String(value));
  }
}

import StrategicModeComposer from '@/features/research/composer/StrategicModeComposer';

export default function StrategicResearchPage() {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dealId, setDealId] = useState(searchParams.get('deal') ?? '');
  const [prefilledFromBrief, setPrefilledFromBrief] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [customInsightsOpen, setCustomInsightsOpen] = useState(false);
  const [skipWebsiteScraping, setSkipWebsiteScraping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [runProgress, setRunProgress] = useState<ActiveProcessing | null>(null);
  const [rerunDialogOpen, setRerunDialogOpen] = useState(false);
  const [pendingRerunMode, setPendingRerunMode] = useState<RerunMode | null>(null);
  // Redis can lag behind submit; don't treat {active:false} as done until we've seen this job run.
  const seenRunningRef = useRef(false);
  const {
    adopted: reconnected,
    clearAdopted,
    checking: resumeChecking,
  } = useAdoptActiveRun('strategic', setRunProgress);
  const rerunMeta = useRerunMeta();
  const { isVerifying: keysVerifying, testResults } = useApiKeyStatus();
  const llmBlock = preflightSubmitBlock(testResults, keysVerifying);

  const form = useForm<StrategicForm>({
    resolver: zodResolver(strategicSchema),
    defaultValues: useMemo(() => loadDraft(), []),
    mode: 'onChange',
  });

  useComposerPrefill((prefill) => {
    const n = applyMandatePrefill(
      prefill,
      form.getValues as unknown as () => Record<string, unknown>,
      form.setValue as unknown as (n: string, v: unknown, o?: { shouldDirty?: boolean }) => void,
    );
    if (n) {
      if (dealId) setPrefilledFromBrief(true);
      success('Prefilled from your mandate — review the criteria before running.');
    }
  });

  // Adaptive progress polling — polls every 1.5s while active, backs off cleanly
  useEffect(() => {
    if (!runProgress?.active || runProgress.completed) return;
    const expectedProcessId = runProgress.processId;
    const id = window.setInterval(() => {
      void processService.getActiveProcessing().then((active) => {
        if (!active.active) {
          if (!seenRunningRef.current) return;
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
          setRunProgress({ ...active, completed: true });
        }
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, [runProgress?.active, runProgress?.completed, runProgress?.processId]);

  const handleSaveDraft = () => {
    saveDraft(form.getValues());
    success('Draft saved');
  };

  const buildFormData = (values: StrategicForm, rerunMode?: RerunMode | null): FormData => {
    const fd = new FormData();

    // Step 1 — selling-company attributes (legacy snake_case names).
    values.businessQuery.forEach((q) => {
      if (q.value.trim()) fd.append('business_query[]', q.value.trim());
    });
    appendIf(fd, 'industry', values.industry);
    appendIf(fd, 'sub_industry', values.subIndustry);
    appendIf(fd, 'primary_activity', values.primaryActivity);
    appendIf(fd, 'secondary_activity', values.secondaryActivity);
    appendIf(fd, 'target_description', values.targetDescription);
    if (values.buyerHorizontal) fd.append('buyer_horizontal', 'true');
    if (values.buyerVertical) fd.append('buyer_vertical', 'true');
    if (values.buyerAdjacent) fd.append('buyer_adjacent', 'true');
    if (values.useRecommendedBuyer) fd.append('use_recommended_buyer', 'true');
    if (values.buyerHorizontal) fd.append('ideal_buyer_type[]', 'Horizontal');
    if (values.buyerVertical) fd.append('ideal_buyer_type[]', 'Vertical');
    if (values.buyerAdjacent) fd.append('ideal_buyer_type[]', 'Adjacent');
    if (skipWebsiteScraping) fd.append('skip_website_scraping', 'true');
    (values.excludeTerms ?? []).forEach((t) => {
      if (t.trim()) fd.append('exclude_term[]', t.trim());
    });

    // Step 2 — size criteria.
    appendIf(fd, 'min_revenue', values.size.minRevenue);
    appendIf(fd, 'max_revenue', values.size.maxRevenue);
    appendIf(fd, 'min_employees', values.size.minEmployees);
    appendIf(fd, 'max_employees', values.size.maxEmployees);
    fd.append('size_criteria_logic', values.size.sizeCriteriaLogic);

    // Geography (legacy parallel arrays).
    values.geography.forEach((g) => {
      fd.append('continent[]', g.continent ?? '');
      fd.append('country[]', g.country ?? '');
      fd.append('state[]', g.state ?? '');
      fd.append('city[]', g.city ?? '');
    });

    // Files.
    files.forEach((f) => fd.append('files', f));

    // F19: link the resulting list to this deal (backend links after process-id allocation).
    if (dealId) fd.append('deal_id', dealId);

    // Enrichment toggles.
    if (values.enrichment.useNews) fd.append('use_news', 'true');
    if (values.enrichment.useApollo) fd.append('use_apollo', 'true');
    if (values.enrichment.enableLinkedinEnrichment) fd.append('enable_linkedin_enrichment', 'true');
    if (values.enrichment.ownershipEnrichment) fd.append('ownership_enrichment', 'true');
    if (values.enrichment.acquisitionEnrichment) fd.append('acquisition_enrichment', 'true');
    if (values.enrichment.blankFieldBackfill) fd.append('blank_field_backfill', 'true');

    // LLM model selection: default = send nothing (backend uses all providers + auto-failover).
    if (!values.llm.useDefault) {
      (['openai', 'anthropic', 'google'] as const).forEach((p) => {
        if (values.llm.providers[p]) fd.append('llm_providers[]', p);
      });
      if (values.llm.enableFallback) fd.append('llm_fallback_enabled', 'true');
    }

    // Additional company search toggles + counts.
    const a = values.additionalSearch;
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

    // Custom insights questions.
    const questions: string[] = [];
    if (values.customInsights.useCompanySizeInsight) {
      fd.append('use_company_size_insight', 'true');
      questions.push('Alternate company size insights');
    }
    values.customInsights.questions.forEach((q) => {
      const v = q.value.trim();
      if (v && v !== 'Alternate company size insights') questions.push(v);
    });
    if (questions.length) {
      fd.append('custom_insights_questions', JSON.stringify({ questions, pathType: 'strategic' }));
    }

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
      const values = form.getValues();
      const fd = buildFormData(values, rerunMode);
      if (Object.keys(columnOverrides).length) {
        fd.append('column_overrides', JSON.stringify(columnOverrides));
      }
      if (Object.keys(headerOverrides).length) {
        fd.append('header_overrides', JSON.stringify(headerOverrides));
      }
      const res = await researchService.submitStrategic(fd);
      clearDraft();
      clearRerunMeta();
      setPendingRerunMode(null);
      seenRunningRef.current = false;
      setRunProgress({
        active: true,
        completed: false,
        processId: res.process_id,
        overallPercentage: 0,
        processType: 'strategic_buyer_list',
        status: 'processing',
        currentStage: 'initializing',
        startedAt: Date.now() / 1000,
        stagePlan: [],
      });
    } catch {
      toastError('Failed to start processing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    // GMaps needs a state or city — block a country-only run that would error server-side with no results.
    const gv = form.getValues();
    if (gmapsNeedsLocation(gv.additionalSearch.enableGmapsSearch, gv.geography)) {
      toastError(GMAPS_LOCATION_MESSAGE);
      return;
    }
    if (llmBlock) {
      toastError(llmBlock);
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
          processType="strategic_buyer_list"
          runningTitle="Building your buyer list"
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
      mode="strategic"
      dealId={dealId}
      onDealChange={setDealId}
      dealLocked={!!searchParams.get('deal')}
      onDetachDeal={() => {
        setDealId('');
        navigate(paths.strategic);
      }}
    >
      {dealId && <DealContextBanner dealId={dealId} fromBrief={prefilledFromBrief} />}

      <p className="small text-muted mb-3">
        <Link to={paths.bdScoring}>Open BD Scoring</Link>
        {' — '}live template scoring drawer for companies on your list.
      </p>

      {rerunMeta && <RerunBanner version={rerunMeta.version} title={rerunMeta.title} />}

      <PresetBar
        mode="strategic"
        getCurrentCriteria={() => form.getValues() as unknown as TemplateCriteria}
        onLoad={(criteria) => {
          const { dropped } = hydrateFromCriteria(
            criteria,
            () => form.getValues() as unknown as Record<string, unknown>,
            form.setValue as unknown as (n: string, v: unknown) => void,
          );
          success(
            dropped.length
              ? `Preset loaded (${dropped.length} old field(s) skipped).`
              : 'Preset loaded.',
          );
        }}
      />

      <StrategicModeComposer
        form={form}
        files={files}
        onFilesChange={setFiles}
        customInsightsOpen={customInsightsOpen}
        onToggleCustomInsights={() => setCustomInsightsOpen((o) => !o)}
        skipWebsiteScraping={skipWebsiteScraping}
        onSkipWebsiteScrapingChange={setSkipWebsiteScraping}
        submitting={submitting}
        keysVerifying={keysVerifying}
        llmBlock={llmBlock}
        onSubmit={() => void handleSubmit()}
        onSaveDraft={handleSaveDraft}
        dealId={dealId}
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
