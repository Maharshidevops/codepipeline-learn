---
description: Stage, summarise, and commit changes with a clean message — enforcing the frontend branch rules.
argument-hint: [optional message or scope hint]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git log:*)
---

Create a commit for the current changes.

Context to gather first:

- Current branch: !`git rev-parse --abbrev-ref HEAD`
- Status: !`git status --short`
- Diff summary: !`git diff --stat HEAD`

Rules (Quralyst frontend workflow — strict):

1. **Never commit to or push `main`.** All work is on feature branches off **`Dev-frontend`**; PRs
   target **`Dev-frontend`**. If HEAD is `main`, stop and tell me to switch to a feature branch.
2. **Do not open the PR.** The repo owner creates PRs manually via the compare URL. You may commit;
   you may not push to `main` or auto-create PRs.
3. **Never stage secrets** (`.env*`, `*.pem`, keys). secretlint runs at pre-commit, but check anyway.
4. Message: `type(scope): subject` (≤72 chars, imperative; Conventional Commit types feat/fix/
   refactor/test/docs/chore/perf/style), optional short body explaining _why_. Reference the relevant
   `Phases/PHASE-*.md` when apt. No co-author/credit/tooling trailers.
5. Before committing, suggest running `npm run lint && npm run typecheck` if code changed.
6. Show me the proposed message + files to stage, commit after I confirm. Don't push.

If `$ARGUMENTS` is provided, use it as the intent/scope hint.

## Branches & PRs (Claude does not do these)

- **Do not create a branch** and **do not open a PR.** If the work needs a new branch, stop and
  ask the user for approval **and which base branch** to cut from; remind them to **`git pull`**
  the latest first. The repo owner creates the branch and the PR via the compare URL.
- Claude may commit on the current (already-checked-out) branch when asked, but never pushes to
  `main`.
