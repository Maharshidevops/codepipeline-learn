// Additional-search toggle that reveals a max-companies NumberInput when enabled.
// Shared by Target List and Strategic / Buyer List Step 2 (mirrors legacy form-switch UX).
import { Controller, type Control } from 'react-hook-form';
import { NumberInput } from '@/components/ui';
import type { AdditionalSearchOptions } from '@/types';
import { ApiKeyDisabledNote } from './ApiKeyNotices';

export type AdditionalSearchForm = { additionalSearch: AdditionalSearchOptions };

export type SearchEnableName =
  | 'additionalSearch.enableApolloSearch'
  | 'additionalSearch.enableGmapsSearch'
  | 'additionalSearch.enableCoresignalSearch'
  | 'additionalSearch.enableLinkedinSearch'
  | 'additionalSearch.enableFindallSearch';

export type SearchCountName =
  | 'additionalSearch.apolloMaxResults'
  | 'additionalSearch.gmapsMaxResults'
  | 'additionalSearch.coresignalMaxResults'
  | 'additionalSearch.linkedinMaxResults'
  | 'additionalSearch.findallMaxResults';

export interface AdditionalSearchOptionProps<T extends AdditionalSearchForm> {
  control: Control<T>;
  enableName: SearchEnableName;
  countName: SearchCountName;
  enableId: string;
  countId: string;
  countRowId?: string;
  sectionId?: string;
  intro: string;
  title: string;
  desc: string;
  countLabel: string;
  placeholder: string;
  max: number;
  disabled?: boolean;
  reason?: string;
}

export function AdditionalSearchOption<T extends AdditionalSearchForm>({
  control,
  enableName,
  countName,
  enableId,
  countId,
  countRowId,
  sectionId,
  intro,
  title,
  desc,
  countLabel,
  placeholder,
  max,
  disabled = false,
  reason = '',
}: AdditionalSearchOptionProps<T>) {
  return (
    <div id={sectionId} className="mt-3" style={disabled ? { opacity: 0.5 } : undefined}>
      <label className="form-label">{intro}</label>
      <Controller
        control={control}
        name={enableName as never}
        render={({ field: enableField }) => (
          <>
            <div className="form-check form-switch mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id={enableId}
                checked={enableField.value}
                disabled={disabled}
                onChange={(e) => enableField.onChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor={enableId}>
                <strong>{title}</strong>
                <div className="text-muted small">{desc}</div>
              </label>
            </div>
            <ApiKeyDisabledNote reason={reason} />
            {enableField.value && (
              <div className="row align-items-center" id={countRowId ?? `${enableId}_count_row`}>
                <div className="col-md-6">
                  <Controller
                    control={control}
                    name={countName as never}
                    render={({ field: f }) => (
                      <NumberInput
                        pill
                        id={countId}
                        label={countLabel}
                        min={1}
                        max={max}
                        placeholder={placeholder}
                        value={f.value ?? ''}
                        onChange={f.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            )}
          </>
        )}
      />
    </div>
  );
}

/** Review-summary helper: "Apollo (max 50), Google Maps (max 100)". */
export function formatAdditionalSearchSummary(search: AdditionalSearchOptions): string {
  const parts: string[] = [];
  const add = (label: string, enabled: boolean, max?: string) => {
    if (!enabled) return;
    const trimmed = max?.trim();
    parts.push(trimmed ? `${label} (max ${trimmed})` : label);
  };
  add('Apollo', search.enableApolloSearch, search.apolloMaxResults);
  add('Google Maps', search.enableGmapsSearch, search.gmapsMaxResults);
  add('Coresignal', search.enableCoresignalSearch, search.coresignalMaxResults);
  add('LinkedIn', search.enableLinkedinSearch, search.linkedinMaxResults);
  add('FindAll', search.enableFindallSearch, search.findallMaxResults);
  return parts.join(', ');
}
