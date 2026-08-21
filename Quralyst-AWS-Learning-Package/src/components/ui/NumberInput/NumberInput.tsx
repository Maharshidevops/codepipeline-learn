// NumberInput — RHF-friendly numeric field (type=number, .form-control).
import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  pill?: boolean;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { label, error, pill, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  // a11y (Phase 17): associate the error text with the input + announce it.
  const errorId = error ? `${id ?? generatedId}-error` : undefined;
  const classes = ['form-control', pill && 'rounded-pill', error && 'is-invalid', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type="number"
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

export default NumberInput;
