// Logger unit tests (Phase 33): buffering + drop-oldest cap, batch flush contract against the
// MSW /api/logs handler, and the never-throws rule when shipping fails.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http as mswHttp, HttpResponse } from 'msw';

vi.mock('@/config', () => ({
  config: { apiBaseUrl: '', errorReportingDsn: '', logShipping: true },
}));

import { logger, flush, _getBuffer, _resetLogger } from './logger';

let received: unknown[] = [];
const server = setupServer(
  mswHttp.post('/api/logs', async ({ request }) => {
    const body = (await request.json()) as { entries: unknown[] };
    received.push(...body.entries);
    return HttpResponse.json({ success: true, accepted: body.entries.length });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  _resetLogger();
  received = [];
});

describe('logger', () => {
  it('buffers entries with level, route, session id and timestamp', () => {
    logger.info('hello', { a: 1 });
    logger.error('boom');
    const buf = _getBuffer();
    expect(buf).toHaveLength(2);
    expect(buf[0]).toMatchObject({ level: 'info', message: 'hello', fields: { a: 1 } });
    expect(buf[0].sessionId).toBeTruthy();
    expect(buf[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(buf[1].level).toBe('error');
  });

  it('caps the buffer at 200, dropping oldest', () => {
    for (let i = 0; i < 250; i++) logger.debug(`entry ${i}`);
    const buf = _getBuffer();
    expect(buf).toHaveLength(200);
    expect(buf[0].message).toBe('entry 50'); // oldest 50 dropped
    expect(buf[199].message).toBe('entry 249');
  });

  it('flushes the batch to /api/logs and empties the buffer', async () => {
    logger.info('one');
    logger.warn('two');
    flush();
    expect(_getBuffer()).toHaveLength(0);
    await vi.waitFor(() => expect(received).toHaveLength(2));
    expect(received[0]).toMatchObject({ message: 'one' });
  });

  it('never throws when shipping fails', async () => {
    server.use(mswHttp.post('/api/logs', () => HttpResponse.error()));
    logger.info('doomed');
    expect(() => flush()).not.toThrow();
    // give the swallowed rejection a tick to settle
    await new Promise((r) => setTimeout(r, 20));
    expect(_getBuffer()).toHaveLength(0);
  });
});
