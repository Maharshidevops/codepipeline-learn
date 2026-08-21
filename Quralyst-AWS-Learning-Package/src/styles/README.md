# src/styles/

Global stylesheets and the theming system. Layering is `core/` (reset → tokens → colors → typography → buttons → forms → alerts) → `components/` → `pages/`, and **load order is load-bearing**: `main.tsx` imports vendor CSS (Bootswatch Flatly, icons, fonts) first, then `core/index.css`, `components/index.css`, and `globals.css` — the `@import` order inside the two index files and the vendor-first rule keep the `!important` Bootstrap overrides and token definitions winning the cascade. The light/dark token contract lives in `core/colors.css` as `:root[data-theme='light'|'dark']` blocks (every theme re-provides the same token names, including the `--shadow-*` set); the theme-invariant radius scale lives in `core/tokens.css`. The `var(--token, #hex)` fallback convention seen throughout is deliberate and kept, and stylelint (`.stylelintrc.json`, `stylelint-declaration-strict-value`) blocks raw color/background/box-shadow/border-radius literals everywhere except `core/colors.css` and `core/tokens.css`.

## Root files

| File                    | Purpose                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `globals.css`           | App-level globals layered on top of core/components: `#root` flex column, body font/color, and the view-transition cross-fade (reduced-motion-safe).                                                                                  |
| `themes.ts`             | Theme registry (light / dark / auto) — single source of truth for `ThemeId`, `DEFAULT_THEME`, the `isThemeId` guard, and the sidebar control; the no-FOUC inline script in `index.html` carries a synced copy of the id → base logic. |
| `themeResolver.ts`      | Resolves a (possibly `auto`) `ThemeId` to the concrete `light`/`dark` palette via `prefers-color-scheme`, plus `onSystemSchemeChange` subscription for `auto` mode.                                                                   |
| `tokens.ts`             | `THEME_TOKEN_NAMES` — typed registry of token _names_ for JS consumers, read live by `useThemeTokens()` via `getComputedStyle` (CSS stays the single source of truth for values; no hex mirror to drift).                             |
| `themes.test.ts`        | Registry invariants: unique ids, valid `bsBase`, registered `DEFAULT_THEME`, `isThemeId` accept/reject cases.                                                                                                                         |
| `themes.parity.test.ts` | Asserts every non-auto theme in `themes.ts` has a matching `[data-theme='<id>']` block in `core/colors.css`.                                                                                                                          |

## core/

