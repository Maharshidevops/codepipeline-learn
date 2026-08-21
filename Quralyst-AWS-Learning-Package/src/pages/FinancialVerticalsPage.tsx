// FinancialVerticalsPage — Replit-parity single-page Financial List composer.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import '@/styles/pages/financial-verticals.css';
import '@/styles/pages/research-composer.css';
import { researchService } from '@/services/api';
import { processService, type ActiveProcessing } from '@/services/api/processService';
import { useToast } from '@/hooks/useToast';
import PresetBar from '@/components/wizard/PresetBar';
import { hydrateFromCriteria } from '@/features/research/presets/hydrateFromCriteria';
import { useComposerPrefill, applyMandatePrefill } from '@/features/research/composerPrefill';
import type { TemplateCriteria } from '@/services/api';
import type { FinancialVerticalsForm } from '@/types';
import ProgressView from '@/features/research/composer/ProgressView';
import {
  RESUME_PLACEHOLDER,
  useAdoptActiveRun,
} from '@/features/research/composer/useAdoptActiveRun';
import ListBuilderShell from '@/features/research/composer/ListBuilderShell';
import FinancialModeComposer from '@/features/research/composer/FinancialModeComposer';
import { paths } from '@/routes/paths';

const DRAFT_KEY = 'quralyst:draft:financial_verticals';

const schema = z.object({
  targetDescription: z.string(),
  businessType: z.string(),
  continent: z.string(),
  country: z.string(),
  state: z.string(),
  industry: z.string(),
  subIndustry: z.string(),
  useCustomIndustry: z.boolean(),
  industryCustom: z.string(),
  subIndustryCustom: z.string(),
  revenueMin: z.string().optional(),
  revenueMax: z.string().optional(),
  ebitdaMin: z.string().optional(),
  ebitdaMax: z.string().optional(),
  equityCheckMin: z.string().optional(),
  equityCheckMax: z.string().optional(),
  enterpriseValueMin: z.string().optional(),
  enterpriseValueMax: z.string().optional(),
  platformEbitdaFloor: z.string().optional(),
  platformRevenueFloor: z.string().optional(),
  currentPortfolio: z.boolean(),
  pastPortfolio: z.boolean(),
  listedInterest: z.boolean(),
  requestPeContact: z.boolean(),
  autoEnrich: z.boolean(),
});

const DEFAULTS: FinancialVerticalsForm = {
  targetDescription: '',
  businessType: '',
  continent: '',
  country: '',
  state: '',
  industry: '',
  subIndustry: '',
  useCustomIndustry: false,
  industryCustom: '',
  subIndustryCustom: '',
  revenueMin: '',
  revenueMax: '',
  ebitdaMin: '',
  ebitdaMax: '',
  equityCheckMin: '',
  equityCheckMax: '',
  enterpriseValueMin: '',
  enterpriseValueMax: '',
  platformEbitdaFloor: '',
  platformRevenueFloor: '',
  currentPortfolio: true,
  pastPortfolio: false,
  listedInterest: false,
  requestPeContact: false,
  autoEnrich: false,
};

function loadDraft(): FinancialVerticalsForm {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<FinancialVerticalsForm>) };
  } catch {
    return DEFAULTS;
  }
}

