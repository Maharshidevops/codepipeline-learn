# Rule: tests

**Applies to:** `src/test/**`, `**/*.test.ts(x)`

- **Vitest + Testing Library + vitest-axe**, jsdom env. Setup (jest-dom + axe matchers + MSW server)
  is in `src/test/`. Run: `npm run test` (watch) / `npm run test:run` (single).
- **MSW** handles network in tests (REST handlers + fixtures in `src/test/mocks/`). Tests must not hit
  a real backend. When you change a service, update its MSW handler.
- **Query by role/label/text**, not test-ids or implementation details. Assert user-visible behaviour.
- **Accessibility:** new UI gets a `vitest-axe` assertion (no violations).
- A change to behaviour needs a test that fails before and passes after. Keep tests colocated or under
  the matching area.
- Gates that mirror CI: `npm run typecheck`, `npm run lint`, `npm run lint:css`, `npm run test:run`
  (see the `/check` command).
