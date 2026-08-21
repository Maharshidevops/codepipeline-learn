# src/services/

API access layer. `http.ts` is the single fetch seam — every request in the app goes through it to the FastAPI backend (`credentials: 'include'` httpOnly cookie session, CSRF double-submit echo on mutating methods, `X-Request-ID` correlation header, typed `ApiError`, and app-registered 401/403 hooks). `services/api/*` are typed per-domain service objects that components/hooks consume; `endpoints.ts` is the single source of every URL the frontend calls, so the FastAPI route swap edits one file.

| File           | Purpose                                                                                                                                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `http.ts`      | Typed `fetch` wrapper: JSON/FormData headers, httpOnly cookie session (`credentials: 'include'`) with CSRF double-submit header on mutations, `X-Request-ID`, throws `ApiError` on non-2xx, fires `setUnauthorizedHandler` on 401 and `setForbiddenHandler` on 403 (403 never triggers the logout path). |
| `http.test.ts` | Tests the 401/403 status routing: 401 fires only the unauthorized handler, 403 fires only the forbidden handler.                                                                                                                                                                                         |
| `endpoints.ts` | All API path constants and URL-builder functions (auth, profile, locations, research, results, org, billing, admin, logs). When FastAPI finalizes routes, edit here only.                                                                                                                                |

## api/

| File                      | Purpose                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                | Barrel re-exporting every service object and its interface type; components import from here.                                                                                                           |
| `authService.ts`          | Login, signup, forgot/reset password, Google org-completion, logout, and the `/auth/me` bootstrap fetch.                                                                                                |
| `profileService.ts`       | Profile update (multipart), change/set password, and avatar upload for ProfilePage.                                                                                                                     |
| `preferencesService.ts`   | API-key preferences: read status/source, update non-empty keys, test keys, clear keys, plus the GPT-key test used by process-preference.                                                                |
| `processService.ts`       | The active-processing bootstrap poll (`getActiveProcessing`).                                                                                                                                           |
| `organizationService.ts`  | All org-tab data + mutations: members (paginated/filtered), invites, domains, usage, credit ledger, CRM files, org updates, seats, settings.                                                            |
| `billingService.ts`       | Pricing, checkout/top-up/portal sessions, sales-seat request, the org billing-tab body (subscription/balance/invoice/payment methods), and accept-invite.                                               |
| `adminService.ts`         | Staff approval queues (registrations, org approvals, seat requests, org updates) and the org directory, paginated/filtered.                                                                             |
| `resultsService.ts`       | Previous-results history (tabbed/filtered/paginated), result detail, summary stats, CRM rows + save, delete, and the download URL.                                                                      |
| `locationService.ts`      | Backs LocationSelector: continent→country tree from the bundled `src/data/locationData.json`; states/cities fetched and cached via TanStack Query.                                                      |
| `progressService.ts`      | Opens a `ProgressSource` for a running process — a native `EventSource` wrapper against the backend SSE endpoint — plus stop and disconnect-beacon.                                                     |
| `researchService.ts`      | Submits the three process-page wizards (multipart, returns `{process_id}`), the FV database Excel upload, AI-assist helpers, and reuse-filters prefill; maps wizard models to legacy snake_case fields. |
| `commentsService.ts`      | Per-row comments facade: one comment per (resultId, companyName, position); saving over a filled slot updates, empty text deletes; author-only edit/delete re-enforced server-side.                     |
| `commentsService.test.ts` | Integration test of commentsService against the MSW comments handlers (upsert, empty-text delete, encoding, stats, author-only delete).                                                                 |

## Conventions

- Components never call `fetch` or `http()` directly — they import a service from `services/api` (usually via a hook or TanStack Query); services are the only callers of `http()`.
- `http.ts` stays dependency-light (no store/router imports); auth-expiry and forbidden behavior are injected via `setUnauthorizedHandler` / `setForbiddenHandler` at app level.
- Each service exports both the object and its interface type, so mocks/tests can implement the same contract.
- Legacy Flask response shapes (e.g. `process_id`, snake_case form fields) are preserved at the service boundary; see `REF-API-CONTRACTS.md`.
