// Resolves the active ThemeId (which may be `auto`) to the concrete 'light' | 'dark' palette that is
// actually painted, and re-renders when the user switches themes or — while on `auto` — when the OS
// scheme flips. Used by JS consumers that can't read CSS vars (e.g. ApexCharts color options).
import { useEffect, useState } from 'react';
import { useUiStore } from '@/store/uiStore';
import { resolveTheme, onSystemSchemeChange } from '@/styles/themeResolver';

export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useUiStore((s) => s.theme);
  const [resolved, setResolved] = useState(() => resolveTheme(theme));

  useEffect(() => {
    setResolved(resolveTheme(theme));
    if (theme !== 'auto') return;
    // Only `auto` follows the OS — subscribe so a system flip re-resolves the palette.
    return onSystemSchemeChange(() => setResolved(resolveTheme('auto')));
  }, [theme]);

  return resolved;
}
