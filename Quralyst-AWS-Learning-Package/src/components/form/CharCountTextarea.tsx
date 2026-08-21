// CharCountTextarea — textarea with a live character counter (current / maxLength).
// Controlled: pass value + onChange. Uses .form-control (form-controls.css).
import { type TextareaHTMLAttributes } from 'react';
import './form-components.css';

export interface CharCountTextareaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange' | 'value'
> {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  label?: string;
  id?: string;
}

export default function CharCountTextarea({
  value,
  onChange,
  maxLength,
  label,
  id,
  className,
  ...rest
}: CharCountTextareaProps) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={['form-control', className].filter(Boolean).join(' ')}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      <div className="char-count-counter">
        {value.length}/{maxLength}
      </div>
    </div>
  );
}
