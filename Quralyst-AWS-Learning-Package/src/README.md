# src/

Application source for the Quralyst frontend: a Vite + React 19 single-page app written in
TypeScript. The app talks to its FastAPI backend through a single typed fetch seam (`services/http.ts`); there is
no runtime mock layer (MSW is test-only — see `test/mocks/`). In dev the Vite proxy forwards the API
paths to FastAPI on `:8000`. Styling is global CSS driven by a light/dark
design-token system (no CSS-in-JS); load order is load-bearing and bootstrapped in `main.tsx`. Most
screens and components are ports of the legacy Flask/Jinja app preserved under `Backup/`.

## Entry points

| File            | Role                                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.tsx`      | Boot sequence: imports vendor + global CSS in cascade order, initializes env-gated error reporting, then renders `<App>` into `#root`.                                                          |
| `App.tsx`       | Provider tree — `ErrorBoundary`, the TanStack `QueryClient` (global error toasts), `ToastProvider`, `CellModalProvider`, `RouterProvider` — and wires the http 401/403 handlers to the session. |
| `config.ts`     | Reads and validates the app's `VITE_*` env vars once into one typed `config` object instead of scattering `import.meta.env` reads.                                                              |
| `vite-env.d.ts` | Ambient Vite client types and the `ImportMetaEnv` declarations for the project's env vars.                                                                                                      |

## Folders

| Folder                              | Role                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [components/](components/README.md) | Reusable UI building blocks shared across the app: primitives, shared chrome (layout, feedback, forms, wizard, auth, billing).                                           |
| [data/](data/README.md)             | Static bundled content and datasets (FAQ, profile/location constants, industry maps) ported from the legacy backend — no fetching.                                       |
| [features/](features/README.md)     | Feature-scoped composition: the research wizard step components and the result-workspace widgets, as opposed to generic primitives.                                      |
| [hooks/](hooks/README.md)           | Shared React hooks wrapping the Zustand stores, toast/confirm context, router, and browser APIs.                                                                         |
| [layouts/](layouts/README.md)       | Shell components rendered as parent routes; each renders shared chrome and the active page via `<Outlet>`.                                                               |
| [lib/](lib/README.md)               | Pure, non-React utilities: formatting, error normalization, logging/error-reporting seams, small browser helpers.                                                        |
| [pages/](pages/README.md)           | One route component per screen, mapped to URLs in `routes/router.tsx`; heavy pages are lazy-loaded.                                                                      |
| [routes/](routes/README.md)         | Routing layer: the full router tree, central typed path builders, and the auth/role route guards.                                                                        |
| [services/](services/README.md)     | API access layer: the single `http.ts` fetch seam, `endpoints.ts` URL source of truth, and typed per-domain service objects.                                             |
| [store/](store/README.md)           | Zustand stores for global client state: auth/session, UI chrome (sidebar + theme), and SSE processing progress.                                                          |
| [styles/](styles/README.md)         | Global stylesheets and the light/dark design-token theming system (layered core → components → pages).                                                                   |
| [test/](test/README.md)             | Shared Vitest setup (jest-dom + axe matchers, cleanup) plus the test-only MSW mocks (`test/mocks/`, formerly `src/mocks/`); test files live next to the code they cover. |
| [types/](types/README.md)           | Domain TypeScript types shared across services, tests, and UI, re-exported through one barrel.                                                                           |

## Data flow

A typical read/write travels one path:

- A **component** (under `pages/`, `features/`, or `components/`) renders and calls a **hook**.
- Data fetching and mutations go through **TanStack Query** hooks, which call a typed service in
  **`services/api/*`**.
- Every service call funnels through **`services/http.ts`** — the single `fetch` seam (credentials,
  CSRF echo, `X-Request-ID`, typed `ApiError`, 401/403 hooks) — using URLs from `services/endpoints.ts`.
- That request is answered by the **FastAPI backend** at the same endpoint (reached via the Vite
  proxy in dev). Under test, the same request is intercepted by the MSW handlers in `test/mocks/`
  (wired with `setupServer` from `msw/node`) — there is no MSW in the running app.
- Failed queries/mutations surface a single normalized error toast via the `QueryClient` caches in
  `App.tsx`.
- **UI / client state** that isn't server data (auth/session, sidebar, theme, processing progress)
  lives in **Zustand stores** under `store/`; non-React modules read them via `getState()`.
- **Forms** (notably the research wizards) use **React Hook Form + Zod** for state and validation,
  then submit through the same service → http path.
