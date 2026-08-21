// UI/chrome store (Zustand) — holds the desktop sidebar collapse state (Phase 21) + the active theme
// (Phase 25). `sidebarManual` records whether the user explicitly chose a state via the toggle: a manual
// choice is persisted to localStorage and always overrides the responsive auto-collapse (≈992–1200px).
import { create } from 'zustand';
import { THEMES, DEFAULT_THEME, isThemeId, type ThemeId } from '@/styles/themes';

const STORAGE_KEY = 'quralyst.sidebarCollapsed';
const STORAGE_KEY_THEME = 'quralyst.theme';

function loadPersisted(): { collapsed: boolean; manual: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'true' || raw === 'false') return { collapsed: raw === 'true', manual: true };
  } catch {
    /* localStorage unavailable (private mode / SSR) — fall back to the responsive default. */
  }
  return { collapsed: false, manual: false };
}

function persist(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    /* ignore */
  }
}

// Theme persistence (Phase 25) — mirrors the sidebar pattern. Default light; an explicit pick wins.
function loadPersistedTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_THEME);
    if (isThemeId(raw)) return raw;
  } catch {
    /* localStorage unavailable — fall back to the default. */
  }
  return DEFAULT_THEME;
}

function persistTheme(id: ThemeId) {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, id);
  } catch {
    /* ignore */
  }
}

interface UiStore {
  sidebarCollapsed: boolean;
  /** True once the user has explicitly toggled — this choice persists and wins over auto-collapse. */
  sidebarManual: boolean;
  /** User-initiated toggle (persists + marks manual). */
  toggleSidebar: () => void;
  /** Programmatic set; `manual` defaults to false (responsive default — does not persist or lock). */
  setSidebarCollapsed: (collapsed: boolean, manual?: boolean) => void;

  /** Active theme id from the registry (`'light' | 'dark' | 'auto'`). */
  theme: ThemeId;
  /** Explicit pick (persists). */
  setTheme: (id: ThemeId) => void;
  /** Advance to the next registry theme, wrapping — works for 2 or N themes (persists). */
  cycleTheme: () => void;
}

export const useUiStore = create<UiStore>((set) => {
  const init = loadPersisted();
  return {
    sidebarCollapsed: init.collapsed,
    sidebarManual: init.manual,
    toggleSidebar: () =>
      set((s) => {
        const next = !s.sidebarCollapsed;
        persist(next);
        return { sidebarCollapsed: next, sidebarManual: true };
      }),
    setSidebarCollapsed: (collapsed, manual = false) =>
      set((s) => {
        if (manual) persist(collapsed);
        return { sidebarCollapsed: collapsed, sidebarManual: manual || s.sidebarManual };
      }),

    theme: loadPersistedTheme(),
    setTheme: (id) =>
      set(() => {
        persistTheme(id);
        return { theme: id };
      }),
    cycleTheme: () =>
      set((s) => {
        const i = THEMES.findIndex((t) => t.id === s.theme);
        const next = THEMES[(i + 1) % THEMES.length].id;
        persistTheme(next);
        return { theme: next };
      }),
  };
});
