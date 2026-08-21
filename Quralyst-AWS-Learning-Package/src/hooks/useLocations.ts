// useLocations — location data access for LocationSelector. The continent→country tree is bundled
// (synchronous); states + cities are fetched via TanStack Query so every geo row shares one cache
// (refetching states for the same country across rows is a cache hit, not a new request).
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { locationService } from '@/services/api';
import type { LocationData } from '@/types';
import type { SelectOption } from '@/components/ui/Select/Select';

export function useLocations() {
  const data: LocationData = useMemo(() => locationService.getLocationData(), []);

  // name → code map (states API keys by country code, but rows carry the display name).
  const nameToCode = useMemo(() => {
    const m = new Map<string, string>();
    Object.values(data.continentCountries).forEach((list) =>
      list.forEach((c) => m.set(c.name, c.code)),
    );
    return m;
  }, [data]);

  const continentOptions: SelectOption[] = useMemo(
    () => data.continents.map((c) => ({ value: c, label: c })),
    [data],
  );

  /** Countries for a continent (or all, suggested-first) as Select options keyed by name. */
  const countriesFor = useMemo(
    () =>
      (continent?: string): SelectOption[] => {
        const lists = continent
          ? [data.continentCountries[continent] ?? []]
          : Object.values(data.continentCountries);
        const opts = lists
          .flat()
          .map((c) => ({ value: c.name, label: c.name, suggested: c.isSuggested }));

        // Pin United States at the top of the country list
        const usIdx = opts.findIndex(
          (o) => o.value === 'United States' || o.value === 'US' || o.label === 'United States',
        );
        if (usIdx > 0) {
          const [us] = opts.splice(usIdx, 1);
          opts.unshift(us);
        }
        return opts;
      },
    [data],
  );

  const codeForCountry = (name: string): string | undefined => nameToCode.get(name);

  return { data, continentOptions, countriesFor, codeForCountry };
}

/** States for a country code (shared cache across rows). */
export function useStates(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['locations', 'states', countryCode],
    queryFn: () => locationService.getStates(countryCode!),
    enabled: !!countryCode,
    staleTime: Infinity,
  });
}

/** Cities for a state (shared cache across rows). */
export function useCities(state: string | undefined) {
  return useQuery({
    queryKey: ['locations', 'cities', state],
    queryFn: () => locationService.getCities(state!),
    enabled: !!state,
    staleTime: Infinity,
  });
}
