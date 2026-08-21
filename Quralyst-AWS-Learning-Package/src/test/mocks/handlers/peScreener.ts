// MSW handlers for the PE Screener surface (F29.2). List paths return the unified envelope with
// `data` as a flat array + `meta:{total,page,pageSize}`; `export=true` returns the bare flat array
// (no meta paging). find-similar switches its canned response by mode; a blank query returns a 400.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok, err } from '@/test/mocks/envelope';
import {
  mockFindSimilarEmpty,
  mockFindSimilarResult,
  mockFindSimilarSectorResult,
  mockScreenerFirms,
  mockScreenerHoldings,
  mockScreenerHoldingsStats,
  mockScreenerOptions,
  mockScreenerPeople,
  mockScreenerSuspectHoldings,
} from '@/test/mocks/fixtures/peScreener';
import type { PEScreenerHoldingRow } from '@/types';

export const peScreenerHandlers = [
  http.get(endpoints.pe.screenerHoldings, ({ request }) => {
    const url = new URL(request.url);
    const isExport = url.searchParams.get('export') === 'true';
    const quality = url.searchParams.get('qualityFilter');
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const firmId = url.searchParams.get('firmId') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const sector = (url.searchParams.get('sector') ?? '').toLowerCase();
    const page = Number(url.searchParams.get('page') ?? '0');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50');

    let rows: PEScreenerHoldingRow[] =
      quality === 'suspect' ? mockScreenerSuspectHoldings : mockScreenerHoldings;
    if (firmId) rows = rows.filter((h) => h.firmId === firmId);
    if (status) rows = rows.filter((h) => h.investmentStatus === status);
    if (sector) rows = rows.filter((h) => (h.sector ?? '').toLowerCase().includes(sector));
    if (search)
      rows = rows.filter(
        (h) =>
          h.companyName.toLowerCase().includes(search) ||
          (h.sector ?? '').toLowerCase().includes(search),
      );

    if (isExport) return ok(rows);
    const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
    return ok(pageRows, { meta: { total: rows.length, page, pageSize } });
  }),

  http.get(endpoints.pe.screenerHoldingsStats, () => ok(mockScreenerHoldingsStats)),

  http.get(endpoints.pe.screenerFirms, ({ request }) => {
    const url = new URL(request.url);
    const isExport = url.searchParams.get('export') === 'true';
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const status = url.searchParams.get('status') ?? '';
    const page = Number(url.searchParams.get('page') ?? '0');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50');

    let rows = mockScreenerFirms;
    if (status) rows = rows.filter((f) => f.status === status);
    if (search)
      rows = rows.filter(
        (f) =>
          f.name.toLowerCase().includes(search) ||
          (f.description ?? '').toLowerCase().includes(search),
      );

    if (isExport) return ok(rows);
    const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
    return ok(pageRows, { meta: { total: rows.length, page, pageSize } });
  }),

  http.get(endpoints.pe.screenerPeople, ({ request }) => {
    const url = new URL(request.url);
    const isExport = url.searchParams.get('export') === 'true';
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const firmId = url.searchParams.get('firmId') ?? '';
    const roleTag = url.searchParams.get('roleTag') ?? '';
    const hasLinkedIn = url.searchParams.get('hasLinkedIn') ?? '';
    const page = Number(url.searchParams.get('page') ?? '0');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50');

    let rows = mockScreenerPeople;
    if (firmId) rows = rows.filter((p) => p.firmId === firmId);
    if (roleTag) rows = rows.filter((p) => p.roleTag === roleTag);
    if (hasLinkedIn === 'yes') rows = rows.filter((p) => !!p.linkedinUrl);
    if (hasLinkedIn === 'no') rows = rows.filter((p) => !p.linkedinUrl);
    if (search)
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(search) || (p.title ?? '').toLowerCase().includes(search),
      );

    if (isExport) return ok(rows);
    const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
    return ok(pageRows, { meta: { total: rows.length, page, pageSize } });
  }),

  http.get(endpoints.pe.screenerOptions, () => ok(mockScreenerOptions)),

  http.post(endpoints.pe.screenerFindSimilar, async ({ request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as {
      query?: string;
      mode?: string;
    };
    if (!body.query || !body.query.trim()) return err(400, 'A query is required.');
    if (body.query.trim() === 'asdfghjkl') return ok(mockFindSimilarEmpty);
    if (body.mode === 'sector_interest_only') return ok(mockFindSimilarSectorResult);
    return ok({ ...mockFindSimilarResult, mode: body.mode ?? 'current_owners', query: body.query });
  }),
];
