// Defensive preset hydration (Tier A / A7 / F7). Applies a saved preset's `criteria` onto a
// React-Hook-Form wizard WITHOUT crashing when the preset is stale: only keys the current form
// already knows are set; unknown keys (fields renamed/removed since the preset was saved) are
// dropped and reported so the caller can toast a partial-load notice. Generic across all 3 wizards.
import type { TemplateCriteria } from '@/services/api';

type SetValue = (name: string, value: unknown, opts?: { shouldDirty?: boolean }) => void;
type GetValues = () => Record<string, unknown>;

export interface HydrateResult {
  applied: number;
  dropped: string[];
}

export function hydrateFromCriteria(
  criteria: TemplateCriteria | null | undefined,
  getValues: GetValues,
  setValue: SetValue,
): HydrateResult {
  const known = new Set(Object.keys(getValues() ?? {}));
  const dropped: string[] = [];
  let applied = 0;

  for (const [key, value] of Object.entries(criteria ?? {})) {
    if (known.has(key)) {
      setValue(key, value, { shouldDirty: true });
      applied += 1;
    } else {
      dropped.push(key);
    }
  }
  return { applied, dropped };
}
