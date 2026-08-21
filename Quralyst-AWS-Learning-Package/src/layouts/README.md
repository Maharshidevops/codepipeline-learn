# src/layouts/

Shell components rendered as parent routes in `router.tsx`; each renders the shared chrome for a group of pages and the active page via `<Outlet>`. They are the React ports of the Jinja base templates (`base.html`, `auth_base.html`, the org-settings shell partials).

| File                    | Purpose                                                                                                                                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppLayout.tsx`         | Authenticated app shell — port of `base.html` body (sidebar + main wrapper); hosts the app-wide ProgressModal + sidebar progress tracker, calls `usePageTitle()`, and wraps the outlet in the `<Suspense>` boundary that covers all lazy routes.                                                                     |
| `AuthLayout.tsx`        | Auth shell — port of `auth_base.html` (no sidebar); loads the auth-page CSS once for all `/auth/*` routes and calls `usePageTitle()`; each page renders its own `.auth-container` via `<AuthShell>`.                                                                                                                 |
| `OrgSettingsLayout.tsx` | Organization settings shell for `/org/:orgSlug/*` — glass header (title/subtitle + "Quralyst · slug") plus the `OrgSubnav` pill row; each tab sets its header text via `useOrgPageMeta()` and renders only its body.                                                                                                 |
| `ResultLayout.tsx`      | Tabbed result workspace for `/quralyst-research/result/:resultId/*` — fetches the result metadata once for the shared header, renders the cross-cutting toolbar (Use Same Filters / Download / Delete) and the NavLink tab row (Data / Preview / Manage CRM / Summary), with its own `<Suspense>` around the outlet. |
| `result-layout.css`     | Styles for the ResultLayout header + tab subnav, kept here (not in `view-result.css`) so the Preview/Manage/Summary tabs are styled too.                                                                                                                                                                             |

## Conventions

- Page-tab titles come from route `handle: { title }` consumed by `usePageTitle()` — called once per shell (`AppLayout`, `AuthLayout`), not per page.
- Lazy-loaded pages rely on the `<Suspense fallback={null}>` boundaries in `AppLayout` and `ResultLayout`; pages themselves never add Suspense.
- Pages under `OrgSettingsLayout` and `ResultLayout` render **body only**; header, subnav/tabs, and background belong to the layout.
