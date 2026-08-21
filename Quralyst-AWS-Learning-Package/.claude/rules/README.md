# .claude/rules — glob-scoped working notes

Each file is a focused rule-sheet for one area of `src/`. They are **referenced from the root
`CLAUDE.md`** so the right context loads when you touch that area, without bloating the always-on
`CLAUDE.md`. The `Applies to:` glob at the top of each file says which paths it governs. Note: most
`src/` folders also have their own `README.md` describing every file — read those too.

| File                   | Applies to                                                               |
| ---------------------- | ------------------------------------------------------------------------ |
| `components.md`        | `src/components/**`, `src/features/**`, `src/pages/**`, `src/layouts/**` |
| `styling.md`           | `src/styles/**`, any `*.css`                                             |
| `services-and-data.md` | `src/services/**`, `src/lib/caseMapper*`, `src/config.ts`                |
| `routing-and-state.md` | `src/routes/**`, `src/store/**`, `src/hooks/**`                          |
| `testing.md`           | `src/test/**`, `**/*.test.ts(x)`                                         |
