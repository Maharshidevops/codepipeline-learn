#!/usr/bin/env node
// Cursor stop hook — refresh the graphify graph once per turn IF one exists.
// graphify is NOT installed in this repo, so this is DORMANT and no-ops until a
// graphify-out/graph.json appears. Best-effort, non-blocking; returns {}.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

let data = {};
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch {}
const roots = Array.isArray(data.workspace_roots) ? data.workspace_roots : [];
const root = roots[0] || process.cwd();
if (existsSync(join(root, 'graphify-out', 'graph.json'))) {
  try { execFileSync('graphify', ['update', '.'], { cwd: root, timeout: 120000, stdio: 'ignore' }); } catch {}
}
process.stdout.write(JSON.stringify({}));
process.exit(0);
