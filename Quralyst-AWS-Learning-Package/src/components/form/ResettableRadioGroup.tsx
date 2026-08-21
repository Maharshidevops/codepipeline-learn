// ResettableRadioGroup — a RadioGroup with an inline .btn-reset-inline circle that clears the
// selection (sets value to ''). Used on the process pages next to radio rows.
import RadioGroup, { type RadioOption } from '@/components/ui/RadioGroup/RadioGroup';
import './form-components.css';

export interface ResettableRadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  inline?: boolean;
  radioClassName?: string;
  resetTitle?: string;
}

export default function ResettableRadioGroup({
  name,
  options,
  value,
  onChange,
  inline = true,
  radioClassName,
  resetTitle = 'Clear selection',
}: ResettableRadioGroupProps) {
  return (
    <div className="resettable-radio-row">
      <RadioGroup
        name={name}
        options={options}
        value={value}
        onChange={onChange}
        inline={inline}
        radioClassName={radioClassName}
      />
      <button
        type="button"
        className="btn-reset-inline"
        title={resetTitle}
        aria-label={resetTitle}
        disabled={!value}
        onClick={() => onChange('')}
      >
        ↺
      </button>
    </div>
  );
}
