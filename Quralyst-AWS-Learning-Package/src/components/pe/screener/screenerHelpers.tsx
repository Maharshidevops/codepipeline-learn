// Shared presentational helpers for the PE Screener tabs (F29.2).
// SelectFilter is a compact combobox (Q20 h-9) with its own markup/CSS under
// `.pes-dd` — deliberately not using global `.custom-dropdown` (58px pills).
import { useEffect, useId, useRef, useState } from 'react';

export interface FilterChip {
  key: string;
  label: string;
}

/** Removable active-filter chips. Renders nothing when empty. */
export function FilterChips({
  chips,
  onRemove,
}: {
  chips: FilterChip[];
  onRemove: (key: string) => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="d-flex flex-wrap gap-2 mb-3" aria-label="Active filters">
      {chips.map((c) => (
        <span key={c.key} className="pes-chip-filter">
          {c.label}
          <button
            type="button"
            className="pes-chip-filter__x"
            aria-label={`Remove filter ${c.label}`}
            onClick={() => onRemove(c.key)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

/**
 * Compact filter select — listbox combobox matching Q20 h-9 height.
 * Preserves role=combobox / role=option for Screener tests.
 */
export function SelectFilter({
  value,
  onChange,
  options,
  placeholder = 'Any',
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const allOptions = [{ value: '', label: placeholder }, ...options];
  const selected = allOptions.find((o) => o.value === value) ?? allOptions[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  function toggle() {
    setOpen((v) => !v);
  }

  return (
    <div
      ref={rootRef}
      className={`pes-dd${open ? ' is-open' : ''}`}
      role="combobox"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="pes-dd__trigger">
        <span className="pes-dd__value">{selected.label}</span>
        <i className="bi bi-chevron-down pes-dd__chevron" aria-hidden="true" />
      </div>
      {open && (
        <ul id={listId} className="pes-dd__menu" role="listbox" aria-label={ariaLabel}>
          {allOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value || '__any'} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`pes-dd__option${isSelected ? ' is-selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/** yes|no exists-filter select (Has Date? / Has Website? / …). */
export function YesNoFilter({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  return (
    <SelectFilter
      value={value}
      onChange={onChange}
      options={YES_NO_OPTIONS}
      ariaLabel={ariaLabel}
    />
  );
}
