#!/usr/bin/env node
// Cursor beforeShellExecution hook — block catastrophic / policy-violating shell commands.
// Reads the proposed command as JSON on stdin; writes a JSON decision on stdout:
//   {"permission":"allow"|"deny"|"ask","agent_message":"...","user_message":"..."}
// Fail-open: unparseable input is allowed (guard rail, not a security boundary). Node, cross-platform.
import { readFileSync } from 'node:fs';

const RULES = [
  [/\brm\s+(-\w*\s+)*-?[rf]\w*\s+(-\w+\s+)*(\/|\/\*|~|~\/|\$HOME|\.{1,2})(\s|$)/i,
    'Recursive rm targeting /, ~, $HOME, or the repo root.'],
  [/:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, 'Fork bomb.'],
  [/\bgit\s+push\b[^\n]*\s(--force|-f)(\s|$|=)/i,
    'Force push. Use --force-with-lease; never force-push shared branches.'],
  [/\bgit\s+push\b[^\n]*\b(origin\s+)?main\b/,
    'Pushing to main is against the workflow. PR into Dev-frontend instead.'],
  [/\bgit\s+branch\s+-D\s+(main|Dev-frontend)\b/, 'Deleting a protected branch (main/Dev-frontend).'],
  [/\bgit\s+reset\s+--hard\s+origin\/(main|Dev-frontend)\b/i,
    'Hard reset onto a shared branch can destroy local work.'],
  [/\bchmod\s+-R\s+0?777\b/i, 'Recursive chmod 777 is a security hazard.'],
  [/\bmkfs\b|\bdd\s+if=.*\s+of=\/dev\/|>\s*\/dev\/sd[a-z]/i,
    'Disk/device write — could destroy a filesystem.'],
  [/\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba)?sh\b/i, 'Piping a downloaded script into a shell.'],
  [/\bsudo\s+rm\s+-\w*[rf]/i, 'sudo recursive rm.'],
  [/(^|\s|;)(>|>>|tee\s+)\s*\.env(\s|$|\.)/i, 'Writing to .env would clobber secrets. Edit it manually.'],
];

function allow() { process.stdout.write(JSON.stringify({ permission: 'allow' })); process.exit(0); }

let data = {};
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch { allow(); }
// Cursor puts the proposed command at the top level; tolerate a nested shape too.
const cmd = data.command || (data.tool_input && data.tool_input.command) || '';
for (const [re, reason] of RULES) {
  if (re.test(cmd)) {
    process.stdout.write(JSON.stringify({
      permission: 'deny',
      agent_message:
        `BLOCKED by .cursor/hooks/block-dangerous-bash.mjs: ${reason} ` +
        'If this is truly intended, run it yourself in a terminal.',
      user_message: `Blocked a dangerous command: ${reason}`,
    }));
    process.exit(0);
  }
}
allow();
