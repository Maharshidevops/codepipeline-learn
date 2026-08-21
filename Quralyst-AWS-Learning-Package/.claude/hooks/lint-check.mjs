#!/usr/bin/env node
// PostToolUse(Edit|Write|MultiEdit) — advisory prettier/eslint/stylelint on the changed file.
// Non-blocking: surfaces issues as additionalContext, never fails the edit. Best-effort.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

function emit(context) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: context } }));
}

let data = {};
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
const ti = data.tool_input || {};
const file = ti.file_path || ti.path || '';
if (!file || !existsSync(file)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const win = process.platform === 'win32';
function bin(name) {
  const p = join(root, 'node_modules', '.bin', name);
  if (existsSync(p)) return p;
  if (existsSync(p + '.cmd')) return p + '.cmd';
  return null;
}
const out = [];
function run(name, args) {
  const b = bin(name); if (!b) return;
  try { execFileSync(b, args, { cwd: root, timeout: 25000, stdio: 'pipe', shell: win }); }
  catch (e) {
    const msg = ((e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')).trim();
    if (msg) out.push(`${name}:\n${msg.slice(0, 1500)}`);
  }
}
if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) { run('prettier', ['--check', file]); run('eslint', [file]); }
else if (/\.css$/.test(file)) { run('prettier', ['--check', file]); run('stylelint', [file]); }
if (out.length) emit(out.join('\n\n'));
process.exit(0);
