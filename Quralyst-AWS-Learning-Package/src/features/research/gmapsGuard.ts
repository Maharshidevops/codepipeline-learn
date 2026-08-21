// Pre-submit guard for Google Maps search. GMaps searches Places city-by-city, so it needs a state
// or a city — a country-only run returns nothing and errors server-side (core/gmaps_source.py raises
// "Either state or city must be provided"). Both research composers (Target + Strategic) call this
// before submitting so the user gets a clear message instead of a silently-empty run.

export const GMAPS_LOCATION_MESSAGE =
  'Google Maps search needs a state or city. Add one under Geography, or turn off Google Maps to continue.';

/** True when GMaps is enabled but no geography row has a state or city (country-only won't work). */
export function gmapsNeedsLocation(
  enableGmaps: boolean,
  geography: ReadonlyArray<{ state?: string; city?: string }> | undefined,
): boolean {
  if (!enableGmaps) return false;
  const hasStateOrCity = (geography ?? []).some(
    (g) => Boolean(g.state && g.state.trim()) || Boolean(g.city && g.city.trim()),
  );
  return !hasStateOrCity;
}
