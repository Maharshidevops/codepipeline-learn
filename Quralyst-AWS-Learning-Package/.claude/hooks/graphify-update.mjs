#!/usr/bin/env node
// Stop hook — refresh the graphify graph once per turn if one exists. Best-effort, non-blocking.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
try { readFileSync(0, 'utf8'); } catch {}
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (existsSync(join(root, 'graphify-out', 'graph.json'))) {
  try { execFileSync('graphify', ['update', '.'], { cwd: root, timeout: 120000, stdio: 'ignore' }); } catch {}
}
process.exit(0);
