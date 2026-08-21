#!/usr/bin/env node
// Cursor beforeReadFile hook — deny reading secret files.
// Mirrors the Claude settings.json permissions.deny list (.env, .env.local, .env.*.local, **/*.pem).
// Reads the target path on stdin; writes {"permission":"allow"|"deny","user_message":"..."} on stdout.
// Fail-open on parse errors.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

// .env / .env.local / .env.*.local / .env.<anything>  (but not committed *.example/*.structure), and *.pem
const DENY = [/(^|[\\/])\.env(\.[^\\/]*)?$/i, /\.pem$/i];
const ALLOW_SUFFIX = ['.example', '.structure'];

function allow() { process.stdout.write(JSON.stringify({ permission: 'allow' })); process.exit(0); }

let data = {};
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch { allow(); }
const path = data.file_path || data.path || '';
if (!path) allow();
const norm = path.replace(/\\/g, '/');
const base = basename(norm);
if (ALLOW_SUFFIX.some((s) => base.endsWith(s))) allow();
for (const re of DENY) {
  if (re.test(norm)) {
    process.stdout.write(JSON.stringify({
      permission: 'deny',
      agent_message:
        'BLOCKED by .cursor/hooks/block-secret-reads.mjs: reading secret files (.env*, *.pem) is not ' +
        'allowed. Only the documented public VITE_* vars belong in client code.',
      user_message: `Blocked reading a secret file: ${base}`,
    }));
    process.exit(0);
  }
}
allow();
