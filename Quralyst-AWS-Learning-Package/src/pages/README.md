# src/pages/

One route component per screen, mapped to URLs in `src/routes/router.tsx`; most are direct ports of the legacy Flask/Jinja templates (the header comment in each file names its source template). Seven heavy pages (the three research wizards, the FV database/results pages, `ViewPreviousResultPage`, `SummaryPage`) are `lazy()`-loaded into their own chunks; the rest are imported eagerly.

| File                                   | Purpose                                                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_PagePlaceholder.tsx`                 | Temporary placeholder for routes; currently unreferenced — every route now has a real page.                                                                                                 |
| `ErrorPage.tsx`                        | Generic error/500 screen used as the `errorElement` on the `AppLayout` route, so loader/render errors show inside the shell; reads the thrown error via `useRouteError`.                    |
| `FaqPage.tsx`                          | `/faq` — section nav (persisted to localStorage) + per-section accordion; content is JSX from `src/data/faq.tsx`.                                                                           |
| `FaqPage.a11y.test.tsx`                | Axe audit of the FAQ accordion + section nav (default state and with an item toggled).                                                                                                      |
| `FinancialVerticalsPage.tsx`           | `/financial-verticals` — Financial List 3-step research wizard (one RHF form across all steps, Step 3 is a read-only ReviewSummary).                                                        |
| `FinancialVerticalsDatabasePage.tsx`   | `/financial-verticals/database` — Excel-upload page for (re)building the FV database: requirements card + drag-drop upload + progress + result card.                                        |
| `FinancialVerticalsResultsPage.tsx`    | `/financial-verticals/results/:resultId` — FV results grid for one run: header, action toolbar, PE-firms `DataTable` with expandable cells.                                                 |
| `ForbiddenPage.tsx`                    | Route-level 403 rendered in place by `RoleRoute` on permission denial (no URL of its own; no redirect, the user keeps their place).                                                         |
| `ManageResultsPage.tsx`                | Result workspace **Manage CRM** tab (`/quralyst-research/result/:resultId/manage`) — editable CRM table with per-row Save and Save All.                                                     |
| `NotFoundPage.tsx`                     | `*` catch-all 404 with a link back to `/process-preference`.                                                                                                                                |
| `PreviewResultPage.tsx`                | Result workspace **Preview** tab (`…/preview`) — breadcrumb + header + `DataTable` from the result's columns/rows.                                                                          |
| `PreviousResultsPage.tsx`              | `/previous-results` — tabbed (Target List / Strategic Buyer / Financial Buyer) paginated + filterable results history; active tab and filters live in URL searchParams.                     |
| `ProcessPreferencePage.tsx`            | `/process-preference` — authed landing page: Target List card + Buyer List nav cards; tests the GPT key on load and offers Configure / Continue Anyway.                                     |
| `ProfilePage.tsx`                      | `/profile` — view/edit profile with field locking, country→timezone/phone-prefix cascade, avatar upload, password change with live checklist.                                               |
| `StrategicResearchPage.tsx`            | `/strategic-research` — Strategic / Buyer List 3-step wizard (RHF + Zod, Save Draft to localStorage, submit starts the app-wide progress flow).                                             |
| `SummaryPage.tsx`                      | Result workspace **Summary** tab (`…/summary`) — criteria card + Overview/Distribution/Contacts tabs; Top Locations is an ApexCharts bar chart (chart lib ships only on this route).        |
| `TargetListPage.tsx`                   | `/quralyst-research` — Target List 3-step research wizard (one RHF form, legacy snake_case submit contract).                                                                                |
| `TargetListPage.a11y.test.tsx`         | Axe audit of the wizard at Step 1 (field array, custom Selects, radio groups).                                                                                                              |
| `UserPreferencesPage.tsx`              | `/user-preferences` — 8 API-key cards with masked inputs, Edit/Update/Test/Clear flows, and the Apollo endpoints modal.                                                                     |
| `ViewPreviousResultPage.tsx`           | Result workspace **Data** tab (`…/data`) — the app's heaviest grid: sticky-header results table with in-table filters, full-screen toggle, cell-expand modal, scoring panel, files summary. |
| `ViewPreviousResultPage.a11y.test.tsx` | Axe audit of the Data tab rendered against MSW with the filter panel open.                                                                                                                  |

## admin/

Admin-only pages under `/admin/*`, gated by `RoleRoute role="is_admin"` in the router.

| File                            | Purpose                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `PendingRegistrationsPage.tsx`  | `/admin/pending-registrations` — Pending/Approved/Rejected tabs + email search + DataTable; approve/reject/delete via adminService. |
| `OrganizationApprovalsPage.tsx` | `/admin/organization-approvals` — Seat Requests table plus the org-approval queue (tabs + search + DataTable + pagination).         |
| `OrganizationUpdatesPage.tsx`   | `/admin/organization-updates` — cross-org updates list with status filter and per-item "Approve seats" action.                      |
| `OrganizationsListPage.tsx`     | `/admin/organizations` — active orgs and deleted orgs with a confirm-gated Restore action.                                          |

## auth/

Unauthenticated pages rendered inside `AuthLayout` (`/auth/*`).

| File                           | Purpose                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `LoginPage.tsx`                | `/auth/login` — email/password form + "Continue with Google" + google-only hint banner.                                        |
| `LoginPage.a11y.test.tsx`      | Axe audit of the full login surface (shell + form + Google button).                                                            |
| `SignupPage.tsx`               | `/auth/signup` — JOIN ↔ CREATE org toggle, live password checklist, invite-token locking, success popup.                       |
| `ForgotPasswordPage.tsx`       | `/auth/forgot-password` — async reset-link request with a 30s resend cooldown.                                                 |
| `ResetPasswordPage.tsx`        | `/auth/reset-password` — token from `?token`, live password checklist + confirm-match gate.                                    |
| `GoogleCompleteOrgPage.tsx`    | `/auth/google/complete-org` — finish a Google signup (name + org join/create + domain); OAuth prefill mocked via query params. |
| `OrgPendingPage.tsx`           | `/auth/org-pending` — "awaiting org-admin approval" notice (email via `?email`).                                               |
| `OrgFullPage.tsx`              | `/auth/org-full` — organization at seat capacity (org name via `?org`).                                                        |
| `RegistrationPendingPage.tsx`  | `/auth/registration-pending` — registration-under-review card.                                                                 |
| `RegistrationRejectedPage.tsx` | `/auth/registration-rejected` — rejection notice with optional `?reason`.                                                      |

## billing/

Billing/checkout/invite screens rendered full-page inside `AppLayout` (these are app routes, not org-settings tabs).

| File                      | Purpose                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `PricingPage.tsx`         | `/pricing` — monthly/annual plan toggle; self-serve plans go to Stripe checkout, enterprise plans open the sales-seat modal, plus top-up packs. |
| `AcceptInvitePage.tsx`    | `/billing/accept-invite` — reads `?token`, shows invite details, single Accept button → toast + navigate to `/process-preference`.              |
| `CheckoutSuccessPage.tsx` | `/billing/checkout/success` — polls subscription JSON (≤30×1s) until the webhook hydrates, then redirects to org billing.                       |
| `CheckoutCancelPage.tsx`  | `/billing/checkout/cancel` — simple checkout-cancelled notice.                                                                                  |
| `InviteInvalidPage.tsx`   | `/billing/invite-invalid` — invalid/expired invite notice; the action link depends on whether the user is signed in.                            |

## organization/

Org-settings tabs under `/org/:orgSlug/*`, rendered inside `OrgSettingsLayout`: each page renders **body only** and sets the glass-header title/subtitle via `useOrgPageMeta()`.

| File                   | Purpose                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `DashboardPage.tsx`    | `/org/:orgSlug/dashboard` — "At a glance" card (members / pending / seats) + recent-updates list.                                           |
| `EditPage.tsx`         | `/org/:orgSlug/edit` — org profile, the 8 default API-key inputs (masked until Edit unlocks), Save, and Rotate join code.                   |
| `BillingPage.tsx`      | `/org/:orgSlug/billing` — admins get the full Stripe dashboard body; members get a Credits-only card.                                       |
| `MembersPage.tsx`      | `/org/:orgSlug/members` — Pending/Active/Inactive tabs + debounced email search + DataTable; approve/reject/suspend/remove behind confirms. |
| `InvitesPage.tsx`      | `/org/:orgSlug/invites` — seat summary + admin-only send-invite form + pending-invites table with revoke.                                   |
| `UsagePage.tsx`        | `/org/:orgSlug/usage` — sticky/scrolling daily-usage table (date · user · companies · one column per provider).                             |
| `CreditLedgerPage.tsx` | `/org/:orgSlug/credit-ledger` — server-paged ledger table with colored delta cells.                                                         |
| `UpdatesPage.tsx`      | `/org/:orgSlug/updates` — simple list-group feed of org updates.                                                                            |
| `CrmPage.tsx`          | `/org/:orgSlug/crm` — org-wide CRM files table (title · created · status).                                                                  |
| `DomainsPage.tsx`      | `/org/:orgSlug/domains` — add-domain form + verified/pending list with per-domain Verify.                                                   |

## Conventions

- Every page opens with a header comment naming the legacy template it ports and any notable behavior — keep that comment current; this README only summarizes it.
- Browser-tab titles come from `handle: { title }` declared per route in `router.tsx` (not from the pages themselves).
- Data access goes through the `src/services/*` modules (MSW-mocked today); pages don't call `fetch` directly.
- `*.a11y.test.tsx` files are Vitest + axe-core audits colocated with the page they cover and must report zero violations.
