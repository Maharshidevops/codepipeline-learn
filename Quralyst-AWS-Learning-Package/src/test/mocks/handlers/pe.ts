// MSW handlers for the PE Dataset surface (F23.4 + F24.3). Shapes mirror the backend contract:
// list carries firms/holdings in data + pagination in meta; mutations return envelopes.
import { http, HttpResponse } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok, err } from '@/test/mocks/envelope';
import {
  mockPeFirms,
  mockPeHoldings,
  mockPeHoldingEnrichment,
  mockPeHoldingTeams,
  mockPePeople,
  mockPePeopleResolve,
  mockPePeopleSummary,
  mockPeScrapeJobs,
  mockPeSuspectHoldings,
} from '@/test/mocks/fixtures/pe';
import type { PEHolding, PEHoldingSource, PEQualityField } from '@/types';

function estKey(h: PEHolding): string {
  const year = h.estimatedInvestmentYear ?? '';
  const month = h.estimatedInvestmentMonth ?? '';
  return year ? `${year}-${month}` : '';
}

function sortHoldings(rows: PEHolding[], sortBy: string, sortDir: string): PEHolding[] {
  const dir = sortDir === 'desc' ? -1 : 1;
  const val = (h: PEHolding): string => {
    switch (sortBy) {
      case 'firmName':
        return h.firmName ?? '';
      case 'sector':
        return h.sector ?? '';
      case 'investmentStatus':
        return h.investmentStatus ?? '';
      case 'investmentDate':
        return h.investmentDate ?? '';
      case 'estimatedInvestment':
        return estKey(h);
      case 'lastSeenAt':
        return h.lastSeenAt ?? '';
      default:
        return h.companyName ?? '';
    }
  };
  return [...rows].sort((a, b) => {
    const av = val(a);
    const bv = val(b);
    // Blanks always sort last, regardless of direction (contract).
    if (av === '' && bv !== '') return 1;
    if (bv === '' && av !== '') return -1;
    return av.localeCompare(bv) * dir;
  });
}

