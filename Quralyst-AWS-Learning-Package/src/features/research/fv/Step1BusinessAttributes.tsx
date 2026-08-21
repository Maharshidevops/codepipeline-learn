// FV Step 1 — Business Attributes. Mirrors financial_verticals.html step-1 markup:
//  • Business Details (light card): target_description textarea.
//  • Business Type (white card): Manufacturer / Distributor / Service Provider radios + reset.
//  • Location Preference (deep-navy card): single HQ country + state (LocationSelector singleRow).
//  • Industry Type (deep-navy card): industry + dynamic sub_industry selects OR custom text inputs + toggle.
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Select, RadioGroup } from '@/components/ui';
import { CharCountTextarea } from '@/components/form';
import { LocationSelector } from '@/components/domain';
import { industryList, subIndustryMap } from '@/data/subIndustryMap';
import type { FinancialVerticalsForm, LocationGroup } from '@/types';

const BUSINESS_TYPE_OPTIONS = [
  { value: 'Manufacturer', label: 'Manufacturer' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Service Provider', label: 'Service Provider' },
];

const industryOptions = industryList.map((i) => ({ value: i, label: i }));

export interface Step1BusinessAttributesProps {
  control: Control<FinancialVerticalsForm>;
  setValue: UseFormSetValue<FinancialVerticalsForm>;
}

export default function Step1BusinessAttributes({
  control,
  setValue,
}: Step1BusinessAttributesProps) {
  const useCustomIndustry = useWatch({ control, name: 'useCustomIndustry' });
  const industryCustom = useWatch({ control, name: 'industryCustom' });
  const subIndustryCustom = useWatch({ control, name: 'subIndustryCustom' });
  const industry = useWatch({ control, name: 'industry' });
  const subIndustry = useWatch({ control, name: 'subIndustry' });

  const toggleCustomIndustry = () => {
    const next = !useCustomIndustry;
    setValue('useCustomIndustry', next);
    if (next) {
      if (!industryCustom && industry) setValue('industryCustom', industry);
      if (!subIndustryCustom && subIndustry) setValue('subIndustryCustom', subIndustry);
    }
  };

  return (
    <>
      {/* Business Details — Light Blue header card */}
      <div className="criteria-card criteria-card--light mb-4 p-4">
        <h2 className="criteria-title">Business Details</h2>
        <p className="text-muted small mb-3">
          Please provide us with a description of the business
        </p>
        <div className="row g-3 align-items-center mb-3">
          <div className="col-md-12">
            <div className="business-queries-list">
              <div className="business-query-group mb-2">
                <Controller
                  control={control}
                  name="targetDescription"
                  render={({ field: f }) => (
                    <CharCountTextarea
                      value={f.value}
                      onChange={f.onChange}
                      maxLength={5000}
                      className="input-query"
                      aria-label="Business description"
                      placeholder="Description text example..."
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Type — White card */}
      <div className="criteria-card criteria-card--white mb-4 p-4">
        <div className="mb-3">
          <h4 className="fw-bold mb-1">Business Type</h4>
          <p className="text-muted small mb-3">Please indicate the target&apos;s business type:</p>
        </div>
        <div className="d-flex flex-wrap gap-4 mb-3">
          <Controller
            control={control}
            name="businessType"
            render={({ field: f }) => (
              <RadioGroup
                name="business_type"
                options={BUSINESS_TYPE_OPTIONS}
                value={f.value}
                onChange={(v) => f.onChange(v as FinancialVerticalsForm['businessType'])}
                inline
              />
            )}
          />
        </div>
        <div className="d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-clear-all"
            title="Clear all inputs"
            onClick={() => setValue('businessType', '')}
          >
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Location Preference — Deep Blue card (single HQ country + state) */}
      <div className="criteria-card criteria-card--deep mb-4 p-4">
        <div className="mb-3">
          <h4 className="fw-bold mb-1">Location Preference</h4>
          <p className="text-white-50 small mb-3">Please provide HQ location of your target</p>
        </div>
        <Controller
          control={control}
          name="country"
          render={({ field: countryField }) => (
            <Controller
              control={control}
              name="state"
              render={({ field: stateField }) => {
                const rows: LocationGroup[] = [
                  { country: countryField.value, state: stateField.value },
                ];
                return (
                  <LocationSelector
                    value={rows}
                    singleRow
                    onChange={(next) => {
                      const row = next[0] ?? {};
                      countryField.onChange(row.country ?? '');
                      stateField.onChange(row.state ?? '');
                    }}
                  />
                );
              }}
            />
          )}
        />
        <div className="d-flex justify-content-end mt-3">
          <button
            type="button"
            className="btn btn-clear-all"
            id="location-clear-btn"
            title="Clear all inputs"
            onClick={() => {
              setValue('country', '');
              setValue('state', '');
            }}
          >
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Industry Type — Deep Blue card */}
      <div className="criteria-card criteria-card--deep mb-4 p-4">
        <div className="mb-3">
          <h4 className="fw-bold mb-1">Industry Type</h4>
          <p className="text-white-50 small mb-3">
            Please indicate the Target&apos;s Industry and Sub-Industry
          </p>
        </div>
        <div className="row mb-2 g-3">
          <div className="col-md-4" id="industry-custom-dropdown">
            {!useCustomIndustry ? (
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
                    placeholder="Industry"
                  />
                )}
              />
            ) : (
              <Controller
                control={control}
                name="industryCustom"
                render={({ field: f }) => (
                  <input
                    type="text"
                    id="industry-text-input"
                    name="industry_custom"
                    className="form-control rounded-pill industry-text-input"
                    placeholder="Industry"
                    value={f.value}
                    onChange={f.onChange}
                  />
                )}
              />
            )}
          </div>
          <div className="col-md-4" id="sub-industry-custom-dropdown">
            {!useCustomIndustry ? (
              <Controller
                control={control}
                name="industry"
                render={({ field: industryField }) => {
                  const subs = subIndustryMap[industryField.value] ?? [];
                  const options = subs.map((s) => ({ value: s, label: s }));
                  return (
                    <Controller
                      control={control}
                      name="subIndustry"
                      render={({ field: f }) => (
                        <Select
                          value={f.value}
                          onChange={f.onChange}
                          options={options}
                          placeholder="Sub Industry"
                          disabled={!industryField.value}
                        />
                      )}
                    />
                  );
                }}
              />
            ) : (
              <Controller
                control={control}
                name="subIndustryCustom"
                render={({ field: f }) => (
                  <input
                    type="text"
                    id="sub-industry-text-input"
                    name="sub_industry_custom"
                    className="form-control rounded-pill sub-industry-text-input"
                    placeholder="Sub Industry"
                    value={f.value}
                    onChange={f.onChange}
                  />
                )}
              />
            )}
          </div>
        </div>
        <div className="d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-standard"
            id="customButton"
            onClick={toggleCustomIndustry}
          >
            {useCustomIndustry ? 'Change Back to Selections' : 'Enter Custom Insights/Sub-Industry'}
          </button>
        </div>
      </div>
    </>
  );
}
