// Target profile — Replit List builder “What are you looking for?” card.
import { useRef, useState } from 'react';
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormSetValue,
  type UseFormGetValues,
} from 'react-hook-form';
import { Select } from '@/components/ui';
import { CharCountTextarea } from '@/components/form';
import { MandateHelperBar } from '@/components/wizard';
import { researchService } from '@/services/api';
import { industryList, subIndustryMap } from '@/data/subIndustryMap';
import type { TargetListForm } from '@/types';
import ExcludeTermsInput from '@/features/research/composer/ExcludeTermsInput';
import { SectionCard } from '@/features/research/composer/Section';
import InsightPresetChips from '@/features/research/InsightPresetChips';
import { useToast } from '@/hooks/useToast';
import '@/styles/pages/research-composer.css';

const industryOptions = industryList.map((i) => ({ value: i, label: i }));

export interface Step1ActivityProps {
  control: Control<TargetListForm>;
  setValue: UseFormSetValue<TargetListForm>;
  getValues: UseFormGetValues<TargetListForm>;
}

export default function Step1Activity({ control, setValue, getValues }: Step1ActivityProps) {
  const { success, error } = useToast();
  const { fields, append, remove } = useFieldArray({ control, name: 'businessQuery' });
  const {
    fields: insightFields,
    append: appendInsight,
    remove: removeInsight,
  } = useFieldArray({ control, name: 'customInsights.questions' });
  const [enrichingIdx, setEnrichingIdx] = useState<number | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const suggestingRef = useRef(false);
  const lastSuggestedRef = useRef('');
  const maybeSuggestIndustry = async () => {
    const desc = (getValues('businessQuery.0.value') || '').trim();
    if (!desc) return;
    if (getValues('industry') && getValues('subIndustry')) return;
    if (suggestingRef.current || lastSuggestedRef.current === desc) return;
    suggestingRef.current = true;
    lastSuggestedRef.current = desc;
    try {
      const r = await researchService.suggestIndustry({
        description: desc,
        industries: [...industryList],
        subIndustriesMap: subIndustryMap,
      });
      if (!r.industry) return;
      if (!getValues('industry')) setValue('industry', r.industry);
      const chosen = getValues('industry');
      if (r.subIndustry && !getValues('subIndustry') && chosen === r.industry) {
        setValue('subIndustry', r.subIndustry);
      }
    } catch {
      /* passive */
    } finally {
      suggestingRef.current = false;
    }
  };

  const applyDescription = (text: string) => {
    const queries = getValues('businessQuery') ?? [];
    const emptyIdx = queries.findIndex((q) => !(q.value || '').trim());
    if (emptyIdx >= 0) {
      setValue(`businessQuery.${emptyIdx}.value`, text, { shouldDirty: true });
    } else if (queries.length === 0) {
      setValue('businessQuery', [{ value: text }], { shouldDirty: true });
    } else {
      append({ value: text });
    }
    lastSuggestedRef.current = '';
    void maybeSuggestIndustry();
  };

  const applySuggestedIndustry = (name: string) => {
    if (!(industryList as readonly string[]).includes(name) || getValues('industry')) return;
    setValue('industry', name);
  };

  const enrichDescription = async (index: number) => {
    const text = (getValues(`businessQuery.${index}.value`) || '').trim();
    if (!text) {
      error('Write a short description first.');
      return;
    }
    setEnrichingIdx(index);
    try {
      const res = await researchService.enhanceBusinessQuery(text);
      if (res.enhanced) {
        setValue(`businessQuery.${index}.value`, res.enhanced, { shouldDirty: true });
        success('Description updated.');
        void maybeSuggestIndustry();
      } else {
        error('Could not enrich description.');
      }
    } catch {
      error('Could not enrich description.');
    } finally {
      setEnrichingIdx(null);
    }
  };

  return (
    <SectionCard
      icon="bi-bullseye"
      title="What are you looking for?"
      hint="Describe the business in plain language. Add more lines for distinct profiles."
    >
      <div className="lb-profile-queries">
        {fields.map((field, index) => (
          <div key={field.id} className="lb-profile-query">
            <Controller
              control={control}
              name={`businessQuery.${index}.value`}
              render={({ field: f }) => (
                <CharCountTextarea
                  value={f.value}
                  onChange={f.onChange}
                  onBlur={index === 0 ? maybeSuggestIndustry : f.onBlur}
                  maxLength={5000}
                  className="lb-profile-textarea"
                  aria-label={`Target profile ${index + 1}`}
                  placeholder="e.g. B2B SaaS companies providing compliance automation for mid-market banks"
                />
              )}
            />
            <div className="lb-profile-query__actions">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary lb-enrich-desc-btn"
                disabled={enrichingIdx !== null}
                onClick={() => void enrichDescription(index)}
              >
                {enrichingIdx === index ? (
                  <span className="spinner-border spinner-border-sm me-1" />
                ) : (
                  <i className="bi bi-stars me-1" aria-hidden />
                )}
                Enrich Description
              </button>
              {fields.length > 1 && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted lb-remove-profile"
                  onClick={() => remove(index)}
                >
                  <i className="bi bi-x-lg me-1" aria-hidden />
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary lb-fit-button"
          onClick={() => append({ value: '' })}
        >
          <i className="bi bi-plus-lg me-1" aria-hidden />
          Add profile
        </button>
      </div>

      <hr className="lb-divider" />

      <p className="lb-muted-label">Draft description automatically from a website or PDF</p>
      <MandateHelperBar
        onDescription={applyDescription}
        onSuggestedIndustry={applySuggestedIndustry}
      />
      <p className="lb-fineprint">
        We&apos;ll read the site (falling back to web search) or a PDF brief and fill in a
        description you can edit.
      </p>

      <div className="lb-industry-grid">
        <div>
          <label className="lb-field-label" htmlFor="target-industry">
            Industry
          </label>
          <Controller
            control={control}
            name="industry"
            render={({ field: f }) => (
              <Select
                value={f.value}
                onChange={(v) => {
                  f.onChange(v);
                  setValue('subIndustry', '');
                }}
                options={industryOptions}
                placeholder="e.g. Software (GICS Industry)"
                aria-label="Industry"
              />
            )}
          />
        </div>
        <div>
          <label className="lb-field-label" htmlFor="target-sub-industry">
            Sub-industry
          </label>
          <Controller
            control={control}
            name="subIndustry"
            render={({ field: f }) => (
              <SubIndustrySelect control={control} value={f.value} onChange={f.onChange} />
            )}
          />
        </div>
      </div>
      <p className="lb-fineprint">Used to refine discovery. Supplements your description above.</p>

      <hr className="lb-divider" />

      <p className="lb-field-label mb-1">What are you NOT looking for?</p>
      <p className="lb-fineprint mb-2">
        Companies whose name, industry, or description matches any term are forced to No Fit
        regardless of score. Press Enter or comma to add.
      </p>
      <Controller
        control={control}
        name="excludeTerms"
        render={({ field: f }) => <ExcludeTermsInput terms={f.value ?? []} onChange={f.onChange} />}
      />

      <hr className="lb-divider" />

      <button
        type="button"
        className="lb-more-toggle"
        onClick={() => setInsightsOpen((o) => !o)}
        aria-expanded={insightsOpen}
      >
        <span>
          <strong>What do you want to know about each company?</strong>
          <small>Optional questions answered for every company in your results.</small>
        </span>
        <i className={`bi bi-chevron-${insightsOpen ? 'up' : 'down'}`} aria-hidden />
      </button>
      {insightsOpen && (
        <div className="lb-more-body">
          <InsightPresetChips onAdd={(label) => appendInsight({ value: label })} />
          <div className="lb-insight-list">
            {insightFields.map((insight, index) => (
              <div key={insight.id} className="lb-insight-row">
                <Controller
                  control={control}
                  name={`customInsights.questions.${index}.value`}
                  render={({ field: f }) => (
                    <input
                      type="text"
                      className="form-control"
                      value={f.value}
                      onChange={f.onChange}
                      placeholder="e.g. What recent growth signals does this company show?"
                    />
                  )}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted"
                  onClick={() => removeInsight(index)}
                  aria-label="Remove insight question"
                >
                  <i className="bi bi-x-lg" aria-hidden />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary lb-fit-button"
              onClick={() => appendInsight({ value: '' })}
            >
              <i className="bi bi-plus-lg me-1" aria-hidden />
              Add question
            </button>
          </div>
          <div className="mt-3">
            <Controller
              control={control}
              name="customInsights.useCompanySizeInsight"
              render={({ field: f }) => (
                <label className="d-flex align-items-center gap-2 small text-muted">
                  <input
                    type="checkbox"
                    checked={!!f.value}
                    onChange={(e) => f.onChange(e.target.checked)}
                  />
                  Include alternate company-size insight
                </label>
              )}
            />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function SubIndustrySelect({
  control,
  value,
  onChange,
}: {
  control: Control<TargetListForm>;
  value: string;
  onChange: (v: string) => void;
}) {
  const selectedIndustry = useWatch({ control, name: 'industry' });
  const options = (subIndustryMap[selectedIndustry] ?? []).map((s) => ({
    value: s,
    label: s,
  }));
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder="e.g. Application Software (GICS Sub-Industry)"
      aria-label="Sub-industry"
      disabled={!selectedIndustry}
    />
  );
}