export const peHandlers = [
  http.get(endpoints.pe.firms, ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');
    const rows = mockPeFirms.filter((f) => !search || f.name.toLowerCase().includes(search));
    return ok(
      { firms: rows.slice((page - 1) * pageSize, page * pageSize) },
      { meta: { total: rows.length, page, pageSize } },
    );
  }),

  // Unpaginated {id, name} list for filter dropdowns. Declared before `${firms}/:id` so it
  // isn't captured as a firm-detail request (msw matches handlers in array order).
  http.get(endpoints.pe.firmOptions, () =>
    ok({ firms: mockPeFirms.map((f) => ({ id: f.id, name: f.name })) }),
  ),

  // Firms CSV export (F28 "Download CSV"). Raw CSV carve-out (not the JSON envelope);
  // declared before `${firms}/:id` so "export" isn't captured as a firm-detail request.
  http.get(
    endpoints.pe.firmsExport,
    () =>
      new HttpResponse('﻿Name,Website\r\nVista,https://vistaequitypartners.com\r\n', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="pe-firms-export.csv"',
        },
      }),
  ),

  http.post(endpoints.pe.bulkImport, () =>
    ok({
      results: [
        {
          url: 'https://newfirm.example.com',
          status: 'created',
          firmId: 'pef9',
          firmName: 'New Firm',
        },
        {
          url: 'https://junk.example.com',
          status: 'quarantined',
          firmId: 'pef10',
          firmName: 'Junk',
          reason: 'low confidence this is a PE firm',
        },
      ],
      summary: { total: 2, created: 1, duplicate: 0, quarantined: 1, failed: 0 },
    }),
  ),

  http.post(endpoints.pe.scrapeAll, () => ok({ queued: 1, skipped: 1 })),

  // CU.5: single-firm create — echoes a created firm (discovery runs server-side).
  http.post(endpoints.pe.firms, async ({ request }) => {
    const body = (await request.json()) as { websiteUrl: string; name?: string };
    if (body.websiteUrl.includes('duplicate')) return err(409, 'Host already registered.');
    return ok(
      {
        ...mockPeFirms[0],
        id: 'pef-new',
        name: body.name ?? 'Discovered Firm',
        websiteUrl: body.websiteUrl,
        scrapeQueued: true,
        quarantined: false,
        quarantineReason: null,
      },
      { status: 201 },
    );
  }),

  http.get(`${endpoints.pe.firms}/:id/scrape-jobs`, () => ok({ jobs: mockPeScrapeJobs })),

  http.get(`${endpoints.pe.firms}/:id/portfolio-urls`, () =>
    ok({ urls: ['https://vistaequitypartners.com/companies'] }),
  ),

  // CU.5: replace-all portfolio-URLs write — echoes the submitted list.
  http.put(`${endpoints.pe.firms}/:id/portfolio-urls`, async ({ request }) => {
    const body = (await request.json()) as { urls: string[] };
    return ok({ urls: body.urls });
  }),

  http.post(`${endpoints.pe.firms}/:id/scrape`, () =>
    ok({ queued: true, jobId: 'job9' }, { message: 'Scrape queued.' }),
  ),

  // F60 §4 Auto-Enrichment — coverage ledger + on-demand enqueue.
  http.get(endpoints.pe.firmEnrichmentStatus(':id'), () =>
    ok({
      total: 4,
      urlEnriched: 2,
      urlAttempted: 4,
      gicsEnriched: 3,
      gicsAttempted: 4,
      locationEnriched: 1,
      locationAttempted: 4,
      activeJobs: [],
    }),
  ),
  http.post(endpoints.pe.firmEnrich(':id'), ({ params }) =>
    ok(
      { queued: true, jobId: `enrich-${params.id}` },
      { status: 202, message: 'Enrichment queued.' },
    ),
  ),

  http.get(`${endpoints.pe.firms}/:id`, ({ params }) => {
    const firm = mockPeFirms.find((f) => f.id === params.id);
    return firm ? ok(firm) : err(404, 'Firm not found.');
  }),

  // CU.5: single-firm update — merges the patch over the fixture firm.
  http.patch(`${endpoints.pe.firms}/:id`, async ({ params, request }) => {
    const firm = mockPeFirms.find((f) => f.id === params.id);
    if (!firm) return err(404, 'Firm not found.');
    const patch = (await request.json()) as Record<string, unknown>;
    return ok({ ...firm, ...patch });
  }),

  // CU.5: single-firm delete (staff-only server-side; cascades).
  http.delete(`${endpoints.pe.firms}/:id`, ({ params }) => {
    const firm = mockPeFirms.find((f) => f.id === params.id);
    return firm ? ok({ id: firm.id }) : err(404, 'Firm not found.');
  }),

  // --- Holdings (F24.3) ---------------------------------------------------
  http.get(endpoints.pe.holdings, ({ request }) => {
    const url = new URL(request.url);
    const quality = url.searchParams.get('quality');
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const status = url.searchParams.get('status') ?? '';
    const firmId = url.searchParams.get('firmId') ?? '';
    const sortBy = url.searchParams.get('sortBy') ?? 'companyName';
    const sortDir = url.searchParams.get('sortDir') ?? 'asc';
    const page = Number(url.searchParams.get('page') ?? '0'); // 0-based
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50');

    let rows = quality === 'suspect' ? mockPeSuspectHoldings : mockPeHoldings;
    if (firmId) rows = rows.filter((h) => h.firmId === firmId);
    if (status) rows = rows.filter((h) => h.investmentStatus === status);
    if (search)
      rows = rows.filter(
        (h) =>
          h.companyName.toLowerCase().includes(search) ||
          (h.sector ?? '').toLowerCase().includes(search),
      );
    const sorted = sortHoldings(rows, sortBy, sortDir);
    const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);
    return ok({ holdings: pageRows }, { meta: { total: sorted.length, page, pageSize } });
  }),

  http.patch(`${endpoints.pe.holdings}/:id`, async ({ params, request }) => {
    const all = [...mockPeHoldings, ...mockPeSuspectHoldings];
    const base = all.find((h) => h.id === params.id);
    if (!base) return err(404, 'Holding not found.');
    const patch = (await request.json()) as Partial<PEHolding>;
    if (!patch || Object.keys(patch).length === 0) return err(400, 'No fields to update.');
    // Merge without mutating the fixture; stamp operator provenance on changed fields.
    const sources: PEHolding['sources'] = { ...base.sources };
    for (const field of Object.keys(patch) as PEQualityField[]) {
      sources[field] = 'operator' as PEHoldingSource;
    }
    return ok({ ...base, ...patch, sources, manuallyCurated: true });
  }),

  http.delete(`${endpoints.pe.holdings}/:id`, ({ params }) => {
    const all = [...mockPeHoldings, ...mockPeSuspectHoldings];
    const base = all.find((h) => h.id === params.id);
    if (!base) return err(404, 'Holding not found.');
    return ok({ id: params.id });
  }),

  http.get(`${endpoints.pe.holdings}/:id/team`, ({ params }) => {
    const id = String(params.id);
    const team = mockPeHoldingTeams[id] ?? mockPeHoldingTeams.default;
    return ok(team);
  }),

  http.get(`${endpoints.pe.holdings}/:id/enrichment`, ({ params }) => {
    const id = String(params.id);
    return ok(mockPeHoldingEnrichment[id] ?? mockPeHoldingEnrichment.default);
  }),

  // Success path by default (shows the filled-field summary). Override to a 503
  // `not_available` in tests to exercise the disabled/handled state (F24.2 gate).
  http.post(`${endpoints.pe.holdings}/:id/ai-enrich`, ({ params }) => {
    const all = [...mockPeHoldings, ...mockPeSuspectHoldings];
    const base = all.find((h) => h.id === params.id);
    if (!base) return err(404, 'Holding not found.');
    return ok({ holding: { ...base, geography: 'North America' }, filledFields: ['geography'] });
  }),

  // --- People (F25.1/F25.2) -----------------------------------------------
  // Specific paths are registered before the `:id` catch so they win the match.
  http.get(endpoints.pe.peopleSummary, () => ok(mockPePeopleSummary)),

  http.get(endpoints.pe.people, ({ request }) => {
    const url = new URL(request.url);
    const firmId = url.searchParams.get('firmId') ?? '';
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const roleTag = url.searchParams.get('roleTag') ?? '';
    const focusTag = url.searchParams.get('focusTag') ?? '';
    const limit = Number(url.searchParams.get('limit') ?? '100');
    const offset = Number(url.searchParams.get('offset') ?? '0');

    let rows = mockPePeople;
    if (firmId) rows = rows.filter((p) => p.firmId === firmId);
    if (roleTag) rows = rows.filter((p) => p.roleTag === roleTag);
    if (focusTag) rows = rows.filter((p) => p.focusTags.includes(focusTag));
    if (search)
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          (p.title ?? '').toLowerCase().includes(search) ||
          (p.bio ?? '').toLowerCase().includes(search),
      );
    const pageRows = rows.slice(offset, offset + limit);
    return ok({ people: pageRows }, { meta: { total: rows.length, limit, offset } });
  }),

  http.post(endpoints.pe.peopleScrape, () =>
    ok({ queued: true, jobId: 'pjob1' }, { message: 'People scrape queued.' }),
  ),

  http.post(endpoints.pe.peopleTag, () =>
    ok({ processId: 'proc-tag-1', processType: 'pe_people_tag' }, { status: 202 }),
  ),
  http.post(endpoints.pe.peopleTagFocus, () =>
    ok({ processId: 'proc-focus-1', processType: 'pe_people_tag_focus' }, { status: 202 }),
  ),

  http.post(endpoints.pe.peopleFindEmails, async ({ request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { dryRun?: boolean };
    if (body.dryRun) return ok({ eligible: 4, dryRun: true });
    return ok({ processId: 'proc-find-1', processType: 'pe_people_find_emails' }, { status: 202 });
  }),

  http.post(endpoints.pe.peopleVerifyEmails, async ({ request }) => {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { dryRun?: boolean };
    if (body.dryRun) return ok({ eligible: 2, dryRun: true });
    return ok(
      { processId: 'proc-verify-1', processType: 'pe_people_verify_emails' },
      { status: 202 },
    );
  }),

  http.post(endpoints.pe.peopleContactEnrich, () =>
    ok({ processId: 'proc-enrich-1', processType: 'pe_people_contact_enrich' }, { status: 202 }),
  ),
  http.post(endpoints.pe.peopleScrapeBatch, () =>
    ok({ processId: 'proc-scrape-1', processType: 'pe_people_scrape_batch' }, { status: 202 }),
  ),
  http.post(endpoints.pe.peopleScrapeByFirms, () =>
    ok({ processId: 'proc-scrapeby-1', processType: 'pe_people_scrape_by_firms' }, { status: 202 }),
  ),

  http.post(endpoints.pe.peopleExportResolve, () => ok(mockPePeopleResolve)),

  http.post(endpoints.pe.peopleExport, () =>
    HttpResponse.text('﻿Firm,Name\nVista Equity Partners,Ada Partner\n', {
      status: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    }),
  ),

  http.post(`${endpoints.pe.people}/:id/flag`, async ({ params, request }) => {
    const base = mockPePeople.find((p) => p.id === params.id);
    if (!base) return err(404, 'Person not found.');
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { reason?: string };
    return ok({ ...base, flaggedAt: '2026-07-09T00:00:00Z', flagReason: body.reason ?? null });
  }),
  http.post(`${endpoints.pe.people}/:id/unflag`, ({ params }) => {
    const base = mockPePeople.find((p) => p.id === params.id);
    if (!base) return err(404, 'Person not found.');
    return ok({ ...base, flaggedAt: null, flagReason: null });
  }),
  http.delete(`${endpoints.pe.people}/:id`, ({ params }) => {
    const base = mockPePeople.find((p) => p.id === params.id);
    if (!base) return err(404, 'Person not found.');
    return ok({ id: params.id });
  }),
];
