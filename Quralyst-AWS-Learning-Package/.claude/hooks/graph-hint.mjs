#!/usr/bin/env node
// PreToolUse(Glob|Grep) — nudge to use the knowledge graph before scanning raw files.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
try { readFileSync(0, 'utf8'); } catch {}
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (existsSync(join(root, 'graphify-out', 'graph.json'))) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    additionalContext: 'graphify: a knowledge graph exists. Read graphify-out/GRAPH_REPORT.md or use `graphify query/path/explain` before scanning raw files.' } }));
}
process.exit(0);
