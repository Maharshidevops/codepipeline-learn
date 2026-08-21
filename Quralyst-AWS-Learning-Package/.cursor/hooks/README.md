# .cursor/hooks — scripts that fire automatically in Cursor

These run inside **Cursor** (the editor/agent), not in CI. They are registered in
[`../hooks.json`](../hooks.json) and written in **Node (`.mjs`)** to match this repo's tooling (Node
22). They mirror the Claude Code hooks under `.claude/hooks/`.

| Hook                       | Cursor event           | What it does                                                                                                                                                                                                                                       | Claude equivalent                            |
| -------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `block-dangerous-bash.mjs` | `beforeShellExecution` | **Denies** `rm -rf /`/`~`/`$HOME`/repo-root, fork bombs, force-push, **push to `main`**, protected-branch (`main`/`Dev-frontend`) deletes/hard-resets, `chmod -R 777`, disk writes, `curl … \| sh`, writing to `.env`. Everything else is allowed. | `block-dangerous-bash.mjs` (PreToolUse·Bash) |
| `block-secret-reads.mjs`   | `beforeReadFile`       | **Denies** reading `.env*` (except `*.example`/`*.structure`) and `*.pem`.                                                                                                                                                                         | `settings.json` `permissions.deny`           |
| `lint-check.mjs`           | `afterFileEdit`        | Advisory: runs `prettier --check` + `eslint` (TS/JS) or `prettier` + `stylelint` (CSS) on the changed file; surfaces issues on stderr. Never blocks.                                                                                               | `lint-check.mjs` (PostToolUse·Edit/Write)    |
| `graphify-update.mjs`      | `stop`                 | **Dormant** (graphify isn't installed here); no-ops until a `graphify-out/graph.json` appears.                                                                                                                                                     | `graphify-update.mjs` (Stop)                 |
| `desktop-notify.mjs`       | `stop`                 | Best-effort OS notification when the turn ends.                                                                                                                                                                                                    | `desktop-notify.mjs` (Stop)                  |

## Contract (per the official Cursor Hooks spec)

Cursor passes each hook a JSON object on **stdin** and reads a JSON object from **stdout**. Field
names are **snake_case**:

- **Permission hooks** (`beforeShellExecution`, `beforeReadFile`) return
  `{"permission": "allow" | "deny" | "ask", "agent_message": "...", "user_message": "..."}`.
  `agent_message` is shown to the agent; `user_message` is shown in the client. These scripts **fail
  open** (return `allow`) on any parse error. (Exit code `2` is also treated as `deny`; other non-zero
  codes fail open.)
- **Observability hooks** (`afterFileEdit`, `stop`) return `{}` and surface any notes on stderr.

Input field names used here: `command` (beforeShellExecution), `file_path` (beforeReadFile /
afterFileEdit), `workspace_roots` (stop) — all per the spec.

## Notes

- Invoked as `node ./.cursor/hooks/<name>.mjs`, so **Node must be on PATH** (it is — this is a Node
  project). `lint-check` resolves tools from the repo's `node_modules/.bin`, so run `npm install` first.
- `desktop-notify.mjs` needs `notify-send` on Linux; on Windows install the `BurntToast` PowerShell
  module for a real toast (otherwise it's a quiet no-op).
- **Not ported:** Claude's `graph-hint` (PreToolUse·Glob/Grep) has no Cursor event; and graphify is
  dormant in this repo anyway (see `CLAUDE.md` §9 / `rules/project-overview.mdc`).

## Config locations Cursor reads (in order)

Project `<root>/.cursor/hooks.json` (committed here) · User `~/.cursor/hooks.json` · enterprise paths.

## Disable / customise

Remove an entry from `hooks.json`, or point its command at a no-op.
