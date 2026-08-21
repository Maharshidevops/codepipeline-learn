// Live theme-token values for JS consumers that can't read CSS vars (e.g. ApexCharts options).
// Reads computed values off <html> and re-reads when the `data-theme` attribute mutates.
// Why a MutationObserver and not the uiStore: effects run bottom-up, so a store-keyed hook would
// read computed styles BEFORE AppLayout's applyTheme() writes the attribute; observing the
// attribute itself is ordering-proof and also covers the `auto`/OS-flip path (AppLayout re-applies
// the attribute there too). The attribute is always a resolved 'light' | 'dark'.
import { useEffect, useState } from 'react';
import { THEME_TOKEN_NAMES, type ThemeTokenName } from '@/styles/tokens';

export interface ThemeTokens {
  tokens: Record<ThemeTokenName, string>;
  isDark: boolean;
}

function read(): ThemeTokens {
  const el = document.documentElement;
  const computed = getComputedStyle(el);
  const tokens = {} as Record<ThemeTokenName, string>;
  for (const name of THEME_TOKEN_NAMES) {
    tokens[name] = computed.getPropertyValue(name).trim();
  }
  return { tokens, isDark: el.getAttribute('data-theme') === 'dark' };
}

export function useThemeTokens(): ThemeTokens {
  const [state, setState] = useState<ThemeTokens>(read);

  useEffect(() => {
    const observer = new MutationObserver(() => setState(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return state;
}