| File             | Purpose                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.css`      | Core entry point — `@import`s the files below in dependency order (reset → tokens → colors → typography → buttons → forms → alerts); order matters.                                                                       |
| `reset.css`      | Universal margin/padding/box-sizing reset plus the html/body horizontal-overflow guard.                                                                                                                                   |
| `tokens.css`     | Theme-invariant radius scale (`--radius-xs` … `--radius-pill`/`--radius-full`), census-driven; idiomatic values (50% circles, 3px scrollbars, compound corners) are deliberately not tokenized.                           |
| `colors.css`     | The theme token contract and engine: light (default) and dark `:root[data-theme]` blocks providing the surface elevation ladder, text/border/brand/link/status tokens and `--shadow-*`; in dark, lightness encodes depth. |
| `typography.css` | `--font-primary` (Roboto) plus the font-size and font-weight scales.                                                                                                                                                      |
| `buttons.css`    | Button sizing/transition tokens and the `.btn-standard` family (`!important` overrides of Bootstrap's `.btn`).                                                                                                            |
| `forms.css`      | Form spacing/border tokens and base form layout (`.form-section`, `.form-label`).                                                                                                                                         |
| `alerts.css`     | Alert banner variants (success/danger/info/warning) and popup styles.                                                                                                                                                     |

## components/

| File                 | Purpose                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.css`          | Components entry point — `@import`s the files below in order; `sidebar.css` and `progress-modal.css` are intentionally absent (co-located with their components).    |
| `layout.css`         | Workspace shell: sidebar/main-content layout tokens (`--sidebar-width` clamp, breakpoints) and the main wrapper/containers — retune the shell here, not in page CSS. |
| `cards.css`          | Base `.card` container and variants.                                                                                                                                 |
| `criteria-cards.css` | `.criteria-card` variants (light / white / deep-navy) used by the research wizard forms.                                                                             |
| `tables.css`         | Unified table styling for all tables (titles, headers, badges, comment textarea/buttons).                                                                            |
| `pagination.css`     | Shared pagination styling for all paged lists.                                                                                                                       |
| `tooltips.css`       | Info-tooltip icon and bubble styles.                                                                                                                                 |
| `dropdowns.css`      | Custom dropdown selects/menus; per-theme `--dropdown-arrow` data-URI chevrons (data URIs can't read CSS vars, so each theme provides the URI once).                  |
| `form-controls.css`  | Radio buttons, checkboxes, inputs, and toggle switches.                                                                                                              |
| `research-forms.css` | Shared form chrome (`.criteria-container`, etc.) common to the three research wizard pages.                                                                          |
| `reload-overlay.css` | Full-screen processing overlay used by the target and strategic research wizards.                                                                                    |
| `results-common.css` | Shared layout/header styles for all results pages (`.results-page`).                                                                                                 |
| `tab-nav.css`        | Shared horizontal pill tab row used by both the result workspace (`ResultLayout`) and the Organization sub-nav (`OrgSubnav`).                                        |

## pages/

Page CSS is imported by the page component itself (so it code-splits with the route), not by an index file.

| File                              | Purpose                                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-registrations.css`         | Admin approval pages (`PendingRegistrationsPage`, `OrganizationApprovalsPage`, `OrganizationUpdatesPage`); main content only, scoped under its own `--admin-*` tokens. |
| `auth.css`                        | Login/signup split layout (imported by `AuthLayout`).                                                                                                                  |
| `billing.css`                     | Billing status pages: checkout success/cancel and invite accept/invalid.                                                                                               |
| `faq.css`                         | `FaqPage` accordion and layout.                                                                                                                                        |
| `financial-verticals.css`         | Financial Verticals wizard (`FinancialVerticalsPage`; also imported by `FinancialVerticalsDatabasePage`).                                                              |
| `financial-verticals-results.css` | `FinancialVerticalsResultsPage` results table.                                                                                                                         |
| `manage-results.css`              | `ManageResultsPage` header/list styling.                                                                                                                               |
| `org-settings.css`                | Organization settings tab pages rendered inside `OrgSettingsLayout` (Members, Domains, Usage, Credit Ledger, Updates).                                                 |
| `previous-results.css`            | `PreviousResultsPage`; page-specific only — buttons/forms/colors inherit from core.                                                                                    |
| `preview-result.css`              | `PreviewResultPage` (preview of a generated result).                                                                                                                   |
| `process-preference.css`          | `ProcessPreferencePage` (list-type selection) including the 3D background objects.                                                                                     |
| `profile.css`                     | `ProfilePage` sections and form styling.                                                                                                                               |
| `quralyst-research.css`           | `TargetListPage` — the Target List (Quralyst research) wizard.                                                                                                         |
| `strategic-research.css`          | `StrategicResearchPage` wizard, including the chatbot modal styles.                                                                                                    |
| `summary.css`                     | `SummaryPage` (uses its own DM Sans font stack).                                                                                                                       |
| `user-preferences.css`            | `UserPreferencesPage` (API keys and settings).                                                                                                                         |
| `view-result.css`                 | `ViewPreviousResultPage` result workspace (filter controls panel, etc.).                                                                                               |

## Conventions

- **Brand navy never flips:** `--brand-navy` stays `#282561` in dark (white text sits on it), while `--color-primary` remaps to `#8d8ad9` in dark for text contrast — never use `--color-primary` for navy fills.
- **`var(--token, #hex)` fallbacks** are kept on purpose (legacy parity); stylelint's `ignoreVariables` permits them.
- **Stylelint token enforcement:** raw color/fill/stroke/background/box-shadow/border-radius/border literals fail lint outside `core/colors.css` / `core/tokens.css` (a small allowlist of off-scale radii is grandfathered in `.stylelintrc.json`).
- **New component CSS may be co-located** next to its component instead of added under `components/` (e.g. `Sidebar`'s `sidebar.css`, `ProgressModal`'s `progress-modal.css`, `src/features/results/viewResult/comment-modal.css`).
- **Adding a theme** = one entry in `themes.ts` + one `:root[data-theme='<id>']` block in `core/colors.css` (+ sync the no-FOUC script in `index.html`); `themes.parity.test.ts` enforces the pairing.
