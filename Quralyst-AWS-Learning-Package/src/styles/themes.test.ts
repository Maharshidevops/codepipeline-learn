// Theme registry (Phase 25): unique ids, valid bases, and the isThemeId guard.
import { describe, it, expect } from 'vitest';
import { THEMES, DEFAULT_THEME, getTheme, isThemeId } from './themes';

describe('theme registry', () => {
  it('has unique theme ids', () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every theme has a valid bsBase (light | dark | null)', () => {
    for (const t of THEMES) {
      expect([null, 'light', 'dark']).toContain(t.bsBase);
      expect(t.label).toBeTruthy();
      expect(t.icon).toMatch(/^bi-/);
    }
  });

  it('DEFAULT_THEME is a registered id', () => {
    expect(isThemeId(DEFAULT_THEME)).toBe(true);
  });

  it('isThemeId accepts registered ids and rejects anything else', () => {
    expect(isThemeId('light')).toBe(true);
    expect(isThemeId('dark')).toBe(true);
    expect(isThemeId('auto')).toBe(true);
    expect(isThemeId('sepia')).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
    expect(isThemeId(42)).toBe(false);
  });

  it('getTheme returns the matching definition', () => {
    expect(getTheme('dark').label).toBe('Dark');
    expect(getTheme('auto').bsBase).toBeNull();
  });
});
