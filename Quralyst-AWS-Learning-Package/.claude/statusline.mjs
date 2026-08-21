#!/usr/bin/env node
// Status line: `dir | branch | model`. Reads Claude Code JSON on stdin; fast, no network.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
let data = {};
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch {}
const cwd = (data.workspace && data.workspace.current_dir) || process.cwd();
const model = (data.model && data.model.display_name) || 'Claude';
let branch = '?';
try { branch = (execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, timeout: 3000 }).toString().trim()) || '?'; } catch {}
process.stdout.write(`${basename(cwd)} ⎇ ${branch} · ${model}`);
