// http.ts status routing (Phase 32): 401 fires the unauthorized handler (session clear path),
// 403 fires the forbidden handler and NEVER the unauthorized one (user stays logged in).
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http as mswHttp, HttpResponse } from 'msw';
import { http, setForbiddenHandler, setUnauthorizedHandler } from './http';

const server = setupServer(
  // Phase 11: errors return the error envelope; success returns the envelope with the payload in
  // `data` (http() unwraps it, so http('/t/ok') resolves to { ok: true }).
  mswHttp.get('/t/unauthorized', () =>
    HttpResponse.json(
      { success: false, statusCode: 401, data: null, message: 'expired', meta: null },
      { status: 401 },
    ),
  ),
  mswHttp.get('/t/forbidden', () =>
    HttpResponse.json(
      { success: false, statusCode: 403, data: null, message: 'no access', meta: null },
      { status: 403 },
    ),
  ),
  mswHttp.get('/t/ok', () =>
    HttpResponse.json({
      success: true,
      statusCode: 200,
      data: { ok: true },
      message: null,
      meta: null,
    }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
  setUnauthorizedHandler(null);
  setForbiddenHandler(null);
});

describe('http status routing', () => {
  it('fires the unauthorized handler on 401', async () => {
    const onUnauthorized = vi.fn();
    const onForbidden = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setForbiddenHandler(onForbidden);

    await expect(http('/t/unauthorized')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it('fires the forbidden handler on 403 and never the 401 path', async () => {
    const onUnauthorized = vi.fn();
    const onForbidden = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setForbiddenHandler(onForbidden);

    await expect(http('/t/forbidden')).rejects.toMatchObject({ status: 403 });
    expect(onForbidden).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('fires neither on success', async () => {
    const onUnauthorized = vi.fn();
    const onForbidden = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setForbiddenHandler(onForbidden);

    await expect(http('/t/ok')).resolves.toEqual({ ok: true });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onForbidden).not.toHaveBeenCalled();
  });
});
