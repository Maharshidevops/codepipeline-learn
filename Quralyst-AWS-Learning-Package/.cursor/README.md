# .cursor — Cursor editor config (mirrors the `.claude/` toolkit)

This folder gives **Cursor** the same operating context the repo gives **Claude Code** under
`.claude/`, using Cursor's own mechanisms. Keep these in sync with `.claude/` and the root `CLAUDE.md`
when an architectural fact changes. Formats follow the official Cursor docs (`cursor.com/docs`):
Rules, Skills, Subagents, and Hooks.

## Layout

```
.cursor/
  rules/          *.mdc project rules (auto-loaded by scope)
  agents/         *.md subagents (invoke /<name>, or auto-delegated)
  skills/<name>/  SKILL.md workflow skills (invoke /<name>)
  hooks.json      hook registrations
  hooks/          hook scripts (Node .mjs) + README
```

## Rules (`.cursor/rules/*.mdc`)

Frontmatter controls when each rule loads (only `.mdc` files are read; a plain `.md` is ignored):

- `alwaysApply: true` → always in context (≈ Claude's `@`-imported / force-loaded rules).
- `globs: a/**,b/**` (comma-separated string) + `alwaysApply: false` → auto-attached when matching
  files are in context (≈ Claude's `Applies to:` glob-scoped sheets).

| File                    | Mirrors `.claude/`           | Scope                                                           |
| ----------------------- | ---------------------------- | --------------------------------------------------------------- |
| `project-overview.mdc`  | `CLAUDE.md` (condensed)      | always-on                                                       |
| `components.mdc`        | `rules/components.md`        | `src/components/**,src/features/**,src/pages/**,src/layouts/**` |
| `styling.mdc`           | `rules/styling.md`           | `src/styles/**,**/*.css`                                        |
| `services-and-data.mdc` | `rules/services-and-data.md` | `src/services/**,src/lib/caseMapper*,src/config.ts`             |
| `routing-and-state.mdc` | `rules/routing-and-state.md` | `src/routes/**,src/store/**,src/hooks/**`                       |
| `testing.mdc`           | `rules/testing.md`           | `src/test/**,**/*.test.ts,**/*.test.tsx`                        |

## Subagents (`.cursor/agents/*.md` — invoke `/<name>` or by description)

Cursor subagents are the native equivalent of Claude's `.claude/agents/`. Markdown + frontmatter
(`name`, `description`, `model: inherit`, `readonly`).

| Agent              | Mirrors `.claude/agents/` | `readonly`         |
| ------------------ | ------------------------- | ------------------ |
| `code-reviewer`    | `code-reviewer.md`        | `true`             |
| `debugger`         | `debugger.md`             | `false` (may edit) |
| `security-auditor` | `security-auditor.md`     | `true`             |

## Skills (`.cursor/skills/<name>/SKILL.md` — invoke `/<name>`)

Cursor's current mechanism for custom commands. Frontmatter `name` + `description`.

| Skill    | Mirrors `.claude/commands/` |
| -------- | --------------------------- |
| `commit` | `commit.md`                 |
| `check`  | `check.md`                  |

## Hooks (`.cursor/hooks.json` + `.cursor/hooks/`)

See `hooks/README.md`. Maps Claude's PreToolUse/PostToolUse/Stop hooks onto Cursor's
`beforeShellExecution` / `beforeReadFile` / `afterFileEdit` / `stop` events. Node `.mjs` scripts;
output JSON is **snake_case** (`permission`, `agent_message`, `user_message`) per the Cursor spec.
`graphify-update` is dormant (graphify isn't installed here).

## Parity notes / known gaps

- graphify is **not installed** in this repo — there is no graphify rule/skill, and the
  `graphify-update` hook is dormant (mirrors `CLAUDE.md` §9). If a graph ever appears, adopt the
  backend's graphify conventions then.
- Claude's `graph-hint` hook (Glob/Grep nudge) has no Cursor event.
- Claude's `statusLine` and the `permissions.allow` list are Claude-Code-specific (the secret-read
  **deny** part is ported as the `block-secret-reads` hook).
- Cursor also reads `AGENTS.md` (plain markdown) as an always-on instruction file; this repo uses
  `rules/project-overview.mdc` for that role instead — don't add both.
- Personal/device prefs (Claude's `CLAUDE.local.md.example`) belong in Cursor user settings, not here.
