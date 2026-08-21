// Theme resolver (Phase 25) — turns a (possibly `auto`) ThemeId into the concrete palette that is
// actually painted, and lets callers subscribe to OS scheme changes while in `auto`.
import { getTheme, type ThemeId } from './themes';

const DARK_MQ = '(prefers-color-scheme: dark)';

/** Concrete palette to render: explicit themes return their own base; `auto` follows the OS. */
export function resolveTheme(id: ThemeId): 'light' | 'dark' {
  const base = getTheme(id).bsBase;
  if (base) return base;
  return window.matchMedia(DARK_MQ).matches ? 'dark' : 'light';
}

/** Subscribe to OS color-scheme flips (used only while theme === 'auto'). Returns an unsubscribe fn. */
export function onSystemSchemeChange(cb: () => void): () => void {
  const mql = window.matchMedia(DARK_MQ);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}
