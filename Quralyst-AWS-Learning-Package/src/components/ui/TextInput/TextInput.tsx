// TextInput — RHF-friendly text field. Spread {...register('name')} or pass value/onChange.
// Uses .form-control (form-controls.css); `pill` → .rounded-pill (50px). Optional label/error.
import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  pill?: boolean;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, pill, className, id, type = 'text', ...rest },
  ref,
) {
  const generatedId = useId();
  // a11y: fall back to a generated id so the <label> is always associated with the <input>
  // even when the caller passes only `label` (label-only fields were previously unlabelled).
  const inputId = id ?? generatedId;
  // a11y (Phase 17): associate the error text with the input + announce it.
  const errorId = error ? `${inputId}-error` : undefined;
  const classes = [
    'form-control',
    pill && 'rounded-pill',
    error && 'is-invalid',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={classes}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...rest}
      />
      {error && (
        <div className="invalid-feedback" id={errorId} role="alert">
          {error}
        </div>
      )}
    </div>
  );
});

export default TextInput;
