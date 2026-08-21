// Behavioral-signal service methods (Tier A) — recordFirmDismissal / recordMandateExamples.
// They POST the payload and are BEST-EFFORT: a non-2xx response must be swallowed (resolve, never
// throw) so a passive signal can never break the user action that triggered it.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { ok, err } from '@/test/mocks/envelope';
import { memoryService } from './memoryService';

let lastBody: unknown = null;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  lastBody = null;
});
afterAll(() => server.close());

describe('memoryService behavioral signals', () => {
  it('recordFirmDismissal POSTs the payload', async () => {
    server.use(
      http.post('/api/memory/signals/firm-dismissal', async ({ request }) => {
        lastBody = await request.json();
        return ok(null, { message: 'Signal recorded.' });
      }),
    );
    await memoryService.recordFirmDismissal({
      firmName: 'Vista Equity Partners',
      firmWebsite: 'vistaequitypartners.com',
      reason: 'Too large for this target',
    });
    expect(lastBody).toEqual({
      firmName: 'Vista Equity Partners',
      firmWebsite: 'vistaequitypartners.com',
      reason: 'Too large for this target',
    });
  });

  it('recordMandateExamples POSTs the intent, criteria, and examples', async () => {
    server.use(
      http.post('/api/memory/signals/mandate-examples', async ({ request }) => {
        lastBody = await request.json();
        return ok(null, { message: 'Signal recorded.' });
      }),
    );
    await memoryService.recordMandateExamples({
      intent: 'example-buyer-profile',
      industry: 'Industrials',
      subIndustry: 'HVAC',
      idealBuyerTypes: ['horizontal'],
      examples: [{ website: 'comfortsystems.com' }],
    });
    expect(lastBody).toMatchObject({
      intent: 'example-buyer-profile',
      industry: 'Industrials',
      subIndustry: 'HVAC',
      idealBuyerTypes: ['horizontal'],
      examples: [{ website: 'comfortsystems.com' }],
    });
  });

  it('swallows a server failure (best-effort) — resolves, never throws', async () => {
    server.use(http.post('/api/memory/signals/firm-dismissal', () => err(500, 'boom')));
    await expect(memoryService.recordFirmDismissal({ firmName: 'X' })).resolves.toBeUndefined();
  });
});
