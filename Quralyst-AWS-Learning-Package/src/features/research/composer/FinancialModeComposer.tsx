// FinancialModeComposer — Replit-parity Financial Buyer list composer.
// Uses the lb-* CSS design system (research-composer.css).
// Three steps:
//   1. Target description (textarea + business type / industry / sub-industry)
//   2. Mandate filters (geography, financial criteria, platform-size thresholds)
//   3. Buyer signals & enrichment (buyer exposure switches + post-generation enrichment)

import { useMemo, useState } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { LocationSelector } from '@/components/domain';
import type { FinancialVerticalsForm, LocationGroup } from '@/types';
import { ComposerLayout, RunPanel, type ChecklistItem, type SummaryItem } from './ComposerLayout';
import { SectionGroup, SectionCard } from './Section';
import { OptionToggle } from './SourceToggle';

// ---------------------------------------------------------------------------
// Tiny inline function tag (Filters results / Labels results) — Replit FunctionTag
// ---------------------------------------------------------------------------
function FunctionTag({ kind }: { kind: 'filters' | 'labels' }) {
  return (
    <span
      data-kind={kind}
      style={{
        marginLeft: '0.5rem',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '0.375rem',
        padding: '0.1rem 0.45rem',
        fontSize: '0.68rem',
        fontWeight: 600,
      }}
      className={`lb-function-tag lb-function-tag--${kind}`}
    >
      {kind === 'filters' ? 'Filters results' : 'Labels results'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Range row — min/max pair inside the financial criteria grid
// ---------------------------------------------------------------------------
interface RangeRowProps {
  label: string;
  unit?: string;
  minId: string;
  maxId: string;
  minValue: string;
  maxValue: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}
function RangeRow({ label, unit, minId, maxId, minValue, maxValue, onMin, onMax }: RangeRowProps) {
  return (
    <div>
      <label className="lb-field-label" htmlFor={minId}>
        {label}{' '}
        {unit && (
          <span className="lb-muted-label" style={{ fontWeight: 400 }}>
            ({unit})
          </span>
        )}
      </label>
      <div
        className="lb-size-grid"
        style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.35rem' }}
      >
        <input
          id={minId}
          className="form-control form-control-sm"
          placeholder="Min"
          value={minValue}
          onChange={(e) => onMin(e.target.value)}
        />
        <input
          id={maxId}
          className="form-control form-control-sm"
          placeholder="Max"
          value={maxValue}
          onChange={(e) => onMax(e.target.value)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface FinancialModeComposerProps {
  form: UseFormReturn<FinancialVerticalsForm>;
  submitting: boolean;
  onSubmit: () => void;
  onSaveDraft: () => void;
  peError: boolean;
  onClearPeError?: () => void;
  dealId?: string;
  dealName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function FinancialModeComposer({
  form,
  submitting,
  onSubmit,
  onSaveDraft,
  peError,
  onClearPeError,
  dealId,
  dealName,
}: FinancialModeComposerProps) {
  const { register, control, setValue } = form;

  // Platform-size explainer accordion
  const [explainerOpen, setExplainerOpen] = useState(false);

  // Watched values for run summary / checklist (useWatch so toggle updates tick live)
  const targetDescription = useWatch({ control, name: 'targetDescription' }) ?? '';
  const businessType = useWatch({ control, name: 'businessType' }) ?? '';
  const industry = useWatch({ control, name: 'industry' }) ?? '';
  const subIndustry = useWatch({ control, name: 'subIndustry' }) ?? '';
  const continent = useWatch({ control, name: 'continent' }) ?? '';
  const country = useWatch({ control, name: 'country' }) ?? '';
  const state = useWatch({ control, name: 'state' }) ?? '';
  const revenueMin = useWatch({ control, name: 'revenueMin' }) ?? '';
  const revenueMax = useWatch({ control, name: 'revenueMax' }) ?? '';
  const ebitdaMin = useWatch({ control, name: 'ebitdaMin' }) ?? '';
  const ebitdaMax = useWatch({ control, name: 'ebitdaMax' }) ?? '';
  const evMin = useWatch({ control, name: 'enterpriseValueMin' }) ?? '';
  const evMax = useWatch({ control, name: 'enterpriseValueMax' }) ?? '';
  const eqMin = useWatch({ control, name: 'equityCheckMin' }) ?? '';
  const eqMax = useWatch({ control, name: 'equityCheckMax' }) ?? '';
  const platformEbitdaFloor = useWatch({ control, name: 'platformEbitdaFloor' }) ?? '';
  const platformRevenueFloor = useWatch({ control, name: 'platformRevenueFloor' }) ?? '';
  const currentPortfolio = useWatch({ control, name: 'currentPortfolio' }) === true;
  const pastPortfolio = useWatch({ control, name: 'pastPortfolio' }) === true;
  const listedInterest = useWatch({ control, name: 'listedInterest' }) === true;
  const requestPeContact = useWatch({ control, name: 'requestPeContact' }) === true;

  const setExposure = (
    name: 'currentPortfolio' | 'pastPortfolio' | 'listedInterest',
    value: boolean,
  ) => {
    setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    if (value) onClearPeError?.();
  };

  // ---------------------------------------------------------------------------
  // Run summary logic — Replit FinancialMode parity
  // ---------------------------------------------------------------------------
  // Run gate wants a short mandate (≥5 chars), not an empty field.
  const descriptionOk = targetDescription.trim().length >= 5;
  const exposureCount = [currentPortfolio, pastPortfolio, listedInterest].filter(Boolean).length;
  const exposureSelected = exposureCount > 0;

  const anyFinancial = [
    revenueMin,
    revenueMax,
    ebitdaMin,
    ebitdaMax,
    evMin,
    evMax,
    eqMin,
    eqMax,
  ].some((v) => String(v).trim() !== '');
  const anyGeo = [continent, country, state].some((v) => String(v).trim() !== '');

  const ranges = useMemo(() => {
    const r: string[] = [];
    if (revenueMin || revenueMax) r.push('Revenue');
    if (ebitdaMin || ebitdaMax) r.push('EBITDA');
    if (evMin || evMax) r.push('EV');
    if (eqMin || eqMax) r.push('Equity');
    return r;
  }, [revenueMin, revenueMax, ebitdaMin, ebitdaMax, evMin, evMax, eqMin, eqMax]);

  const exposures = useMemo(() => {
    const e: string[] = [];
    if (currentPortfolio) e.push('Current');
    if (pastPortfolio) e.push('Past');
    if (listedInterest) e.push('Listed');
    return e;
  }, [currentPortfolio, pastPortfolio, listedInterest]);

  const platformLabel = useMemo(() => {
    const ef = String(platformEbitdaFloor).trim();
    const rf = String(platformRevenueFloor).trim();
    if (!ef && !rf) return 'Defaults ($3M / $15M)';
    return `$${ef || '3'}M EBITDA / $${rf || '15'}M revenue`;
  }, [platformEbitdaFloor, platformRevenueFloor]);

  const summaryItems: SummaryItem[] = useMemo(() => {
    const items: SummaryItem[] = [];
    if (dealId) items.push({ label: 'Deal', value: dealName || dealId });
    items.push({ label: 'Target', value: descriptionOk ? 'Described' : '' });
    const industryLabel = [businessType, industry, subIndustry].filter(Boolean).join(' · ');
    if (industryLabel) items.push({ label: 'Industry', value: industryLabel });
    const geoLabel = [continent, country, state].filter(Boolean).join(', ');
    if (geoLabel) items.push({ label: 'Geography', value: geoLabel });
    if (ranges.length > 0) items.push({ label: 'Financials', value: ranges.join(', ') });
    items.push({ label: 'Platform size', value: platformLabel });
    items.push({ label: 'Exposure', value: exposures.join(' + ') });
    if (requestPeContact) items.push({ label: 'Contacts', value: 'Requested' });
    return items;
  }, [
    dealId,
    dealName,
    descriptionOk,
    businessType,
    industry,
    subIndustry,
    continent,
    country,
    state,
    ranges,
    platformLabel,
    exposures,
    requestPeContact,
  ]);

  const outputs = useMemo(() => {
    const base = [
      'Firm',
      'Fit score',
      'Revenue',
      'EBITDA',
      'Enterprise value',
      'Equity check',
      'Locations',
      'Matched companies',
      'Reasoning',
    ];
    if (requestPeContact) base.push('Contacts');
    return base;
  }, [requestPeContact]);

  // Two blocking requirements + one amber non-blocking nudge (Replit parity).
  const checklist: ChecklistItem[] = useMemo(
    () => [
      { label: 'Target description filled in', done: descriptionOk },
      { label: 'At least one buyer signal selected', done: exposureSelected },
      {
        label: 'Financial criteria or geography set',
        done: anyFinancial || anyGeo,
        nudge: true,
      },
    ],
    [descriptionOk, exposureSelected, anyFinancial, anyGeo],
  );

  const canSubmit = descriptionOk && exposureSelected && !submitting;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ComposerLayout
      left={
        <div className="lb-layout__main">
          {/* ── STEP 1: TARGET DESCRIPTION ─────────────────────────────────── */}
          <SectionGroup
            step={1}
            title="Target description"
            description="Describe the company or mandate you want PE buyers for."
            id="financial-step-1"
          >
            <SectionCard
              title="Target description"
              hint="Describe the company or mandate you want buyers for."
              icon="bi-bullseye"
            >
              <textarea
                id="fv_target_description"
                className="form-control"
                rows={4}
                placeholder="e.g. A profitable B2B SaaS company serving logistics operators in North America…"
                {...register('targetDescription')}
              />

              <div
                className="lb-size-grid mt-4"
                style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '0.75rem' }}
              >
                <div>
                  <label htmlFor="fv_business_type" className="lb-field-label">
                    Business type
                  </label>
                  <input
                    id="fv_business_type"
                    className="form-control form-control-sm mt-1"
                    placeholder="e.g. SaaS"
                    {...register('businessType')}
                  />
                  <p className="lb-fineprint mt-1">
                    e.g. SaaS, services, manufacturing, distribution. Affects mandate scoring.
                  </p>
                </div>
                <div>
                  <label htmlFor="fv_industry" className="lb-field-label">
                    Industry
                  </label>
                  <input
                    id="fv_industry"
                    className="form-control form-control-sm mt-1"
                    placeholder="e.g. Software"
                    {...register('industry')}
                  />
                </div>
                <div>
                  <label htmlFor="fv_sub_industry" className="lb-field-label">
                    Sub-industry
                  </label>
                  <input
                    id="fv_sub_industry"
                    className="form-control form-control-sm mt-1"
                    placeholder="e.g. Logistics tech"
                    {...register('subIndustry')}
                  />
                </div>
              </div>
            </SectionCard>
          </SectionGroup>

          {/* ── STEP 2: MANDATE FILTERS ─────────────────────────────────────── */}
          <SectionGroup
            step={2}
            title="Mandate filters"
            description="Narrow results by location, financials, and deal size."
            id="financial-step-2"
          >
            {/* Geography — continent / country / state dropdowns */}
            <SectionCard
              title="Geography"
              hint="Optional location focus for the target."
              icon="bi-geo-alt"
            >
              <LocationSelector
                value={[
                  {
                    continent: continent || undefined,
                    country: country || undefined,
                    state: state || undefined,
                  } satisfies LocationGroup,
                ]}
                singleRow
                onChange={(next) => {
                  const row = next[0] ?? {};
                  setValue('continent', row.continent ?? '', { shouldDirty: true });
                  setValue('country', row.country ?? '', { shouldDirty: true });
                  setValue('state', row.state ?? '', { shouldDirty: true });
                }}
              />
              <div className="d-flex justify-content-end mt-3">
                <button
                  type="button"
                  className="btn btn-clear-all btn-sm"
                  title="Clear location"
                  onClick={() => {
                    setValue('continent', '', { shouldDirty: true });
                    setValue('country', '', { shouldDirty: true });
                    setValue('state', '', { shouldDirty: true });
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                </button>
              </div>
            </SectionCard>

            {/* Financial criteria */}
            <div className="lb-section-card">
              <div className="lb-section-card__head">
                <div className="lb-section-card__icon" aria-hidden>
                  <i className="bi bi-currency-dollar" />
                </div>
                <div>
                  <h3 className="lb-section-card__title">
                    Financial criteria
                    <FunctionTag kind="filters" />
                  </h3>
                  <p className="lb-section-card__hint">
                    Bounds the target should fall within. Leave blank to ignore a metric.
                  </p>
                </div>
              </div>
              <div
                className="lb-size-grid"
                style={{ gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}
              >
                <RangeRow
                  label="Revenue"
                  unit="$"
                  minId="fv_rev_min"
                  maxId="fv_rev_max"
                  minValue={revenueMin}
                  maxValue={revenueMax}
                  onMin={(v) => form.setValue('revenueMin', v)}
                  onMax={(v) => form.setValue('revenueMax', v)}
                />
                <RangeRow
                  label="EBITDA"
                  unit="$"
                  minId="fv_ebi_min"
                  maxId="fv_ebi_max"
                  minValue={ebitdaMin}
                  maxValue={ebitdaMax}
                  onMin={(v) => form.setValue('ebitdaMin', v)}
                  onMax={(v) => form.setValue('ebitdaMax', v)}
                />
                <RangeRow
                  label="Enterprise value"
                  unit="$"
                  minId="fv_ev_min"
                  maxId="fv_ev_max"
                  minValue={evMin}
                  maxValue={evMax}
                  onMin={(v) => form.setValue('enterpriseValueMin', v)}
                  onMax={(v) => form.setValue('enterpriseValueMax', v)}
                />
                <RangeRow
                  label="Equity check"
                  unit="$"
                  minId="fv_eq_min"
                  maxId="fv_eq_max"
                  minValue={eqMin}
                  maxValue={eqMax}
                  onMin={(v) => form.setValue('equityCheckMin', v)}
                  onMax={(v) => form.setValue('equityCheckMax', v)}
                />
              </div>
            </div>

            {/* Platform-size thresholds */}
            <div className="lb-section-card">
              <div className="lb-section-card__head">
                <div className="lb-section-card__icon" aria-hidden>
                  <i className="bi bi-bar-chart-line" />
                </div>
                <div>
                  <h3 className="lb-section-card__title">
                    Platform-size thresholds
                    <FunctionTag kind="labels" />
                  </h3>
                  <p className="lb-section-card__hint">
                    Sets the size threshold between platform deals and add-on deals. Companies above
                    this threshold are labelled platform; below are add-ons. Leave blank for
                    defaults ($3M EBITDA / $15M revenue).
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <button
                  type="button"
                  className="lb-explainer-btn"
                  onClick={() => setExplainerOpen((o) => !o)}
                  aria-expanded={explainerOpen}
                >
                  How does this affect results?
                  <i
                    className={`bi bi-chevron-right ms-1 lb-chevron${explainerOpen ? ' is-open' : ''}`}
                  />
                </button>
                {explainerOpen && (
                  <p className="lb-explainer-body mt-2">
                    Platform companies are larger, more established businesses a PE firm acquires as
                    the primary investment. Add-ons are smaller companies bolt-on acquired to grow
                    an existing platform. This threshold determines how your target is labelled in
                    the output. It does <em>not</em> filter results in or out.
                  </p>
                )}
              </div>

              <div
                className="lb-size-grid"
                style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}
              >
                <div>
                  <label htmlFor="fv_platform_ebitda" className="lb-field-label">
                    EBITDA floor ($M)
                  </label>
                  <input
                    id="fv_platform_ebitda"
                    type="number"
                    min={0}
                    step="any"
                    className="form-control form-control-sm mt-1"
                    placeholder="3"
                    {...register('platformEbitdaFloor')}
                  />
                </div>
                <div>
                  <label htmlFor="fv_platform_revenue" className="lb-field-label">
                    Revenue floor ($M)
                  </label>
                  <input
                    id="fv_platform_revenue"
                    type="number"
                    min={0}
                    step="any"
                    className="form-control form-control-sm mt-1"
                    placeholder="15"
                    {...register('platformRevenueFloor')}
                  />
                </div>
              </div>
            </div>
          </SectionGroup>

          {/* ── STEP 3: BUYER SIGNALS & ENRICHMENT ─────────────────────────── */}
          <SectionGroup
            step={3}
            title="Buyer signals & enrichment"
            description="Choose which signals to match on and how to enrich results."
            id="financial-step-3"
          >
            {/* Buyer exposure */}
            <div className="lb-section-card">
              <div className="lb-section-card__head">
                <div className="lb-section-card__icon" aria-hidden>
                  <i className="bi bi-buildings" />
                </div>
                <div>
                  <h3 className="lb-section-card__title">
                    Buyer exposure
                    <span
                      className="lb-exposure-badge"
                      style={{
                        marginLeft: '0.5rem',
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        borderRadius: '0.375rem',
                        padding: '0.1rem 0.45rem',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        background: exposureSelected
                          ? 'rgba(16,185,129,0.08)'
                          : 'rgba(239,68,68,0.1)',
                        color: exposureSelected ? '#059669' : '#dc2626',
                      }}
                    >
                      {exposureCount === 1
                        ? '1 signal selected'
                        : `${exposureCount} signals selected`}
                    </span>
                  </h3>
                  <p className="lb-section-card__hint">
                    Which signals of fit should we look for? Select at least one.
                  </p>
                </div>
              </div>

              {peError && (
                <div className="lb-pe-error mb-3" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-1" aria-hidden />
                  At least one buyer signal must be selected.
                </div>
              )}

              <div className="lb-source-stack">
                <OptionToggle
                  label="Current portfolio fit"
                  description="Firms with similar companies they currently own."
                  enabled={currentPortfolio}
                  onToggle={(v) => setExposure('currentPortfolio', v)}
                />
                <OptionToggle
                  label="Past portfolio fit"
                  description="Firms that previously owned similar companies."
                  enabled={pastPortfolio}
                  onToggle={(v) => setExposure('pastPortfolio', v)}
                />
                <OptionToggle
                  label="Listed sector interest"
                  description="Firms publicly listing interest in the space."
                  enabled={listedInterest}
                  onToggle={(v) => setExposure('listedInterest', v)}
                />
              </div>
            </div>

            {/* Post-generation enrichment */}
            <SectionCard
              title="Post-generation enrichment"
              hint="Automatically fetch contacts and/or company data via Apollo once the list is built."
              icon="bi-stars"
            >
              <div className="lb-source-stack">
                <Controller
                  control={control}
                  name="autoEnrich"
                  render={({ field: f }) => (
                    <OptionToggle
                      label="Auto-enrich after generation (Apollo)"
                      description="Runs in the background. Results appear on the list page when ready."
                      enabled={f.value}
                      onToggle={f.onChange}
                    />
                  )}
                />
                <div className="lb-divider" />
                <Controller
                  control={control}
                  name="requestPeContact"
                  render={({ field: f }) => (
                    <OptionToggle
                      label="Request contact details"
                      description="Include deal/partner contacts where available."
                      enabled={f.value}
                      onToggle={f.onChange}
                    />
                  )}
                />
              </div>
            </SectionCard>
          </SectionGroup>
        </div>
      }
      right={
        <RunPanel
          summary={summaryItems}
          outputs={outputs}
          checklist={checklist}
          action={
            <>
              <button
                type="button"
                className="lb-run-panel__cta"
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                {submitting ? (
                  <>
                    <i className="bi bi-hourglass-split me-1" />
                    Building…
                  </>
                ) : (
                  <>
                    <i className="bi bi-bar-chart-line me-1" />
                    Build financials buyer list
                  </>
                )}
              </button>
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
      }
    />
  );
}
