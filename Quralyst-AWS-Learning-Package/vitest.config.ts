/// <reference types="vitest/config" />
// Vitest config — see Phases/PHASE-8-QUALITY-GATES.md. jsdom env, jest-dom matchers; tests that need
// HTTP responses spin up their own MSW server from the test-only mocks in src/test/mocks/.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // F57 §2.5 — ONE repo-wide policy, not scattered per-file bumps. Two levers, one root cause:
    // every test file spins up its own jsdom + MSW server, and the heavy ones render whole pages
    // that fan out to many concurrent MSW round-trips (PEAdminPage composes nine panels). On a
    // many-core machine vitest's default fans out ~(cores-1) such workers at once, which
    // OVERSUBSCRIBES the box — collect/setup balloon and tests that pass in isolation time out
    // under the thrash. That was the whole of the intermittent frontend flakiness (incl.
    // ColumnMappingDialog); none of it was a real bug (every file passes run alone).
    //   - maxWorkers bounds the fan-out so heavy jsdom+MSW workers do not thrash;
    //   - testTimeout is well clear of the slowest real test while still failing a genuinely hung
    //     one in bounded time. A fast test is unaffected — the timeout only fires on a stall.
    // CodeBuild boxes are often 8–36 vCPU; 4 workers keeps headroom so findBy waits (10s in
    // setup.ts) stay responsive instead of stalling under jsdom thrash.
    maxWorkers: 4,
    minWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Load-induced flakiness backstop. maxWorkers + testTimeout reduce the jsdom+MSW thrash but do
    // not eliminate it on busy CI boxes: a timing-sensitive test (async waitFor, window.open spies)
    // still occasionally misses its window and fails — a DIFFERENT one each run — while passing in
    // isolation. Retries only fire on failure (happy path is unaffected) and a genuine bug still
    // fails all attempts, so this cures the intermittent red without masking real regressions.
    retry: 2,
  },
});
