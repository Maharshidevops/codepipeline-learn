# src/test/

Vitest setup shared by every unit/component test (wired via `setupFiles` in the Vitest config). Test files themselves live next to the code they cover (`*.test.ts` colocated in `src/hooks/`, `src/lib/`, `src/store/`, etc.).

| File       | Purpose                                                                                                                                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.ts` | Registers `@testing-library/jest-dom` matchers and `vitest-axe` matchers (`toHaveNoViolations`, a11y automation), augments Vitest's assertion types for the axe matchers (vitest-axe 0.1.0 only ships legacy `Vi`-namespace types), and auto-runs Testing Library `cleanup()` after each test. |

## mocks/

Test-only MSW handlers + fixtures (the former runtime `src/mocks/`, removed when the app went real-mode-only). They are **not** part of the running app — the app talks to FastAPI directly. Tests that need network responses spin up `setupServer` from `msw/node` against these handlers: `services/api/commentsService.test.ts`, `features/results/viewResult/CommentModal.test.tsx`, and `pages/ViewPreviousResultPage.a11y.test.tsx`. `handlers/` holds the per-domain REST handlers (auth, results, organization, billing, admin, comments, profile, research, location, logs) and `fixtures/` the camelCase sample data; `locationStatesCities.json` backs the states/cities lookups under test.
