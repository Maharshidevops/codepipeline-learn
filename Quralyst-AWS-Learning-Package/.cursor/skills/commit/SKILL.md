---
name: commit
description: Stage, summarise, and commit current changes with a clean Conventional-Commit message, enforcing the Quralyst frontend branch rules (never commit/push main; work off Dev-frontend; the AI never branches or opens PRs).
---

# commit

Create a commit for the current changes. Any text after `/commit` is the intent/scope hint.

Gather context first (run these):

- Current branch: `git rev-parse --abbrev-ref HEAD`
- Status: `git status --short`
- Diff summary: `git diff --stat HEAD`

Rules (Quralyst frontend workflow — strict):

1. **Never commit to or push `main`.** All work is on feature branches off **`Dev-frontend`**; PRs
   target **`Dev-frontend`**. If HEAD is `main`, stop and tell me to switch to a feature branch.
2. **Do not open the PR.** The repo owner creates PRs manually via the compare URL. You may commit; you
   may not push to `main` or auto-create PRs.
3. **Never stage secrets** (`.env*`, `*.pem`, keys). secretlint runs at pre-commit, but check anyway.
4. Message: `type(scope): subject` (≤72 chars, imperative; Conventional Commit types feat/fix/refactor/
   test/docs/chore/perf/style), optional short body explaining _why_. Reference the relevant
   `Phases/PHASE-*.md` when apt. No co-author/credit/tooling trailers.
5. Before committing, suggest running `npm run lint && npm run typecheck` if code changed.
6. Show me the proposed message + files to stage, commit after I confirm. Don't push.

## Branches & PRs (the AI does not do these)

- **Do not create a branch** and **do not open a PR.** If the work needs a new branch, stop and ask for
  approval **and which base branch** to cut from; remind me to **`git pull`** the latest first. The repo
  owner creates the branch and the PR via the compare URL. You may commit on the current branch when
  asked, but never push to `main`.
