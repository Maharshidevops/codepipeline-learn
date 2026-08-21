# CLAUDE.md — Quralyst Frontend

> Entry point for any AI agent in this repo. Read it fully before editing. It is intentionally tight
> — deep detail lives in `README.md`, `Phases/` (start at `Phases/PHASES-README.md`), the per-folder
> `README.md` files under `src/`, and the glob-scoped notes in `.claude/rules/`. Keep this file
> accurate.

## 1. What this is

The **React + TypeScript SPA** for Quralyst, a multi-tenant B2B research platform. It is the rewrite
of a legacy Flask+Jinja app (preserved verbatim under `Backup/` for logic and `UI/` for visual
snapshots — never deleted, used as the source of truth when porting screens).

It talks to a **FastAPI backend** in a separate repo (`Business-Research-Tool---Quralyst`) through a
single typed service seam. **There is no mock mode** — the app requires the backend running. See §7.

## 2. Stack (ground truth)

- **Vite 5** + **React 19** with the **React Compiler** (auto-memoization via Babel plugin — do not
  hand-add `useMemo`/`useCallback` for things the compiler handles; write clean components).
- **TypeScript strict.** Routing: **React Router v6** (`createBrowserRouter`, nested layout routes,
  `lazy()` + `Suspense`, `viewTransition` cross-fades, per-route `handle.title`).
- **Server state: TanStack Query v5.** **Client/UI state: Zustand.** **Forms: React Hook Form + Zod.**
- **Charts: ApexCharts** (Summary page only, lazy chunk; colors read live from theme tokens).
- **Styling:** plain global CSS on a **design-token system** (no CSS Modules). Light/dark theme
  contract in `src/styles/core/colors.css`; radius/shadow scales in `core/tokens.css`. **stylelint
  blocks raw color/radius/shadow literals.**
- **Assets fully self-hosted** (Bootswatch Flatly, Bootstrap Icons, @fontsource Roboto/Lato) — the
  built app makes **zero third-party requests**. Don't add CDN `<link>`/`<script>` tags.
- **Security:** build-injected **CSP** meta tag (hash-allowlisted inline scripts); httpOnly-cookie
  auth with **CSRF double-submit**; permission-map authorization (`can()`); idle-session timeout.
- **Observability:** env-gated **Sentry** (dead-code-eliminated when no DSN) + ring-buffered log
  shipping to `/api/logs`; `X-Request-ID` correlation.
- **Quality:** ESLint 9 (flat + jsx-a11y) · Prettier 3 · stylelint · Vitest + Testing Library +
  vitest-axe · husky + lint-staged + secretlint pre-commit. CI build runs on **Node 22**.

## 3. Non-negotiable rules

1. **Git (humans drive branches & PRs).** Never push to or PR into **`main`**. Work on feature
   branches off **`Dev-frontend`**; PRs target **`Dev-frontend`** (the CI/CD trigger).
   - **Claude never creates a branch or opens a PR.** Before any branch is created, ask the
     user for approval **and which base branch** to cut from, then **`git pull`** the latest on
     that base first. The repo owner creates/merges PRs via the compare URL. Claude may
     stage/commit on an existing branch when asked, but never pushes to `main` or opens PRs.
     See `.claude/commands/commit.md`.
2. **Design tokens only.** No raw color, radius, or shadow literals in CSS — use the tokens
   (`var(--…)`). stylelint will fail otherwise. See `.claude/rules/styling.md`.
3. **One network seam.** Every backend call goes through `src/services/http.ts` and the typed
   services in `src/services/api/*` — never call `fetch`/axios directly in a component. Requests use
   `credentials: 'include'`, echo the CSRF token on mutations, and map snake_case↔camelCase via
   `lib/caseMapper`. Server state uses TanStack Query, not ad-hoc effects. See
   `.claude/rules/services-and-data.md`.
4. **Keep it self-hosted & CSP-safe.** Don't introduce third-party network requests or inline scripts
   that aren't hash-allowlisted.
5. **Accessibility is required.** jsx-a11y must pass; new UI needs a `vitest-axe` check. No regressions.
6. **TypeScript strict.** No `any` without a written reason; model API types in `src/types`.
7. **Never commit secrets** (secretlint enforces). Env is read once in `src/config.ts`; the only
   public vars are the documented `VITE_*` ones.

## 4. Architecture map

```
src/
  pages/        Route components, one per screen (admin/, auth/, billing/, organization/, pe/, deals/, bd-scoring/, usage/)
  layouts/      Shell layouts (AppLayout, AuthLayout, ResultLayout, OrgSettingsLayout)
  routes/       router.tsx (route tree + handle.title) · paths.ts · ProtectedRoute · RoleRoute
  features/     Feature-scoped composition (research wizard steps, result-workspace widgets, comments)
  components/   Reusable UI — ui/ primitives, domain/ widgets, feedback/, form/, layout/, wizard/
  services/     http.ts (the single fetch seam) + endpoints.ts + api/* typed services
  store/        Zustand stores (authStore, progressStore, uiStore)
  hooks/        Shared hooks (useAuth, usePermissions, useIdleTimeout, useThemeTokens, …)
  lib/          Pure utils (caseMapper, logger, reportError, viewTransition, datetime, …)
  styles/       Global CSS — core/ → components/ → pages/ (LOAD ORDER IS LOAD-BEARING)
  data/         Static content (FAQ, profile dropdown data, sub-industry map, locationData)
  types/        Shared domain types
  test/         Vitest setup (jsdom, jest-dom + vitest-axe) + test-only MSW mocks (mocks/)
  config.ts     Env read once into a typed `config`
```

