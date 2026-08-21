// LocationSelector — React rewrite of location-selector.js (828 ln). Renders the verbatim
// #geo-fields-list / .geo-fields-set markup and reproduces the cascade: continent → country
// (filtered by continent, suggested-first) → state (dropdown populated from the states API once a
// country is chosen) → city (text + custom autocomplete suggestions from the cities API). Add/remove
// rows via #add-geo-btn + the clear button. Controlled: value = LocationGroup[], onChange(rows).
//
// The GMaps "state required" rule is enforced by the consuming page's Zod schema (not here) — this
// component only surfaces the fields. Rows share cached states/cities via useLocations.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Select from '@/components/ui/Select/Select';
import { useLocations, useStates, useCities } from '@/hooks/useLocations';
import type { LocationGroup } from '@/types';

export interface LocationSelectorProps {
  value: LocationGroup[];
  onChange: (rows: LocationGroup[]) => void;
  /** When true (single HQ location, e.g. FV), hides Add/city; still shows continent → country → state. */
  singleRow?: boolean;
}

const EMPTY: LocationGroup = { continent: '', country: '', state: '', city: '' };

export default function LocationSelector({ value, onChange, singleRow }: LocationSelectorProps) {
  const rows = value.length ? value : [EMPTY];

  const update = (index: number, patch: Partial<LocationGroup>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const addRow = () => onChange([...rows, { ...EMPTY }]);
  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const clearAll = () => onChange([{ ...EMPTY }]);

  return (
    <>
      <div id="geo-fields-list" className="mb-2">
        {rows.map((row, i) => (
          <LocationRow
            key={i}
            row={row}
            index={i}
            singleRow={singleRow}
            canRemove={rows.length > 1}
            onChange={(patch) => update(i, patch)}
            onRemove={() => removeRow(i)}
          />
        ))}
      </div>
      {!singleRow && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <button
            type="button"
            id="add-geo-btn"
            className="btn btn-standard btn-sm rounded-pill px-3"
            onClick={addRow}
          >
            <i className="bi bi-plus" aria-hidden="true" /> Add location
          </button>
          <button
            type="button"
            className="btn btn-clear-all"
            id="geo_criteria_clear_btn"
            title="Clear all inputs"
            aria-label="Clear all inputs"
            onClick={clearAll}
          >
            <i className="bi bi-backspace" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

interface LocationRowProps {
  row: LocationGroup;
  index: number;
  singleRow?: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<LocationGroup>) => void;
  onRemove: () => void;
}

function LocationRow({ row, singleRow, canRemove, onChange, onRemove }: LocationRowProps) {
  const { continentOptions, countriesFor, codeForCountry } = useLocations();
  const countryCode = row.country ? codeForCountry(row.country) : undefined;
  const { data: states = [] } = useStates(countryCode);
  const { data: cities = [] } = useCities(row.state || undefined);

  const countryOptions = countriesFor(row.continent || undefined);
  const stateOptions = states.map((s) => ({ value: s, label: s }));

  // Cascade resets: continent change clears country/state/city; country clears state/city; etc.
  const setContinent = (continent: string) =>
    onChange({ continent, country: '', state: '', city: '' });
  const setCountry = (country: string) => onChange({ country, state: '', city: '' });
  const setState = (state: string) => onChange({ state, city: '' });

  // singleRow: continent + country + state (no city). Multi-row: four cols including city.
  const colClass = singleRow ? 'col-md-4 mb-2 mb-md-0' : 'col-md-3 mb-2 mb-md-0';

  return (
    <div className="row mb-2 geo-fields-set">
      <div className={colClass}>
        <Select
          value={row.continent ?? ''}
          onChange={setContinent}
          options={continentOptions}
          placeholder="Continent"
          buttonClassName="rounded-pill"
          aria-label="Continent"
        />
      </div>
      <div className={colClass}>
        <Select
          value={row.country ?? ''}
          onChange={setCountry}
          options={countryOptions}
          placeholder="Country"
          buttonClassName="rounded-pill"
          aria-label="Country"
        />
      </div>
      <div className={colClass}>
        <Select
          value={row.state ?? ''}
          onChange={setState}
          options={stateOptions}
          placeholder="State"
          disabled={!row.country}
          buttonClassName="rounded-pill"
          aria-label="State"
        />
      </div>
      {!singleRow && (
        <div className="col-md-3 d-flex gap-2 align-items-center">
          <CityInput
            value={row.city ?? ''}
            cities={cities}
            disabled={!row.state}
            onChange={(city) => onChange({ city })}
          />
          {canRemove && (
            <button
              type="button"
              className="btn btn-clear-all"
              title="Remove location"
              aria-label="Remove location"
              onClick={onRemove}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface CityInputProps {
  value: string;
  cities: string[];
  disabled?: boolean;
  onChange: (city: string) => void;
}

/** Free-form city text input with custom suggestions (parity with location-selector.js). */
function CityInput({ value, cities, disabled, onChange }: CityInputProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const filtered = useMemo(() => {
    const term = value.trim().toLowerCase();
    if (!term) return cities;
    return cities.filter((c) => c.toLowerCase().includes(term));
  }, [cities, value]);

  const showList = open && !disabled && filtered.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  // Close suggestions when the state is cleared (cascade reset).
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div
      className="city-input-wrapper"
      ref={wrapperRef}
      role="combobox"
      aria-expanded={showList}
      aria-haspopup="listbox"
      aria-controls={listboxId}
    >
      <input
        type="text"
        className="form-control rounded-pill location-text-input"
        name="city[]"
        placeholder="City"
        aria-label="City"
        aria-autocomplete="list"
        aria-controls={listboxId}
        disabled={disabled}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
      />
      <div
        id={listboxId}
        className={`city-suggestions custom-dropdown-content${showList ? ' show' : ''}`}
        role="listbox"
        aria-label="City suggestions"
      >
        {filtered.map((city) => (
          <button
            key={city}
            type="button"
            role="option"
            aria-selected={city === value}
            className={`custom-dropdown-item city-suggestion-item${
              city === value ? ' selected' : ''
            }`}
            data-value={city}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(city);
              setOpen(false);
            }}
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}
