// Typed accessor over profileData.json (extracted verbatim from Backup/config/{constants,locations}.py
// + profile.py MOBILE_PLACEHOLDERS). Used by ProfilePage for the country→timezone/prefix cascade.
import raw from './profileData.json';

export interface Country {
  code: string;
  name: string;
}
/** [ianaValue, label] tuples per country code. */
export type TimezoneOption = [string, string];

interface ProfileData {
  countries: Country[];
  phonePrefixes: Record<string, string>;
  countryTimezones: Record<string, TimezoneOption[]>;
  mobilePlaceholders: Record<string, string>;
}

const data = raw as unknown as ProfileData;

export const countries = data.countries;
export const phonePrefixes = data.phonePrefixes;
export const countryTimezones = data.countryTimezones;
export const mobilePlaceholders = data.mobilePlaceholders;
