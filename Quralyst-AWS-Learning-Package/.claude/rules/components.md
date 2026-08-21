# Rule: components, features, pages, layouts

**Applies to:** `src/components/**`, `src/features/**`, `src/pages/**`, `src/layouts/**`

- **Function components only.** No class components. This repo uses **React 19 + the React
  Compiler**, which auto-memoizes — do **not** hand-add `useMemo`/`useCallback`/`memo` for what the
  compiler handles. Write clean, readable components with correct dependencies.
- **Where things go:** reusable primitives in `components/ui/`; cross-cutting widgets in
  `components/domain|feedback|form|layout|wizard/`; feature composition in `features/`; one screen per
  file in `pages/`; shells in `layouts/`. Check the folder's own `README.md` before adding a file.
- **Props** are fully typed (no `any`). Prefer composition over boolean prop explosions.
- **No data fetching in presentational components** — get data from a hook backed by TanStack Query
  (see `services-and-data.md`) and pass it down.
- **Accessibility:** semantic elements, labelled controls, keyboard reachable; jsx-a11y must pass and
  new UI needs a `vitest-axe` check.
- **Forms:** React Hook Form + Zod resolver; surface errors accessibly.
- **Charts** (ApexCharts) are Summary-page only and lazy; read colors from theme tokens via
  `useThemeTokens`, never hard-code.
