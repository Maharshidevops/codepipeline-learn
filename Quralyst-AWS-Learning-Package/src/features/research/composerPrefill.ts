// Composer prefill handoff (Tier A / A12 / F11). The mandate composer / Research Home parses a
// document into a MandatePrefill, stashes it in sessionStorage, and navigates to a wizard; the
// wizard reads+clears it on mount and hydrates its form. Only the structured prefill is stored —
// never the raw CIM text. A plain-text "seed" is also supported for chip / quick-launch flows.
// Edit & Re-run also stashes RerunMeta so Target/Strategic can show the banner + mode dialog.
import { useEffect, useRef, useState } from 'react';
import { mandateService, type MandatePrefill, type MandateIntent } from '@/services/api';

const KEY = 'quralyst:composerPrefill';
const SEED_KEY = 'quralyst:composerSeed';
const RERUN_KEY = 'quralyst:rerunMeta';

export type RerunMeta = {
  sourceProcessId: string;
  version?: number;
  title?: string;
};

export function storeComposerPrefill(prefill: MandatePrefill): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(prefill));
    sessionStorage.removeItem(SEED_KEY);
  } catch {
    /* sessionStorage unavailable (private mode / quota) — prefill just won't carry over */
  }
}

/** Stash a plain-text prompt so the destination wizard can seed its description field. */
export function storeComposerSeed(seed: string): void {
  try {
    sessionStorage.removeItem(KEY);
    if (seed.trim()) sessionStorage.setItem(SEED_KEY, seed.trim());
    else sessionStorage.removeItem(SEED_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function storeRerunMeta(meta: RerunMeta): void {
  try {
    sessionStorage.setItem(RERUN_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

/** Read rerun meta without clearing — used while the composer is open. */
export function peekRerunMeta(): RerunMeta | null {
  try {
    const raw = sessionStorage.getItem(RERUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RerunMeta;
    if (!parsed?.sourceProcessId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRerunMeta(): void {
  try {
    sessionStorage.removeItem(RERUN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearComposerHandoff(): void {
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(SEED_KEY);
    sessionStorage.removeItem(RERUN_KEY);
  } catch {
    /* ignore */
  }
}

function seedAsPrefill(seed: string): MandatePrefill {
  return {
    business_queries: [seed],
    industry: '',
    sub_industry: '',
    geography: { countries: [], states: [], cities: [] },
    revenue_min: null,
    revenue_max: null,
    ebitda_min: null,
    ebitda_max: null,
    employees_min: null,
    employees_max: null,
    description: seed,
    ideal_buyer_types: [],
  };
}

/** Read and REMOVE the stored prefill (one-shot). Falls back to a plain-text seed. */
export function takeComposerPrefill(): MandatePrefill | null {
  let raw: string | null = null;
  let seed: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    seed = sessionStorage.getItem(SEED_KEY);
    if (raw) sessionStorage.removeItem(KEY);
    if (seed) sessionStorage.removeItem(SEED_KEY);
  } catch {
    return null;
  }
  if (raw) {
    try {
      return JSON.parse(raw) as MandatePrefill;
    } catch {
      /* fall through to seed */
    }
  }
  if (seed && seed.trim()) return seedAsPrefill(seed.trim());
  return null;
}

type SetValue = (name: string, value: unknown, opts?: { shouldDirty?: boolean }) => void;
type GetValues = () => Record<string, unknown>;

/** Apply a mandate prefill onto a Target/Strategic/FV wizard form. Only touches fields the form
 * actually has (guarded via getValues keys). Returns the count of fields set. */
export function applyMandatePrefill(
  prefill: MandatePrefill,
  getValues: GetValues,
  setValue: SetValue,
): number {
  const known = new Set(Object.keys(getValues() ?? {}));
  let applied = 0;
  const set = (name: string, value: unknown) => {
    setValue(name, value, { shouldDirty: true });
    applied += 1;
  };

  const bq = prefill.business_queries?.length
    ? prefill.business_queries.join('\n\n')
    : prefill.description;
  if (bq && known.has('businessQuery')) set('businessQuery.0.value', bq);
  // Financial Verticals uses targetDescription instead of businessQuery.
  if (bq && known.has('targetDescription')) set('targetDescription', bq);

  if (prefill.industry && known.has('industry')) set('industry', prefill.industry);
  if (prefill.sub_industry && known.has('subIndustry')) set('subIndustry', prefill.sub_industry);

  if (known.has('size')) {
    if (prefill.revenue_min != null) set('size.minRevenue', String(prefill.revenue_min));
    if (prefill.revenue_max != null) set('size.maxRevenue', String(prefill.revenue_max));
    if (prefill.employees_min != null) set('size.minEmployees', String(prefill.employees_min));
    if (prefill.employees_max != null) set('size.maxEmployees', String(prefill.employees_max));
  }

  // FV flat size fields
  if (prefill.revenue_min != null && known.has('revenueMin'))
    set('revenueMin', String(prefill.revenue_min));
  if (prefill.revenue_max != null && known.has('revenueMax'))
    set('revenueMax', String(prefill.revenue_max));
  if (prefill.ebitda_min != null && known.has('ebitdaMin'))
    set('ebitdaMin', String(prefill.ebitda_min));
  if (prefill.ebitda_max != null && known.has('ebitdaMax'))
    set('ebitdaMax', String(prefill.ebitda_max));

  const geo = prefill.geography;
  if (geo && known.has('geography')) {
    const base = geo.countries?.length ? geo.countries : [''];
    const groups = base
      .map((country, i) => ({
        country: country || undefined,
        state: geo.states?.[i] ?? geo.states?.[0] ?? undefined,
        city: geo.cities?.[i] ?? geo.cities?.[0] ?? undefined,
      }))
      .filter((g) => g.country || g.state || g.city);
    if (groups.length) set('geography', groups);
  }
  // FV uses flat country/state
  if (geo?.countries?.[0] && known.has('country')) set('country', geo.countries[0]);
  if (geo?.states?.[0] && known.has('state')) set('state', geo.states[0]);

  return applied;
}

/**
 * Profile a single example-company URL and fold its criteria into a composer form.
 *
 * "Find me buyers/targets like this one": the backend fetches + AI-profiles the URL under the given
 * intent (`example-buyer-profile` on a buyer list, `example-target-profile` on a target list — same
 * UI, different prompt) and returns a MandatePrefill, which `applyMandatePrefill` writes onto the
 * form (overwriting — the example wins). Returns the number of fields applied. Throws if the URL
 * can't be profiled, so the caller can surface the failure and mark the chip.
 */
export async function profileExampleUrl(
  url: string,
  intent: MandateIntent,
  getValues: GetValues,
  setValue: SetValue,
): Promise<number> {
  const prefill = await mandateService.parseMandate({ urls: [url], intent });
  return applyMandatePrefill(prefill, getValues, setValue);
}

/** One-shot hook: on mount, consume any stored prefill and hand it to `onPrefill`. */
export function useComposerPrefill(onPrefill: (prefill: MandatePrefill) => void): void {
  const ran = useRef(false);
  const cb = useRef(onPrefill);
  cb.current = onPrefill;
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const prefill = takeComposerPrefill();
    if (prefill) cb.current(prefill);
  }, []);
}

/** Hold Edit & Re-run meta for the lifetime of the composer page (cleared on successful submit). */
export function useRerunMeta(): RerunMeta | null {
  const [meta] = useState<RerunMeta | null>(() => peekRerunMeta());
  return meta;
}
