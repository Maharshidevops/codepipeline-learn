// RadioGroup — controlled radio set. Renders .form-check rows (or .form-check-inline when inline).
// Used by process-preference pages; .radio_btn variant available via `radioClassName`.
export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  inline?: boolean;
  radioClassName?: string;
}

export default function RadioGroup({
  name,
  options,
  value,
  onChange,
  inline = false,
  radioClassName,
}: RadioGroupProps) {
  return (
    <>
      {options.map((opt) => {
        const id = `${name}-${opt.value}`;
        return (
          <div key={opt.value} className={`form-check${inline ? ' form-check-inline' : ''}`}>
            <input
              id={id}
              type="radio"
              name={name}
              className={['form-check-input', radioClassName].filter(Boolean).join(' ')}
              value={opt.value}
              checked={value === opt.value}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
            />
            <label className="form-check-label" htmlFor={id}>
              {opt.label}
            </label>
          </div>
        );
      })}
    </>
  );
}
