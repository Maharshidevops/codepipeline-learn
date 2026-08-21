#!/usr/bin/env node
// PreToolUse(Bash) guard — blocks catastrophic / policy-violating shell commands.
// Reads the tool call as JSON on stdin; exit 2 blocks the call and shows the reason.
// Fail-open: unparseable input is allowed. Cross-platform (Node).
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

let data = {};
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
if (data.tool_name !== 'Bash') process.exit(0);
const cmd = (data.tool_input && data.tool_input.command) || '';
for (const [re, reason] of RULES) {
  if (re.test(cmd)) {
    process.stderr.write(
      `BLOCKED by .claude/hooks/block-dangerous-bash.mjs: ${reason}\n` +
      `Command: ${cmd}\nIf this is truly intended, run it yourself in a terminal.\n`);
    process.exit(2);
  }
}
process.exit(0);
