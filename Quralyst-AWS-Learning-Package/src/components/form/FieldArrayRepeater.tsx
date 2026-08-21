// FieldArrayRepeater — presentational repeater for dynamic row sets (geo rows, questions).
// Pairs with RHF useFieldArray: pass the field ids, render each row via children(index), and wire
// add/remove. Keeps the add button + per-row remove control consistent across forms.
import { type ReactNode } from 'react';
import './form-components.css';

export interface FieldArrayRepeaterProps {
  ids: string[]; // stable keys (e.g. RHF field.id values)
  renderRow: (index: number) => ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel?: string;
  minRows?: number;
  removeLabel?: (index: number) => string;
}

export default function FieldArrayRepeater({
  ids,
  renderRow,
  onAdd,
  onRemove,
  addLabel = '+ Add',
  minRows = 1,
  removeLabel = (i) => `Remove row ${i + 1}`,
}: FieldArrayRepeaterProps) {
  const canRemove = ids.length > minRows;
  return (
    <div>
      {ids.map((id, index) => (
        <div key={id} className="field-array-row">
          <div className="field-array-row-main">{renderRow(index)}</div>
          {canRemove && (
            <button
              type="button"
              className="btn-clear-all"
              aria-label={removeLabel(index)}
              title={removeLabel(index)}
              onClick={() => onRemove(index)}
            >
              &times;
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-standard" onClick={onAdd}>
        {addLabel}
      </button>
    </div>
  );
}
