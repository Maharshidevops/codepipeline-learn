// Minimal shell for fullscreen tools (no sidebar) — e.g. tearsheet viewer.
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function FullscreenLayout() {
  usePageTitle();
  return (
    <div
      className="tearsheet-fullscreen-layout"
      data-testid="tearsheet-fullscreen-layout"
      style={{
        minHeight: '100dvh',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        background: '#0f172a',
      }}
    >
      <Suspense
        fallback={
          <div className="d-flex align-items-center justify-content-center h-100">
            <Spinner />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  );
}
