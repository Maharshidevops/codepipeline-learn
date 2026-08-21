// Textarea — RHF-friendly multiline field (.form-control; textarea variant = 16px radius, 100px min).
import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  // a11y (Phase 17): associate the error text with the field + announce it.
  const errorId = error ? `${id ?? generatedId}-error` : undefined;
  const classes = ['form-control', error && 'is-invalid', className].filter(Boolean).join(' ');
  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
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

export default Textarea;
