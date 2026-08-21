# src/components/

Reusable UI building blocks shared across the app: primitives (`ui/`), composite feature
components (`domain/`), and shared chrome (layout, feedback, forms, wizard, auth, billing).
Feature/page-specific code lives in `src/features` and route screens in `src/pages` — anything
here is meant to be imported from more than one place. Most components are verbatim ports of
legacy Jinja templates / static JS from the Flask app (`Backup/`).

## auth/

| File            | Purpose                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthShell.tsx` | Shared split layout for every auth page (auth.css): navy gradient left panel (logo, heading, blob shapes) + white `.auth-card` right; pages pass `pageClass`, left content, card header, and body. |

## billing/

| File                    | Purpose                                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BillingStripeBody.tsx` | Presentational port of `_billing_stripe_body.html`: subscription / credits / last-invoice / payment-method cards in a Bootstrap grid, plus the admin-only "Manage Billing in Stripe" button wired to `billingService.openPortal()`. |

## domain/

| File                                         | Purpose                                                                                                                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                                   | Barrel for the composite domain components (`ResultCard`, `ProgressModal`, `LocationSelector`).                                                                                                                                                      |
| `LocationSelector/LocationSelector.tsx`      | Controlled continent → country → state → city cascade (React rewrite of `location-selector.js`) with add/remove rows, API-fed state/city options via `useLocations`, and a `singleRow` mode for single-HQ forms.                                     |
| `LocationSelector/LocationSelector.test.tsx` | Tests that Add appends a blank row and Remove drops a row, both surfaced through `onChange` (controlled).                                                                                                                                            |
| `ProgressModal/ProgressModal.tsx`            | App-wide progress overlay (`#progress-alert`): pure renderer of `progressStore` with whitelisted cycling heading/image/summary copy, linear bar + percentage, file stats, and Minimize/Stop actions (stream lifecycle lives in `useProgressStream`). |
| `ProgressModal/progress-modal.css`           | Full-screen progress-modal overlay styles (verbatim from the legacy research template).                                                                                                                                                              |
| `ResultCard/ResultCard.tsx`                  | Single result-summary card replacing both the Jinja `render_result_card` macro and its duplicate JS string renderer; handles all 3 result tab types, permissions-gated delete, and links via `paths`.                                                |

## feedback/

| File                          | Purpose                                                                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ConfirmDialog.tsx`           | Declarative `.popup-confirm` overlay controlled by an `open` prop — the props-driven alternative for call-sites that keep confirm state in component state; most code should prefer the imperative Promise-based `useConfirm()` instead.       |
| `ErrorBoundary.tsx`           | App-wide class-component error boundary: catches descendant render errors (not async/event errors — those go to toasts) and shows a recoverable fallback with `reset()`; kept dependency-light so it can sit at the very top of the tree.      |
| `ErrorBoundary.test.tsx`      | Tests that a throwing child renders the fallback and `reset()` re-renders the children.                                                                                                                                                        |
| `error-boundary.css`          | Co-located fallback styles, bundled with the component so they still apply when a subtree render crashes.                                                                                                                                      |
| `OfflineBanner.tsx`           | Debounced (2s) offline detection with a sticky banner and a "Connection restored" toast on reconnect — port of the base.html offline IIFE.                                                                                                     |
| `offline-banner.css`          | Fixed full-width offline notice pinned above everything (z-index 99999).                                                                                                                                                                       |
| `QueryError.tsx`              | The one shared inline error + optional-Retry block for data-fetching pages, so fetch failures are distinguishable from genuinely empty results.                                                                                                |
| `query-error.css`             | Self-contained QueryError styles mirroring `.no-data-placeholder`, shipped with the component so it looks the same on any page.                                                                                                                |
| `ToastProvider.tsx`           | Popup/toast system (React port of the legacy `PopupManager`): renders `.popup-overlay`/`.popup-box`, closes on Escape/outside-click, auto-hides success after 3s; consumed via `useToast`/`useConfirm` hooks and the `toastBus` error channel. |
| `ToastProvider.a11y.test.tsx` | axe-core audit: opens a confirm popup via `useConfirm()` and asserts the rendered dialog has zero accessibility violations.                                                                                                                    |
| `toast-provider.css`          | Styles for the rich signup-success popup body (the popup chrome itself lives in `core/alerts.css`).                                                                                                                                            |

## form/

RHF-oriented composite form controls (built on top of `ui/` primitives).

| File                       | Purpose                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                 | Barrel for the form components.                                                                                                                                           |
| `CharCountTextarea.tsx`    | Controlled textarea with a live `current / maxLength` character counter.                                                                                                  |
| `FieldArrayRepeater.tsx`   | Presentational repeater for dynamic row sets (geo rows, questions); pairs with RHF `useFieldArray` — pass field ids, render rows via `renderRow(index)`, wire add/remove. |
| `FileUpload.tsx`           | Controlled file list: native file input plus the legacy `#file-list` markup with per-file remove buttons; `listId` lets multiple instances coexist.                       |
| `PasswordRequirements.tsx` | Live ✓/✕ password-rule checklist matching the backend `password_policy.py`; calls `onValidChange` so the parent can gate submit on all rules (and confirm match).         |
| `PasswordRequirements.css` | Checklist styles, verbatim from the rules the legacy `password_requirements.js` injected into `<head>`.                                                                   |
| `ResettableRadioGroup.tsx` | `RadioGroup` plus an inline `.btn-reset-inline` circle that clears the selection back to `''`; used on the process pages.                                                 |
| `form-components.css`      | Shared co-located styles for the small form/ pieces (repeater rows, file list, reset button).                                                                             |