export default function FinancialVerticalsPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dealId, setDealId] = useState(searchParams.get('deal') ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [peError, setPeError] = useState(false);
  const [runProgress, setRunProgress] = useState<ActiveProcessing | null>(null);
  // Redis can lag behind submit; don't treat {active:false} as done until we've seen this job run.
  const seenRunningRef = useRef(false);
  const {
    adopted: reconnected,
    clearAdopted,
    checking: resumeChecking,
  } = useAdoptActiveRun('financial', setRunProgress);

  const form = useForm<FinancialVerticalsForm>({
    resolver: zodResolver(schema) as Resolver<FinancialVerticalsForm>,
    defaultValues: useMemo(loadDraft, []),
    mode: 'onChange',
  });

  const { getValues, setValue } = form;

  useComposerPrefill((prefill) => {
    const n = applyMandatePrefill(
      prefill,
      getValues as unknown as () => Record<string, unknown>,
      setValue as unknown as (n: string, v: unknown, o?: { shouldDirty?: boolean }) => void,
    );
    if (n) success('Prefilled from your mandate — review the criteria before running.');
  });

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
    }, 2500);
    return () => window.clearInterval(id);
  }, [runProgress?.active, runProgress?.completed, runProgress?.processId]);

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
    success('Draft saved');
  };

  const buildFormData = (v: FinancialVerticalsForm): FormData => {
    const fd = new FormData();
    fd.append('target_description', v.targetDescription);
    fd.append('business_type', v.businessType);
    fd.append('continent', v.continent);
    fd.append('country', v.country);
    fd.append('state', v.state);
    fd.append('industry', v.industry);
    fd.append('sub_industry', v.subIndustry);

    fd.append('revenue_min', v.revenueMin ?? '');
    fd.append('revenue_max', v.revenueMax ?? '');
    fd.append('ebitda_min', v.ebitdaMin ?? '');
    fd.append('ebitda_max', v.ebitdaMax ?? '');
    fd.append('equity_check_min', v.equityCheckMin ?? '');
    fd.append('equity_check_max', v.equityCheckMax ?? '');
    fd.append('enterprise_value_min', v.enterpriseValueMin ?? '');
    fd.append('enterprise_value_max', v.enterpriseValueMax ?? '');

    if (v.platformEbitdaFloor?.trim()) fd.append('platform_ebitda_floor', v.platformEbitdaFloor);
    if (v.platformRevenueFloor?.trim()) fd.append('platform_revenue_floor', v.platformRevenueFloor);

    if (v.currentPortfolio) fd.append('current_portfolio', 'yes');
    if (v.pastPortfolio) fd.append('past_portfolio', 'yes');
    if (v.listedInterest) fd.append('listed_interest', 'yes');
    if (v.requestPeContact) fd.append('request_contact', 'yes');
    if (v.autoEnrich) fd.append('auto_enrich', 'true');

    if (dealId) fd.append('deal_id', dealId);

    return fd;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const v = getValues();
    if (!(v.currentPortfolio || v.pastPortfolio || v.listedInterest)) {
      setPeError(true);
      return;
    }
    setPeError(false);
    setSubmitting(true);
    try {
      const fd = buildFormData(v);
      const res = await researchService.submitFinancialVerticals(fd);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      seenRunningRef.current = false;
      setRunProgress({
        active: true,
        completed: false,
        processId: res.process_id,
        overallPercentage: 0,
        processType: 'financial_verticals',
        status: 'processing',
        currentStage: 'initializing',
        startedAt: Date.now() / 1000,
        stagePlan: [],
      });
    } catch {
      error('Failed to start Financial List generation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (runProgress?.active || resumeChecking) {
    return (
      <div className="rc-page rc-page--progress">
        <ProgressView
          progress={runProgress ?? RESUME_PLACEHOLDER}
          processType="financial_verticals"
          runningTitle="Building your financial list"
          reconnected={reconnected}
          onBack={() => {
            clearAdopted();
            setRunProgress(null);
          }}
          onViewResult={(id) => navigate(`/financial-verticals/results/${id}`)}
        />
      </div>
    );
  }

  return (
    <ListBuilderShell
      mode="financial"
      dealId={dealId}
      onDealChange={setDealId}
      dealLocked={!!searchParams.get('deal')}
      onDetachDeal={() => {
        setDealId('');
        navigate(paths.financialVerticals);
      }}
    >
      <PresetBar
        mode="financial"
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

      <FinancialModeComposer
        form={form}
        submitting={submitting}
        onSubmit={() => void handleSubmit()}
        onSaveDraft={saveDraft}
        peError={peError}
        onClearPeError={() => setPeError(false)}
        dealId={dealId}
      />
    </ListBuilderShell>
  );
}
