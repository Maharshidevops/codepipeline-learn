#!/usr/bin/env node
// Cursor stop hook — best-effort desktop notification when the turn ends. Never blocks; returns {}.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
try { readFileSync(0, 'utf8'); } catch {}
const TITLE = 'Cursor - Quralyst frontend';
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
process.stdout.write(JSON.stringify({}));
process.exit(0);
