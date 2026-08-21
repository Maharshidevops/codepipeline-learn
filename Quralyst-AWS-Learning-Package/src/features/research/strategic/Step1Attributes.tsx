// Step 1 — Selling Company Attributes + the deep-navy "Get an Ideal Buyer Recommendation" card.
// Mirrors strategic_research.html wizard-step[data-step=1]: business description(s), Industry /
// Sub-Industry selects, Primary/Secondary activity radios (with inline reset), Skip Website Scraping
// toggle, Clear-all, and the buyer-recommendation card (buyer-type checkboxes + AiAssistPanel +
// "Use Recommended Buyer Strategy"). The AiAssistPanel "Ai Prompt → Enrich" result is written into
// the targetDescription RHF field.
import { useState } from 'react';
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form';
import { CriteriaCard, Select, Checkbox, Spinner } from '@/components/ui';
import { CharCountTextarea, ResettableRadioGroup } from '@/components/form';
import { AiAssistPanel } from '@/components/wizard';
import { researchService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { industryList, subIndustryMap } from '@/data/subIndustryMap';
import type { StrategicForm } from '@/types';
import ExcludeTermsInput from '@/features/research/composer/ExcludeTermsInput';
import '@/styles/pages/research-composer.css';

const PRIMARY_OPTIONS = [
  { value: 'Product', label: 'Product' },
  { value: 'Service', label: 'Service' },
  { value: 'Both', label: 'Both' },
];

const SECONDARY_OPTIONS = [
  { value: 'Manufacturer', label: 'Manufacturer' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Retailer', label: 'Retailer' },
  { value: 'Not Applicable', label: 'Not Applicable' },
];

export interface Step1Props {
  form: UseFormReturn<StrategicForm>;
}

export default function Step1Attributes({ form }: Step1Props) {
  const { control, register, watch, setValue, getValues, reset } = form;
  const queries = useFieldArray({ control, name: 'businessQuery' });
  const toast = useToast();
  const [enhancing, setEnhancing] = useState(false);

  const industry = watch('industry');
  const targetDescription = watch('targetDescription');
  const subIndustryOptions = (subIndustryMap[industry] ?? []).map((s) => ({ value: s, label: s }));

  // F10 — enhance the ideal-buyer / target description in place (failure keeps the user's text).
  const enhanceTarget = async () => {
    const desc = (getValues('targetDescription') || '').trim();
    if (!desc) {
      toast.error('Add a target description first.');
      return;
    }
    const idealBuyerTypes = [
      getValues('buyerHorizontal') && 'Horizontal',
      getValues('buyerVertical') && 'Vertical',
      getValues('buyerAdjacent') && 'Adjacent',
    ].filter(Boolean) as string[];
    setEnhancing(true);
    try {
      const r = await researchService.enhanceTargetDescription({
        description: desc,
        idealBuyerTypes: idealBuyerTypes.length ? idealBuyerTypes : undefined,
        industry: getValues('industry') || undefined,
      });
      if (r.description) setValue('targetDescription', r.description, { shouldDirty: true });
      toast.success('Target description enhanced.');
    } catch {
      toast.error('Could not enhance the description. Please try again.');
    } finally {
      setEnhancing(false);
    }
  };

  const clearAll = () => {
    reset(
      {
        ...getValues(),
        businessQuery: [{ value: '' }],
        industry: '',
        subIndustry: '',
        primaryActivity: '',
        secondaryActivity: '',
      },
      { keepDefaultValues: true },
    );
  };

  return (
    <>
      {/* Selling Company Attributes Card */}
      <CriteriaCard variant="white" className="mb-4 p-4">
        <div className="mb-2 d-flex justify-content-between align-items-center">
          <h3 className="criteria-title">Selling Company Attributes</h3>
        </div>

        {/* Brief business description (one or more) */}
        <div className="row g-3 align-items-center mb-3">
          <div className="col-md-12">
            {/* a11y (Phase 35): captions for custom widgets/groups are <span>s, not <label>s —
                label[for] cannot target them; the widgets get aria-label instead. */}
            <span className="form-label">Brief business description</span>
            <div className="business-queries-list">
              {queries.fields.map((field, i) => (
                <div className="business-query-group mb-2" key={field.id}>
                  <Controller
                    control={control}
                    name={`businessQuery.${i}.value`}
                    render={({ field: f }) => (
                      <CharCountTextarea
                        value={f.value}
                        onChange={f.onChange}
                        maxLength={5000}
                        className="input-query"
                        aria-label="Brief business description"
                        placeholder="Provide us one line description of the seller"
                      />
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Industry & Sub Industry */}
        <div className="row g-3 align-items-center mb-3">
          <div className="col-md-12">
            <span className="form-label">Industry &amp; Sub Industry</span>
            <div className="row mb-2 g-3">
              <div className="col-12 col-md-4">
                <Controller
                  control={control}
                  name="industry"
                  render={({ field: f }) => (
                    <Select
                      id="industry-select"
                      aria-label="Industry"
                      value={f.value}
                      onChange={(v) => {
                        f.onChange(v);
                        setValue('subIndustry', '');
                      }}
                      options={industryList.map((v) => ({ value: v, label: v }))}
                      placeholder="Industry"
                    />
                  )}
                />
              </div>
              <div className="col-12 col-md-4">
                <Controller
                  control={control}
                  name="subIndustry"
                  render={({ field: f }) => (
                    <Select
                      id="sub-industry-select"
                      aria-label="Sub Industry"
                      value={f.value}
                      onChange={f.onChange}
                      options={subIndustryOptions}
                      placeholder="Sub Industry"
                      disabled={!industry}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Primary Activity */}
        <div className="col-12 mb-4">
          <span className="form-label">Primary Activity</span>
          <Controller
            control={control}
            name="primaryActivity"
            render={({ field: f }) => (
              <ResettableRadioGroup
                name="primary_activity"
                options={PRIMARY_OPTIONS}
                value={f.value}
                onChange={(v) => f.onChange(v)}
                resetTitle="Clear Primary Activity"
              />
            )}
          />
        </div>

        {/* Secondary Activity */}
        <div className="col-12 mb-3">
          <span className="form-label">Secondary Activity</span>
          <Controller
            control={control}
            name="secondaryActivity"
            render={({ field: f }) => (
              <ResettableRadioGroup
                name="secondary_activity"
                options={SECONDARY_OPTIONS}
                value={f.value}
                onChange={(v) => f.onChange(v)}
                resetTitle="Clear Secondary Activity"
              />
            )}
          />
        </div>

        {/* Skip Website Scraping note — UI-only here; the toggle lives in Step 2's flow in spec,
            but the legacy template carries skipWebsiteScraping on Step 1. The shared StrategicForm
            type does not include it, so it is intentionally omitted from RHF state. */}

        {/* Clear all inputs */}
        <div className="row g-3 align-items-center mb-0">
          <div className="col-12 d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-clear-all-text"
              id="company_clear_inputs"
              title="Clear all inputs"
              onClick={clearAll}
            >
              Clear all inputs
            </button>
          </div>
        </div>
      </CriteriaCard>

      {/* Ideal Buyer Type Recommendation Card (deep-navy) */}
      <CriteriaCard variant="deep" className="mb-4 p-4">
        {targetDescription ? (
          <div className="mb-2">
            <h3 className="mb-1">Your Ideal Buyer Type Recommendation</h3>
            <p className="text-muted small mb-0">
              Your buyer recommendation is ready: Review the suggested prompt tailored to your
              criteria. You can refine or adjust to better match your strategy.
            </p>
          </div>
        ) : (
          <div className="mb-2">
            <h3 className="mb-1">Get an Ideal Buyer Recommendation</h3>
            <p className="text-muted small mb-0">
              Select a buyer type and click the button to generate a tailored buyer recommendation
              based on your criteria. You can review and refine anytime.
            </p>
          </div>
        )}

        <div className="mb-3">
          <span className="form-label">What are you NOT looking for?</span>
          <p className="text-muted small mb-2">Buyers matching these terms are forced to No Fit.</p>
          <Controller
            control={control}
            name="excludeTerms"
            render={({ field: f }) => (
              <ExcludeTermsInput terms={f.value ?? []} onChange={f.onChange} />
            )}
          />
        </div>

        {/* Editable recommendation prompt (shown once we have a recommendation) */}
        {targetDescription && (
          <div className="mb-3">
            <div className="input-group">
              <textarea
                className="form-control border-1 rounded-4 bg-light"
                id="target_description"
                rows={3}
                placeholder="Ideal Buyer Type"
                {...register('targetDescription')}
              />
            </div>
            {/* F10 — enhance the description in place. */}
            <div className="d-flex justify-content-end mt-2">
              <button
                type="button"
                className="btn btn-standard btn-sm"
                onClick={enhanceTarget}
                disabled={enhancing}
              >
                {enhancing ? (
                  <Spinner size="sm" />
                ) : (
                  <i className="bi bi-magic me-1" aria-hidden="true" />
                )}{' '}
                Enhance target description
              </button>
            </div>
          </div>
        )}

        {/* AiAssistPanel: "Ai Prompt" pill → editable prompt → "Enrich" → writes targetDescription */}
        <div className="mb-3">
          <AiAssistPanel
            mode="buyer-recommendation"
            showTitle={false}
            defaultPrompt={targetDescription}
            onResult={(data) => {
              const rec = (data as { recommendation?: string }).recommendation;
              if (rec) setValue('targetDescription', rec, { shouldDirty: true });
            }}
          />
        </div>

        {/* Buyer-type checkboxes + Use Recommended Buyer Strategy */}
        <div className="buyer-type-options">
          <span className="text-muted small d-block mb-2">Select type of Buyers:</span>
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
            <Controller
              control={control}
              name="buyerHorizontal"
              render={({ field: f }) => (
                <Checkbox
                  id="buyer_mode_horizontal"
                  className="buyer-enhance-mode-input"
                  label="Horizontal Buyers"
                  checked={f.value}
                  onChange={(e) => f.onChange(e.target.checked)}
                />
              )}
            />
            <Controller
              control={control}
              name="buyerVertical"
              render={({ field: f }) => (
                <Checkbox
                  id="buyer_mode_vertical"
                  className="buyer-enhance-mode-input"
                  label="Vertical Buyers"
                  checked={f.value}
                  onChange={(e) => f.onChange(e.target.checked)}
                />
              )}
            />
            <Controller
              control={control}
              name="buyerAdjacent"
              render={({ field: f }) => (
                <Checkbox
                  id="buyer_mode_adjacent"
                  className="buyer-enhance-mode-input"
                  label="Adjacent Buyers"
                  checked={f.value}
                  onChange={(e) => f.onChange(e.target.checked)}
                />
              )}
            />
          </div>
          <div className="d-flex justify-content-start justify-content-md-end">
            <Controller
              control={control}
              name="useRecommendedBuyer"
              render={({ field: f }) => (
                <Checkbox
                  id="use_recommended_buyer"
                  label="Use Recommended Buyer Strategy"
                  checked={f.value}
                  onChange={(e) => f.onChange(e.target.checked)}
                />
              )}
            />
          </div>
        </div>
      </CriteriaCard>
    </>
  );
}
