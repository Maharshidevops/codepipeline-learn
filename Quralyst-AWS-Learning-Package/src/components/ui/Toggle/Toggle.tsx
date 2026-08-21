// Toggle — Bootstrap form-switch checkbox styled by core/forms.css (.form-switch .form-check-input:
// 3rem×1.5rem, unchecked #848B98, checked #282561, disabled opacity .4). RHF-friendly (forwardRef).
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface ToggleProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { label, id, className, ...rest },
  ref,
) {
  return (
    <div className="form-check form-switch">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        role="switch"
        className={['form-check-input', className].filter(Boolean).join(' ')}
        {...rest}
      />
      {label && (
        <label className="form-check-label" htmlFor={id}>
          {label}
        </label>
      )}
    </div>
  );
});

export default Toggle;
