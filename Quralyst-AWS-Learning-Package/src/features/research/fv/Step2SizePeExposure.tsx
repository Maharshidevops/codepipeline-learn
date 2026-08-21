// FV Step 2 — Size preference & PE level of exposure. Mirrors financial_verticals.html step-2:
//  • Size Preference (deep-navy card): revenue / EBITDA / equity check / enterprise value Min+Max.
//  • PE level of exposure (white card): 3 pill checkboxes (current/past portfolio, listed interest);
//    at least one is required (inline #pe-exposure-error surfaced via the peError prop).
//  • "Request a contact at the PE firm" pill checkbox (request_pe_contact).
import { Controller, type Control } from 'react-hook-form';
import type { FinancialVerticalsForm } from '@/types';

export interface Step2SizePeExposureProps {
  control: Control<FinancialVerticalsForm>;
  peError: boolean;
}

interface SizeRowProps {
  label: string;
  control: Control<FinancialVerticalsForm>;
  minName: keyof FinancialVerticalsForm;
  maxName: keyof FinancialVerticalsForm;
}

function SizeRow({ label, control, minName, maxName }: SizeRowProps) {
  return (
    <div className="row g-2 align-items-center mb-3">
      <div className="col-md-4">
        <label className="form-label text-white mb-0">{label}</label>
      </div>
      <div className="col-md-3 me-5">
        <Controller
          control={control}
          name={minName}
          render={({ field: f }) => (
            <input
              className="form-control rounded-pill"
              type="text"
              placeholder="Min"
              value={(f.value as string) ?? ''}
              onChange={f.onChange}
            />
          )}
        />
      </div>
      <div className="col-md-3">
        <Controller
          control={control}
          name={maxName}
          render={({ field: f }) => (
            <input
              className="form-control rounded-pill"
              type="text"
              placeholder="Max"
              value={(f.value as string) ?? ''}
              onChange={f.onChange}
            />
          )}
        />
      </div>
    </div>
  );
}

interface PeCheckboxProps {
  control: Control<FinancialVerticalsForm>;
  name: 'currentPortfolio' | 'pastPortfolio' | 'listedInterest';
  id: string;
  label: string;
}

function PeCheckbox({ control, name, id, label }: PeCheckboxProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => (
        <div className={`pe-checkbox-container${f.value ? ' checked' : ''}`}>
          <input
            className="form-check-input"
            type="checkbox"
            id={id}
            checked={!!f.value}
            onChange={(e) => f.onChange(e.target.checked)}
          />
          <label className="form-check-label" htmlFor={id}>
            {label}
          </label>
        </div>
      )}
    />
  );
}

export default function Step2SizePeExposure({ control, peError }: Step2SizePeExposureProps) {
  return (
    <>
      {/* Size Preference — Deep Blue card */}
      <div className="criteria-card criteria-card--deep size-preference-card mb-4 p-4">
        <div className="mb-3">
          <h4 className="fw-bold mb-1">Size Preference</h4>
          <p className="text-white-50 small mb-3">
            Please provide your preferred size criteria for PE firm
          </p>
        </div>

        <SizeRow label="Revenue:" control={control} minName="revenueMin" maxName="revenueMax" />
        <SizeRow label="EBITDA:" control={control} minName="ebitdaMin" maxName="ebitdaMax" />
        <SizeRow
          label="Equity check:"
          control={control}
          minName="equityCheckMin"
          maxName="equityCheckMax"
        />
        <SizeRow
          label="Enterprise value:"
          control={control}
          minName="enterpriseValueMin"
          maxName="enterpriseValueMax"
        />
      </div>

      {/* PE level of exposure — White card */}
      <div className="criteria-card criteria-card--white mb-4 p-4">
        <div className="mb-3">
          <h4 className="fw-bold mb-1">PE level of exposure</h4>
        </div>

        <div className="mb-3">
          <PeCheckbox
            control={control}
            name="currentPortfolio"
            id="current_portfolio"
            label="Should have current similar portfolio company"
          />
        </div>
        <div className="mb-3">
          <PeCheckbox
            control={control}
            name="pastPortfolio"
            id="past_portfolio"
            label="Should have past similar portfolio company"
          />
        </div>
        <div className="mb-3">
          <PeCheckbox
            control={control}
            name="listedInterest"
            id="listed_interest"
            label="Should have listed interest in relevant Industry"
          />
        </div>

        {/* Inline Error Message */}
        <div
          id="pe-exposure-error"
          className={`pe-exposure-error-message${peError ? ' show' : ''}`}
        >
          <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
          <span id="pe-exposure-error-text">
            At least one PE level of exposure must be selected.
          </span>
        </div>
      </div>

      {/* Request a contact at the PE firm */}
      <div className="mb-4">
        <Controller
          control={control}
          name="requestPeContact"
          render={({ field: f }) => (
            <div className={`request-contact-container${f.value ? ' checked' : ''}`}>
              <input
                className="form-check-input"
                type="checkbox"
                id="request_pe_contact"
                checked={!!f.value}
                onChange={(e) => f.onChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="request_pe_contact">
                Request a contact at the PE firm
              </label>
            </div>
          )}
        />
      </div>
    </>
  );
}
