#!/usr/bin/env node
// Cursor afterFileEdit hook — advisory prettier/eslint/stylelint on the changed file.
// Observability: runs the local tools and surfaces issues on stderr. Never blocks; returns {}.
// Best-effort: no-ops if the tool isn't installed in node_modules/.bin.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

function done() { process.stdout.write(JSON.stringify({})); process.exit(0); }

let data = {};
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch { done(); }
// Cursor passes the edited file path at the top level; tolerate a nested shape too.
const file = data.file_path || data.path || (data.tool_input && data.tool_input.file_path) || '';
if (!file || !existsSync(file)) done();

const roots = Array.isArray(data.workspace_roots) ? data.workspace_roots : [];
const root = roots[0] || process.env.CURSOR_WORKSPACE_ROOT || process.cwd();
const win = process.platform === 'win32';
function bin(name) {
  const p = join(root, 'node_modules', '.bin', name);
  if (existsSync(p)) return p;
  if (existsSync(p + '.cmd')) return p + '.cmd';
  return null;
}
const out = [];
function run(name, args) {
  const b = bin(name);
  if (!b) return;
  try {
    execFileSync(b, args, { cwd: root, timeout: 25000, stdio: 'pipe', shell: win });
  } catch (e) {
    const msg = ((e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')).trim();
    if (msg) out.push(`${name}:\n${msg.slice(0, 1500)}`);
  }
}
if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) { run('prettier', ['--check', file]); run('eslint', [file]); }
else if (/\.css$/.test(file)) { run('prettier', ['--check', file]); run('stylelint', [file]); }
if (out.length) process.stderr.write(out.join('\n\n') + '\n');
done();
