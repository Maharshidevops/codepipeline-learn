// Vitest setup — registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.),
// vitest-axe matchers (toHaveNoViolations — Phase 35 a11y automation), and auto-cleans the DOM
// between tests.
import '@testing-library/jest-dom/vitest';
import { afterEach, expect } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import * as axeMatchers from 'vitest-axe/matchers';
import type { AxeMatchers } from 'vitest-axe/matchers';

expect.extend(axeMatchers);

// findBy*/waitFor default is 1000ms. Under CI load (many jsdom+MSW workers) that is too
// short — queries time out while the request is still in flight, which is what produced the
// intermittent "waitForWrapper" failures (e.g. FirmSignalsTab Median realized hold). Keep this
// below vitest testTimeout so a real hang still fails the test.
configure({ asyncUtilTimeout: 10_000 });

// vitest-axe 0.1.0 ships types for the legacy `Vi` namespace only; augment Vitest 2.x's
// assertion interfaces here so `expect(...).toHaveNoViolations()` typechecks everywhere.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- must mirror Vitest's own `Assertion<T = any>` declaration to merge.
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// jsdom does not implement window.matchMedia; components that read it at mount (e.g. the
// Sidebar's desktop/mobile split) crash under test without this polyfill. Returns a
// non-matching MediaQueryList so responsive components render their mobile/inline branch.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
});