Most folders have their own `README.md` describing each file — read it before adding to that folder.

## 5. Common commands

```bash
npm install              # also installs the husky pre-commit hook
# Start the FastAPI backend on http://localhost:8000 FIRST (the app requires it), then:
npm run dev              # http://localhost:5173; Vite proxy forwards API paths to :8000
npm run build            # tsc --noEmit typecheck + production build (injects CSP)
npm run typecheck        # type-only check
npm run lint             # ESLint (incl. jsx-a11y)
npm run lint:css         # stylelint (raw color/radius/shadow literals are blocked)
npm run test             # Vitest watch (unit + integration + a11y axe)
npm run test:run         # single run
npm run format           # Prettier write
```

The pre-commit hook runs lint-staged: ESLint `--fix` + Prettier on TS/TSX, stylelint + Prettier on
CSS, Prettier on MD/JSON, secretlint on everything.

## 6. Conventions

- **Components**: function components, no class components; let the React Compiler memoize. Keep
  primitives in `components/ui/`, compose features in `features/`. See `.claude/rules/components.md`.
- **Styling**: token-driven, theme-aware; read live theme values with `useThemeTokens` (e.g. for
  chart colors) instead of hard-coding. Respect the `core/ → components/ → pages/` load order.
- **Data fetching**: TanStack Query keys are stable and typed; mutations invalidate the right keys.
  Errors and auth (401/403/CSRF) are handled in the http seam.
- **Routing/state**: routes in `routes/router.tsx` with `handle.title`; guard with `ProtectedRoute`
  / `RoleRoute`. Auth/permission state in `authStore` + `usePermissions().can()`.

## 7. Relationship to the backend (`Business-Research-Tool---Quralyst`)

- In dev, `npm run dev` runs on `:5173` and the **Vite proxy** (`vite.config.ts`) forwards the single
  **`/api`** prefix to **FastAPI on `:8000`**. Since Phase 9 every backend endpoint is served under
  `/api` (SPA owns every other path), so the proxy is one rule with no `text/html` Accept-sniffing
  bypass. Endpoint paths are centralised in `src/services/endpoints.ts`.
- Auth is an **httpOnly cookie session** with **CSRF double-submit**; the app boots unauthenticated
  and restores the session via `GET /api/auth/me`. The backend speaks **camelCase**.
- `VITE_API_BASE_URL` is empty for same-origin (proxy/serving layer routes API paths); set a full
  origin only if the API is on another host.
- The API contract the app codes against is `Phases/REF-API-CONTRACTS.md`; the backend swap runbook
  is `Phases/BACKEND-INTEGRATION.md`. If the backend changes a shape, update the types + contract.

## 8. Where to look first

- New here → `README.md` then `Phases/ARCHITECTURE.md` and `Phases/PHASES-README.md`.
- A screen/component → `.claude/rules/components.md` + the folder's own `README.md`.
- CSS/theme → `.claude/rules/styling.md` + `Phases/REF-DESIGN-SYSTEM.md`.
- API/data → `.claude/rules/services-and-data.md` + `Phases/REF-API-CONTRACTS.md`.
- Routing/auth/state → `.claude/rules/routing-and-state.md`.
- Tests → `.claude/rules/testing.md`.
- Porting a legacy screen → compare against `Backup/` (logic) and `UI/` (visuals).

## 9. Knowledge graph (graphify) — NOT installed in this repo

graphify is **not set up here.** Do **not** run `graphify` / graph commands or assume a graph
exists — use normal search (Grep/Glob) and the per-folder `README.md`s. The `.claude/hooks`
graph-hint / graphify-update hooks are intentionally **dormant** and no-op until a graph exists.
If graphify is ever installed (a `graphify-out/graph.json` appears), then — and only then — follow
the graphify conventions used in the backend repo (read `GRAPH_REPORT.md`, prefer `graphify
query/path/explain` over grep, refresh with `graphify update .`).

## 10. Working agreement (how Claude approaches tasks here)

- **Plan before editing.** For any non-trivial or multi-step task, first present a short plan (what
  will change, where, and why) and **wait for the user's go-ahead** before editing files. Small,
  obvious single-file fixes can proceed directly.
- **Research + suggestions = a written summary.** When asked to research or to recommend something,
  produce a clear, _explained_, well-structured summary of the findings and the reasoning — not a
  one-line answer.
- **Options = pros & cons first.** When presenting choices for the user to pick from, give a
  pros/cons list for **every** option _before_ asking which one they want.
- **Git is user-driven.** Claude never creates branches or PRs; it asks for approval and the base
  branch, and pulls latest first (see §3 rule 1).

## 11. Maintaining these files (monthly)

Keep `CLAUDE.md`, `.claude/rules/*`, agents, commands, and hooks current. **About once a month** (or
after a significant architectural change) review what changed in the repo and update **only** the
`.claude`/CLAUDE files that are now inaccurate — do not churn files that are still correct. A
scheduled monthly review may be configured to do this automatically.
