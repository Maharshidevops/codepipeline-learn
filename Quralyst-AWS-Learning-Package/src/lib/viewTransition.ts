// View Transitions helper (Phase 36) — pure progressive enhancement: animates a state-driven DOM
// swap (wizard steps) where the router's `viewTransition` prop doesn't apply. flushSync makes the
// React update land inside the transition snapshot. Unsupported browsers and reduced-motion users
// get the plain update (no-op fallback, never an error).
import { flushSync } from 'react-dom';

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown };

export function withViewTransition(update: () => void): void {
  const doc = document as DocWithVT;
  if (
    typeof doc.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    doc.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
}
