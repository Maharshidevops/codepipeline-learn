import { useId, type ReactNode } from 'react';

// Discovery source row — Replit SourceToggle parity.
export function SourceToggle({
  label,
  description,
  enabled,
  onToggle,
  maxResults,
  onMaxChange,
  hint,
  disabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  maxResults?: string;
  onMaxChange?: (v: string) => void;
  hint?: string;
  disabled?: boolean;
}) {
  const maxInputId = useId();
  return (
    <div className={`lb-source-toggle${disabled ? ' is-disabled' : ''}`}>
      <div className="lb-source-toggle__row">
        <div className="min-w-0">
          <p className="lb-source-toggle__label">{label}</p>
          <p className="lb-source-toggle__desc">{description}</p>
        </div>
        <label className="lb-switch">
          <input
            type="checkbox"
            role="switch"
            checked={enabled}
            disabled={disabled}
            onChange={(e) => onToggle(e.target.checked)}
            aria-label={label}
          />
          <span className="lb-switch__track" />
        </label>
      </div>
      {enabled && onMaxChange && (
        <div className="lb-source-toggle__max">
          <label className="lb-field-label mb-0" htmlFor={maxInputId}>
            Max results
          </label>
          <input
            id={maxInputId}
            type="number"
            min={1}
            className="form-control form-control-sm"
            style={{ width: '7rem' }}
            value={maxResults ?? ''}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder="e.g. 50"
          />
        </div>
      )}
      {enabled && hint && <p className="lb-fineprint mt-1 mb-0">{hint}</p>}
    </div>
  );
}

export function OptionToggle({
  label,
  description,
  enabled,
  onToggle,
  disabled,
  details,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
  details?: ReactNode;
}) {
  return (
    <div className={`lb-option-toggle${disabled ? ' is-disabled' : ''}`}>
      <div className="lb-option-toggle__row">
        <div className="min-w-0">
          <p className="lb-source-toggle__label">{label}</p>
          {description ? <p className="lb-source-toggle__desc">{description}</p> : null}
        </div>
        <label className="lb-switch">
          <input
            type="checkbox"
            role="switch"
            checked={enabled}
            disabled={disabled}
            onChange={(e) => onToggle(e.target.checked)}
            aria-label={label}
          />
          <span className="lb-switch__track" />
        </label>
      </div>
      {enabled && details}
    </div>
  );
}
