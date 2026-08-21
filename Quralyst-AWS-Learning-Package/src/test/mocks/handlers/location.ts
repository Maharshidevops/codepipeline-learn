// MSW handlers for LocationSelector â€” states by country code, cities by state name.
// Served from the bundled locationStatesCities.json (generated from config/locations.py).
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import statesCities from '@/test/mocks/locationStatesCities.json';

const countryStates = statesCities.countryStates as Record<string, string[]>;
const stateCities = statesCities.stateCities as Record<string, string[]>;

export const locationHandlers = [
  http.get(endpoints.locations.states, ({ request }) => {
    const country = new URL(request.url).searchParams.get('country') ?? '';
    return ok([...(countryStates[country] ?? [])].sort());
  }),
  http.get(endpoints.locations.cities, ({ request }) => {
    const state = new URL(request.url).searchParams.get('state') ?? '';
    return ok([...(stateCities[state] ?? [])].sort());
  }),
];