## layout/

| File                              | Purpose                                                                                                                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BillingBanner.tsx`               | Severity-driven (`info`/`warning`/`danger`) alert above app content (trial ending, payment failed); dismiss surfaces through `onDismiss`.                                                                 |
| `billing-banner.css`              | Layout of the banner's content/CTA/dismiss row (alert chrome comes from `core/alerts.css`).                                                                                                               |
| `GlobalProgressTracker.tsx`       | Minimized progress chip in the sidebar; reads `progressStore`, shown only while a process is active/finished, `onMaximize` re-opens the full ProgressModal.                                               |
| `OrgSubnav.tsx`                   | Horizontal org-section nav rendered through the shared `TabNav`; section list comes from `orgSections`, admin-only items filtered by `isOrgAdmin`.                                                        |
| `orgSections.ts`                  | Single source of truth for the Organization section list (route, label, icon, `adminOnly`), consumed by both `OrgSubnav` and the sidebar "Organization" group so they can never drift.                    |
| `TabNav.tsx`                      | Shared horizontal tab row (NavLink-based) used by both the result workspace and the org sub-nav; active = `btn-primary`, inactive = `btn-outline-secondary`.                                              |
| `Sidebar/Sidebar.tsx`             | Role-aware sidebar ported from base.html: full nav item set, theme switcher, mobile `.show` toggle, embeds the status badges and GlobalProgressTracker.                                                   |
| `Sidebar/SidebarGroup.tsx`        | Collapsible nav group: parent row navigates to the overview route while a chevron button toggles the submenu; auto-opens on the active trail and becomes a hover/focus flyout in the collapsed icon-rail. |
| `Sidebar/SidebarItem.tsx`         | One sidebar NavLink (icon + label) with `aria-label` preserved when the label is hidden in the collapsed rail.                                                                                            |
| `Sidebar/SidebarStatusBadges.tsx` | Live group badges: `RunningBadge` (pulsing dot from `progressStore` while a job runs) and `ApprovalsBadge` (pending-approvals count via `adminService`).                                                  |
| `Sidebar/sidebar.css`             | Sidebar styles for desktop, collapsed icon-rail, and mobile overlay.                                                                                                                                      |

## ui/

One folder per primitive; styling mostly reuses the ported legacy stylesheets (`core/*.css`),
with co-located CSS only for component-specific extras.

| File                              | Purpose                                                                                                                                                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                        | Barrel for all ui primitives (`import { Button, Select, DataTable } from '@/components/ui'`).                                                                                                                                       |
| `Accordion/Accordion.tsx`         | FAQ-style expand/collapse Q&A list; `answer` is any ReactNode; single-open by default.                                                                                                                                              |
| `Accordion/Accordion.css`         | Accordion shell styles with the `slideDown` keyframe from the legacy strategic-research CSS.                                                                                                                                        |
| `Badge/Badge.tsx`                 | Small status pill with typed `tone` (success/danger/warning/info/secondary).                                                                                                                                                        |
| `Badge/Badge.css`                 | Tokenized pill styles unifying the ad-hoc Bootstrap badge variants onto the Quralyst palette.                                                                                                                                       |
| `Button/Button.tsx`               | Maps a typed `variant` to the legacy button classes (`core/buttons.css`); `loading` disables and shows an inline spinner.                                                                                                           |
| `Card/Card.tsx`                   | Base `.card` container (cards.css: 2px border, 20px radius, soft shadow).                                                                                                                                                           |
| `Card/CriteriaCard.tsx`           | Research-form card variants — light, deep (navy), white, glass (blur) — used for section panels in the 3 process wizards.                                                                                                           |
| `Checkbox/Checkbox.tsx`           | `.form-check` checkbox input with optional label; RHF-friendly via forwardRef.                                                                                                                                                      |
| `DataTable/DataTable.tsx`         | Generic typed-column table over the unified table styles (sticky gradient header, fixed-width columns); expandable cells open the CellModal like the legacy clickable-cell flow.                                                    |
| `DataTable/data-table.css`        | Centered loading/empty placeholder styles inside `.table-responsive`.                                                                                                                                                               |
| `Modal/Modal.tsx`                 | Generic dialog built on the in-house popup system (`.popup-overlay`/`.popup-box`) with a focus trap; replaces Bootstrap `data-bs-toggle` modals with React state.                                                                   |
| `Modal/CellModal.tsx`             | Context-mounted modal + `useCellModal().showCellModal(title, content)` for expanding truncated table cells (port of legacy `modals.js`); closes on ×, outside-click, and Escape.                                                    |
| `Modal/modal.css`                 | Shared co-located styles for Modal and CellModal (dialog width, unstyled close button).                                                                                                                                             |
| `NumberInput/NumberInput.tsx`     | RHF-friendly numeric field (`type=number`, `.form-control`) with optional label/error/pill.                                                                                                                                         |
| `Pagination/Pagination.tsx`       | Windowed page list with ellipses + Previous/Next, replacing the Jinja `render_pagination` macro and its JS twin; pill styling from pagination.css.                                                                                  |
| `RadioGroup/RadioGroup.tsx`       | Controlled radio set rendering `.form-check` rows (or inline); `radioClassName` enables the `.radio_btn` variant.                                                                                                                   |
| `ReloadOverlay/ReloadOverlay.tsx` | Full-screen blur overlay with spinning icon shown during page reloads / heavy transitions on the research pages.                                                                                                                    |
| `Select/Select.tsx`               | Custom dropdown port of legacy `dropdowns.js`: keyboard navigation, type-to-search (600ms reset), suggested-first highlighting, and a `portal` mode that renders the menu to `document.body` to escape `overflow:hidden` ancestors. |
| `Spinner/Spinner.tsx`             | Tokenized loading spinner in sm/md/lg sizes with an accessible label.                                                                                                                                                               |
| `Spinner/Spinner.css`             | The one shared spinner style (navy on faint ring), replacing the per-page Font Awesome / Bootstrap spinners.                                                                                                                        |
| `Tabs/Tabs.tsx`                   | Controlled rounded-pill tab row with optional icon and count badge; implements the WCAG tab pattern (roving tabindex, arrow/Home/End keys, automatic activation).                                                                   |
| `Tabs/Tabs.css`                   | Pill-tab styles (active pill = Quralyst navy) replacing Bootstrap nav-pills.                                                                                                                                                        |
| `TextInput/TextInput.tsx`         | RHF-friendly text field (`.form-control`; `pill` → `.rounded-pill`) with optional label/error.                                                                                                                                      |
| `Textarea/Textarea.tsx`           | RHF-friendly multiline field (`.form-control` textarea variant) with optional label/error.                                                                                                                                          |
| `Toggle/Toggle.tsx`               | Bootstrap form-switch checkbox styled by `core/forms.css`; RHF-friendly via forwardRef.                                                                                                                                             |
| `Tooltip/Tooltip.tsx`             | CSS hover tooltip (tooltips.css navy popover) wrapping a trigger — defaults to a `bi-info-circle` info icon.                                                                                                                        |

## wizard/

| File                | Purpose                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`          | Barrel for the wizard shell, consumed by the 3 process pages.                                                                                                                                                                                             |
| `Wizard.tsx`        | Numbered stepper + active-step body; forward navigation is gated by `onValidateStep` (return false to block), and step changes use view transitions.                                                                                                      |
| `Wizard.css`        | Net-new 3-step wizard chrome (stepper, sticky bottom nav bar, Step-3 review cards) matching the UI snapshots; also caps wizard page width.                                                                                                                |
| `Wizard.test.tsx`   | Tests step gating: advancing forward must pass `onValidateStep`; going back skips validation.                                                                                                                                                             |
| `WizardNavBar.tsx`  | Sticky bottom bar: navy "Step X of N" pill + step label on the left; back arrow (steps 2+), Save Draft, and the forward button on the right.                                                                                                              |
| `ReviewSummary.tsx` | Step-3 read-only summary: one card per section with label/value rows and an Edit link that jumps the wizard back to that section (the Generate action lives in WizardNavBar).                                                                             |
| `AiAssistPanel.tsx` | AI-assist controls in three modes (autofill, buyer-recommendation with editable prompt, custom-insights); currently returns canned suggestions after a simulated delay, to be swapped for `researchService.aiAssist` behind the same `onResult` callback. |

## Conventions

- `ui/` holds single-purpose primitives (one folder per component); `domain/` holds composite,
  feature-specific components built from them; `form/` holds RHF-oriented composites.
- Barrels exist for `ui/`, `form/`, `domain/`, and `wizard/` (import from `@/components/<dir>`);
  `auth/`, `billing/`, `feedback/`, and `layout/` have no barrel — import files directly.
- Co-located CSS is imported by its component so it bundles with it;
  many components instead rely on the globally loaded legacy stylesheets ported from the Flask app
  (`core/*.css`, page CSS) and ship no CSS of their own.
- Tests are co-located: `*.test.tsx` for behavior, `*.a11y.test.tsx` for axe-core accessibility
  audits.
- Header comments at the top of each file are the source of truth for intent and often name the
  legacy `Backup/` template or JS file the component ports.
