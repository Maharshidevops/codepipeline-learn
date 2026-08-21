// Theme registry — single source of truth for the theming system (Phase 25).
// Everything else derives from this array: the ThemeId type, persistence validation, the Settings
// Appearance control, and the Bootstrap base. Adding a future theme = append one entry here + add one
// `:root[data-theme="<id>"]` block in src/styles/core/colors.css. No other code changes.
//
// NOTE: the no-FOUC inline script in index.html cannot import this file, so it carries a minimal
// inline copy of the id → resolved-base logic. Keep the two in sync when adding a theme.

export interface ThemeDef {
  id: string;
  /** Shown in the Settings Appearance control. */
  label: string;
  /** bootstrap-icons class. */
  icon: string;
  /** Drives Bootstrap's data-bs-theme; `null` = resolve from the OS (the "System / Auto" theme). */
  bsBase: 'light' | 'dark' | null;
}

export const THEMES = [
  { id: 'light', label: 'Light', icon: 'bi-sun', bsBase: 'light' },
  { id: 'dark', label: 'Dark', icon: 'bi-moon-stars', bsBase: 'dark' },
  { id: 'auto', label: 'System', icon: 'bi-circle-half', bsBase: null },
] as const satisfies readonly ThemeDef[];

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'light';

export const getTheme = (id: ThemeId): ThemeDef => THEMES.find((t) => t.id === id)!;

export const isThemeId = (v: unknown): v is ThemeId =>
  typeof v === 'string' && THEMES.some((t) => t.id === v);
