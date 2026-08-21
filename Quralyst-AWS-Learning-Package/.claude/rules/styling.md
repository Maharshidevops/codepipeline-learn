# Rule: styling & design tokens

**Applies to:** `src/styles/**`, any `*.css`

- **Plain global CSS, no CSS Modules.** Load order is **load-bearing**: `core/ → components/ →
pages/`. Don't reorder imports casually.
- **Tokens only.** Never write raw color, radius, or shadow literals — use the CSS variables
  (`var(--…)`). **stylelint blocks raw literals** (`npm run lint:css`), and so should you in review.
  - Light/dark theme contract (colors + shadows): `src/styles/core/colors.css`.
  - Theme-invariant radius scale: `src/styles/core/tokens.css`.
- **Theme-aware by construction:** style with tokens so light/dark "just works". For values that must
  reach JS (e.g. chart colors), read them live with `useThemeTokens` rather than duplicating.
- **Naming:** lowercase-hyphen class names; keep component styles self-contained; put responsive media
  queries with the component they affect.
- **Self-hosted assets only** (fonts via `@fontsource`, Bootstrap Icons, Bootswatch Flatly). Don't add
  CDN `<link>`s — the built app must make zero third-party requests, and the CSP forbids them.
- Design-system reference: `Phases/REF-DESIGN-SYSTEM.md`.
