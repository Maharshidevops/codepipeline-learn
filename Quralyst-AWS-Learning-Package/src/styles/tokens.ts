// Typed registry of theme-token NAMES for JS consumers (Phase 28). The CSS variables in
// core/colors.css remain the single source of truth for VALUES — JS reads them live via
// useThemeTokens() (getComputedStyle), so there is no hex mirror to drift.
// Extend this list as JS consumers (charts, canvas, etc.) need more tokens.
export const THEME_TOKEN_NAMES = [
  '--color-primary',
  '--color-secondary',
  '--color-text-primary',
  '--color-text-secondary',
  '--border-subtle',
  '--surface-raised',
] as const;

export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];
