// Phase 40 — the logger mirrors warn/info/error (not debug) to the /__client-log dev bridge when
// the VITE_LOG_TO_TERMINAL toggle is on, and never throws when the bridge POST fails.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Toggle ON here (real config forces it OFF under MODE='test', so component tests never POST).
vi.mock('@/config', () => ({
  config: { apiBaseUrl: '', errorReportingDsn: '', logShipping: false, logToTerminal: true },
}));

import { logger } from './logger';

function fetchSpy() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
}

function terminalCalls(spy: ReturnType<typeof fetchSpy>) {
  return spy.mock.calls.filter(([url]) => url === '/__client-log');
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('logger → terminal bridge', () => {
  it('POSTs error/warn/info entries to /__client-log with the entry body', () => {
    const spy = fetchSpy();
    logger.error('boom', { status: 400 });
    logger.warn('careful');
    logger.info('api request', { method: 'GET', path: '/api/pe/firms' });

    const calls = terminalCalls(spy);
    expect(calls).toHaveLength(3);
    const [, init] = calls[0];
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ level: 'error', message: 'boom', fields: { status: 400 } });
  });

  it('does NOT mirror debug (keeps the terminal readable)', () => {
    const spy = fetchSpy();
    logger.debug('verbose row detail');
    expect(terminalCalls(spy)).toHaveLength(0);
  });

  it('never throws when the bridge POST rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('bridge down'));
    expect(() => logger.error('still fine')).not.toThrow();
    await new Promise((r) => setTimeout(r, 10)); // let the swallowed rejection settle
  });
});
