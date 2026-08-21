// Location service — backs LocationSelector. The continent→country tree is bundled reference data
// (src/data/locationData.json); states/cities are fetched from the backend and cached via TanStack
// Query so the multiple geo rows share one cache.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { LocationData } from '@/types';
import locationData from '@/data/locationData.json';

export interface LocationService {
  getLocationData(): LocationData;
  getStates(countryCode: string): Promise<string[]>;
  getCities(state: string): Promise<string[]>;
}

export const locationService: LocationService = {
  getLocationData: () => locationData as LocationData,
  getStates: (countryCode) =>
    http<string[]>(`${endpoints.locations.states}?country=${encodeURIComponent(countryCode)}`),
  getCities: (state) =>
    http<string[]>(`${endpoints.locations.cities}?state=${encodeURIComponent(state)}`),
};
