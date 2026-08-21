---
description: Run the frontend quality gates (lint, CSS lint, typecheck, tests) the way CI does.
allowed-tools: Bash(npm run lint:*), Bash(npm run lint\:css:*), Bash(npm run typecheck:*), Bash(npm run test\:run:*)
---

Run the same gates the build enforces and report a concise pass/fail per step:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run lint:css` (token enforcement — raw color/radius/shadow literals fail)
4. `npm run test:run` (Vitest unit + integration + a11y axe)

Stop and summarise the first failing step with file:line and the smallest fix. If all pass, say so
in one line. Do not "fix" formatting by reformatting unrelated files.
