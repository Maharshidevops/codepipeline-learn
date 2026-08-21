#!/usr/bin/env node
// Stop hook — best-effort desktop notification when Claude finishes. Never blocks.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
try { readFileSync(0, 'utf8'); } catch {}
const TITLE = 'Claude Code - Quralyst frontend';
const MSG = 'Finished this turn.';
try {
  if (process.platform === 'darwin')
    execFileSync('osascript', ['-e', `display notification "${MSG}" with title "${TITLE}"`], { timeout: 10000, stdio: 'ignore' });
  else if (process.platform === 'linux')
    execFileSync('notify-send', [TITLE, MSG], { timeout: 10000, stdio: 'ignore' });
  else if (process.platform === 'win32')
    execFileSync('powershell', ['-NoProfile', '-Command',
      `if (Get-Module -ListAvailable -Name BurntToast){Import-Module BurntToast; New-BurntToastNotification -Text '${TITLE}','${MSG}'} else { Write-Host '${TITLE}: ${MSG}' }`],
      { timeout: 10000, stdio: 'ignore' });
} catch {}
process.exit(0);
