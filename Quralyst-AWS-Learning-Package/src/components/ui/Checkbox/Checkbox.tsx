// Checkbox — .form-check + .form-check-input[type=checkbox] (form-controls.css; 18px, accent #282561).
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id, className, ...rest },
  ref,
) {
  return (
    <div className="form-check">
      <input
        ref={ref}
        id={id}
        type="checkbox"
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

export default Checkbox;
