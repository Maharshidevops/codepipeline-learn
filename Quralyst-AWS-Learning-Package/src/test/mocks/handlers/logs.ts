// MSW handler for frontend log shipping (Phase 33) — accepts and discards batches; exists for
// contract tests only (mock mode defaults VITE_LOG_SHIPPING off so MSW logs don't pollute output).
import { http, HttpResponse } from 'msw';
import { endpoints } from '@/services/endpoints';

export const logsHandlers = [
  http.post(endpoints.logs.ship, async ({ request }) => {
    const body = (await request.json()) as { entries?: unknown[] };
    if (!Array.isArray(body?.entries)) {
      return HttpResponse.json({ success: false, error: 'entries[] required' }, { status: 400 });
    }
    return HttpResponse.json({ success: true, accepted: body.entries.length });
  }),
];
