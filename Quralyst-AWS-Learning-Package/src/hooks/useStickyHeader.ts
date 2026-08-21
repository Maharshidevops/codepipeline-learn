// useStickyHeader — React replacement for Backup/static/js/components/table-utils.js.
//
// The legacy script cloned <thead> into a sticky-positioned wrapper and hand-matched column widths,
// a workaround for the era's sticky-header quirks. In the React port we render a single table inside
// a scroll container and rely on the CSS already in tables.css (`thead th { position: sticky; top: 0 }`
// + `table-layout: fixed` with fixed 220px columns). That is pixel-identical and removes the clone.
//
// This hook exposes the scroll-container ref plus a `recalculate()` no-op kept for API parity with the
// legacy `tableUtils.recalculateAll` (callers wire it to tab changes); width-matching is automatic now.
import { useCallback, useRef } from 'react';

export function useStickyHeader<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null);
  // Native CSS sticky needs no recalculation; kept for call-site compatibility.
  const recalculate = useCallback(() => {}, []);
  return { containerRef, recalculate };
}
