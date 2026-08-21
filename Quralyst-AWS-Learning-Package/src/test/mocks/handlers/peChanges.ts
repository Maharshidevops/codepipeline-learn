// MSW handlers for the PE Activity Feed / Changes surface (F31.2). Both GETs return the unified success
// envelope. The feed handler honours the server-side `type` filter (added|removed|status_change|
// field_change), `firmId`, and `limit`/`offset` offset-pagination — filtering happens BEFORE the page
// slice and `total` reflects the filtered count, so filter + load-more tests can spy on the forwarded
// query params and assert the appended page. The summary handler returns the fixture `byType` bundle.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import { mockChangeRows, mockChangesSummary } from '@/test/mocks/fixtures/peChanges';

export const peChangesHandlers = [
  // Reverse-chronological change feed. Applies `type` + `firmId`, then the `limit`/`offset` slice.
  http.get(endpoints.pe.changes, ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const firmId = url.searchParams.get('firmId');
    const limit = Number(url.searchParams.get('limit') ?? '100');
    const offset = Number(url.searchParams.get('offset') ?? '0');

    let rows = mockChangeRows;
    if (type) rows = rows.filter((r) => r.changeType === type);
    if (firmId) rows = rows.filter((r) => r.firmId === firmId);

    const total = rows.length;
    const page = rows.slice(offset, offset + limit);

    return ok({ changes: page, total, limit, offset });
  }),

  // By-type summary + total across the whole feed (no filters).
  http.get(endpoints.pe.changesSummary, () => ok(mockChangesSummary)),
];
