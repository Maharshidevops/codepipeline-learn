// Authenticated app shell — React port of base.html body (sidebar + main-wrapper).
// The cell modal is provided app-wide by <CellModalProvider> (App.tsx). The app-wide ProgressModal
// + sidebar tracker (Phase 7) render from progressStore; useProgressBinding wires router navigation
// for completion redirects. BillingBanner is wired in its phase.
import { Suspense, useEffect } from 'react';
import { Outlet, useMatches } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import ProgressModal from '@/components/domain/ProgressModal/ProgressModal';
import NotificationBell from '@/features/deals/NotificationBell';
import { useProgressBinding } from '@/hooks/useProgressStream';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUiStore } from '@/store/uiStore';
import { isThemeId } from '@/styles/themes';
import { resolveTheme, onSystemSchemeChange } from '@/styles/themeResolver';

/** Reflect the resolved theme onto <html>: our tokens, Bootstrap, native UI, and the mobile chrome bar. */
function applyTheme(resolved: 'light' | 'dark') {
  const el = document.documentElement;
  el.setAttribute('data-theme', resolved);
  el.setAttribute('data-bs-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const c = getComputedStyle(el).getPropertyValue('--theme-color-meta').trim();
    meta.setAttribute('content', c || '#ffffff');
  }
}

export default function AppLayout() {
  useProgressBinding();
  // Idle-session timeout (Phase 34) — authed shell only, never on auth pages. Suspends while a
  // research job streams progress; activity in any tab resets all tabs.
  useIdleTimeout();
  // Per-route tab titles (Phase 34).
  usePageTitle();

  // Per-route content width: processing forms + FAQ opt into a narrower box via `handle.width`
  // (the deepest matched handle wins, mirroring usePageTitle). Research Home uses `wide` (full
  // shell + fixed gutters). Everything else stays at 85%.
  const matches = useMatches();
  const contentWidth = matches.reduce<'default' | 'narrow' | 'wide'>((acc, m) => {
    const w = (m.handle as { width?: string } | undefined)?.width;
    if (w === 'narrow' || w === 'wide') return w;
    return acc;
  }, 'default');
  const contentClass =
    contentWidth === 'narrow'
      ? ' main-content--narrow'
      : contentWidth === 'wide'
        ? ' main-content--wide'
        : '';

  // Sidebar collapse (Phase 21). The boolean lives in uiStore; reflect it as a `body` class so both
  // the fixed sidebar and the .main-wrapper offset can track `--sidebar-width` (see layout.css).
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    return () => document.body.classList.remove('sidebar-collapsed');
  }, [sidebarCollapsed]);

  // Theme (Phase 25). Apply the resolved palette whenever the choice changes.
  useEffect(() => {
    applyTheme(resolveTheme(theme));
  }, [theme]);

  // While in System/Auto, re-apply when the OS color scheme flips (live).
  useEffect(() => {
    if (theme !== 'auto') return;
    return onSystemSchemeChange(() => applyTheme(resolveTheme('auto')));
  }, [theme]);

  // Cross-tab sync: another tab changed the persisted theme → adopt it locally (without re-persisting).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'quralyst.theme' && isThemeId(e.newValue)) {
        useUiStore.setState({ theme: e.newValue });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Enable color transitions only after first paint (no animation on load / no-FOUC apply).
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      document.documentElement.classList.add('theme-anim-ready'),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  // Replit-style sidebar stays expanded — no responsive icon-rail auto-collapse.
  useEffect(() => {
    setSidebarCollapsed(false, true);
  }, [setSidebarCollapsed]);

  return (
    <>
      <Sidebar />
      <NotificationBell />
      <div className="main-wrapper">
        <div className={`main-content${contentClass}`}>
          {/* One boundary covers every lazy() child route; fallback={null} keeps nav instant. */}
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
      </div>
      <ProgressModal />
    </>
  );
}
