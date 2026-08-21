# .claude/hooks — shell scripts that fire automatically

These run inside **Claude Code** (the CLI/desktop agent), not in CI. They are registered in
[`../settings.json`](../settings.json) and written in **Node (`.mjs`)** — Node is this project's
runtime, so they work for everyone on Windows, macOS, and Linux. Each is best-effort and (except the
Bash guard) always exits 0, so it can never break a session.

| Hook                       | Event                                 | What it does                                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block-dangerous-bash.mjs` | `PreToolUse(Bash)`                    | **Blocks** (exit 2) `rm -rf /`, `~`, `$HOME`, repo-root; fork bombs; force-push; **push to `main`** (reminds you to use `Dev-frontend`); protected-branch deletes/hard-resets; `chmod -R 777`; disk writes; `curl … \| sh`; writing to `.env`. Everything else passes. |
| `graph-hint.mjs`           | `PreToolUse(Glob\|Grep)`              | If a graphify graph exists, reminds Claude to read `graphify-out/GRAPH_REPORT.md` / use `graphify query` before scanning raw files. (No-op until a graph is built.)                                                                                                    |
| `lint-check.mjs`           | `PostToolUse(Edit\|Write\|MultiEdit)` | Advisory only: runs the repo's local `prettier --check` + `eslint` (or `stylelint` for CSS) on the changed file and surfaces issues. Never blocks.                                                                                                                     |
| `graphify-update.mjs`      | `Stop`                                | Runs `graphify update .` once per turn if a graph exists. No-op otherwise.                                                                                                                                                                                             |
| `desktop-notify.mjs`       | `Stop`                                | Best-effort OS notification when Claude finishes.                                                                                                                                                                                                                      |

## Notes

- Invoked as `node .claude/hooks/<name>.mjs`, so **Node must be on PATH** (it always is for this
  project — same Node 22 as CI).
- `block-dangerous-bash.mjs` **fails open**: if it can't run, it does not block. It's a guard rail,
  not a security boundary. It knows the branch rule (never push to `main`; target `Dev-frontend`).
- `lint-check.mjs` is advisory and best-effort; the authoritative gate is the husky/lint-staged
  pre-commit hook plus CI.
- `desktop-notify.mjs` needs `notify-send` on Linux; on Windows install the `BurntToast` module for a
  real toast (otherwise it's a quiet no-op).

## Disable / customise

Remove a hook entry from `settings.json`, or override per-developer in the git-ignored
`settings.local.json`.
