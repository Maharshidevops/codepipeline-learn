# src/features/

Feature-scoped composition: multi-file building blocks that belong to one feature or page, as opposed to the generic, reusable primitives in `src/components/`. Today this holds the wizard **step components** for the three research wizards (`research/fv`, `research/strategic`, `research/target` — each step is assembled by its page, which owns the react-hook-form state and submit logic) and the **result-workspace widgets** for the view-result pages (`results/viewResult`), including the per-row comments system.

## research/fv/ — Financial Verticals wizard

| File                          | Purpose                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Step1BusinessAttributes.tsx` | FV step 1: target description textarea, business-type radios, HQ country/state (`LocationSelector` singleRow), and industry + dynamic sub-industry selects with a custom-entry toggle.                |
| `Step2SizePeExposure.tsx`     | FV step 2: revenue/EBITDA/equity-check/enterprise-value min–max rows, the three PE-exposure pill checkboxes (at least one required, surfaced via `peError`), and the "request a PE contact" checkbox. |

## research/strategic/ — Strategic / Buyer List wizard

| File                   | Purpose                                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`            | Zod schema + defaults + draft helpers for `StrategicForm`; field validation is intentionally light (legacy parity) — cross-field rules are enforced at submit time in the page.                                                                           |
| `Step1Attributes.tsx`  | Step 1: selling-company attributes (descriptions, industry/sub-industry, activity radios, skip-scraping toggle) plus the deep-navy ideal-buyer recommendation card with `AiAssistPanel`.                                                                  |
| `Step2SizeGeoData.tsx` | Step 2: size criteria with AND/OR logic, geographic criteria, file upload + inline custom insights, and enrichment/search toggles with cross-field auto-lock rules (Apollo forced on by gmaps/coresignal/linkedin; Coresignal disabled by skip-scraping). |
| `Step3Review.tsx`      | Step 3: builds the `ReviewSummary` sections from current RHF values (attributes, buyer recommendation, size & geography, custom insights, data sources); "Generate List →" submits.                                                                       |

## research/target/ — Target List (Quralyst research) wizard

| File                | Purpose                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Step1Activity.tsx` | Step 1: business criteria — `business_query[]` textareas, industry/sub-industry selects, activity radios, primary-business and skip-scraping toggles, plus the "Auto Fill with Ai" panel that writes results via `setValue`.   |
| `Step2SizeGeo.tsx`  | Step 2: geographic criteria card, size criteria (revenue/employees + AND/OR logic), file upload + custom-insights generation, enrichment toggles with the API-key warning banner, and additional company-search count reveals. |

## results/viewResult/ — result workspace widgets

| File                         | Purpose                                                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ScoringPanel.tsx`           | Collapsible "How Scoring Works" panel; drives the legacy max-height/chevron animation and `aria-expanded`.                                                                                                                        |
| `useResultFilters.ts`        | Client-side filter + sort engine for the results grid over `Record<string, string>` rows; resolves columns by fuzzy header match so it works regardless of column order.                                                          |
| `useResultFilters.test.ts`   | Tests that search filters rows and `sortColumn` reorders them numeric-aware.                                                                                                                                                      |
| `FilterControlsPanel.tsx`    | The in-table Filters box (search, fit-status/source/country selects, employee/revenue/score ranges, sort controls, active-filter tags); pure controlled component — state lives in the parent via `useResultFilters`.             |
| `FilesProcessingSummary.tsx` | "Files Processing Summary" card: stats, applied-filters grid, and data-sourcing grid driven by `ResultSummary` metadata; per-file columns degrade to N/A in dummy mode.                                                           |
| `InputFilesUsed.tsx`         | Standalone "Input Files Used" table driven by `ResultSummary.filesUploaded`; renders nothing when no files were uploaded.                                                                                                         |
| `CommentModal.tsx`           | The two positioned comment slots per company row (1 = Internal Note, 2 = External Talking Point); one comment per slot — save over = update, save empty = clear; edit/delete author-gated; `readOnly` mode hides editor controls. |
| `CommentModal.test.tsx`      | MSW-backed component test: renders the slots, exercises the add flow, author-only gating, and read-only mode.                                                                                                                     |
| `CommentStatsStrip.tsx`      | Per-result comment totals + per-user breakdown from the stats endpoint; renders nothing while the result has no comments.                                                                                                         |
| `commentsColumn.tsx`         | Factory for the leading table column: chat-icon button with count badge that opens `CommentModal`; shared by the Data tab (editable) and Preview tab (read-only).                                                                 |
| `useCommentCounts.ts`        | `companyName → count` map from one all-comments query (not per-row); mutations invalidate the `['comments', resultId]` prefix so badges update without refetching the table.                                                      |
| `comment-modal.css`          | Comment-system styles relocated from `pages/preview-result.css` and co-located here so they load wherever the workspace renders the comment UI.                                                                                   |
