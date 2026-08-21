// MSW handlers for the IB Vertical surface (F34.4). All reads return the unified envelope. Literal
// paths (transactions/people/screener/coverage-stats/scrape-*/league-table/…) are registered BEFORE
// the `/:id` catch-all so `:id` never swallows them (mirrors the backend route ordering, §3.10).
// The list/filter handlers honour the same query params the services forward (dealType/sector/bankId/q
// for transactions; bankId/title/q for people; sector/dealType/months for the league table) so the
// filter-wiring + league-sort tests can assert behaviour. The bulk-import handler classifies pasted
// URLs (created/exists/error) so the modal flow test can exercise all three. Detail reads 404 the
// reserved `unknown` id. Mutations return 202-style envelopes with a `message`.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok, err } from '@/test/mocks/envelope';
import {
  allBanks,
  allPeople,
  allTransactions,
  bankA,
  coverageStats,
  screenerStats,
} from '@/test/mocks/fixtures/ib';
import type { IBBank, IBBulkImportRow, IBLeagueRow, IBTransaction } from '@/types';

function bankById(id: string): IBBank | undefined {
  return allBanks.find((b) => b.id === id);
}

/** Build the league table from the transactions fixture: rank by dealCount desc, honour filters. */
function buildLeague(sector: string, dealType: string, months: string): IBLeagueRow[] {
  let txs: IBTransaction[] = [...allTransactions];
  if (sector)
    txs = txs.filter((t) => (t.sector ?? '').toLowerCase().includes(sector.toLowerCase()));
  if (dealType)
    txs = txs.filter((t) => (t.dealType ?? '').toLowerCase().includes(dealType.toLowerCase()));
  if (months && months !== 'all') {
    // Lexicographic cutoff on the ISO-prefixed dealDate string (why dealDate is a string).
    const n = Number(months);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - n);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
    txs = txs.filter((t) => (t.dealDate ?? '') >= cutoffStr);
  }
  const byBank = new Map<
    string,
    { name: string | null; count: number; sectors: Set<string>; recent: string | null }
  >();
  for (const t of txs) {
    const entry = byBank.get(t.bankId) ?? {
      name: t.bankName,
      count: 0,
      sectors: new Set<string>(),
      recent: null,
    };
    entry.count += 1;
    if (t.sector) entry.sectors.add(t.sector);
    if (t.dealDate && (entry.recent == null || t.dealDate > entry.recent))
      entry.recent = t.dealDate;
    byBank.set(t.bankId, entry);
  }
  return [...byBank.entries()]
    .map(([bankId, e]) => ({
      bankId,
      bankName: e.name,
      dealCount: e.count,
      topSectors: [...e.sectors].slice(0, 3),
      mostRecentDeal: e.recent,
    }))
    .sort((a, b) => b.dealCount - a.dealCount);
}

export const ibHandlers = [
  // --- literal paths (registered first) -------------------------------------
  http.get(endpoints.ib.coverageStats, () => ok(coverageStats)),
  http.get(endpoints.ib.screenerStats, () => ok(screenerStats)),
  // CU.5: candidate discovery (literal path — stays above the `/:id` catch-all).
  http.get(endpoints.ib.discover, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return ok({
      results: [
        {
          name: `Harbor Advisors (${q || 'middle market M&A'})`,
          websiteUrl: 'https://harboradvisors.example.com',
          snippet: 'Boutique middle-market M&A advisory.',
        },
        { name: null, websiteUrl: 'https://nameless.example.com', snippet: null },
      ],
    });
  }),
  http.get(endpoints.ib.scrapeStatus, () => ok({ jobs: [], counts: {} })),
  http.get(endpoints.ib.rescrapeTransactionsProgress, () =>
    ok({ running: false, total: 0, done: 0, found: 0, startedAt: null }),
  ),
  http.get(endpoints.ib.leagueTable, ({ request }) => {
    const url = new URL(request.url);
    return ok({
      rows: buildLeague(
        url.searchParams.get('sector') ?? '',
        url.searchParams.get('dealType') ?? '',
        url.searchParams.get('months') ?? 'all',
      ),
    });
  }),
  http.get(endpoints.ib.transactions, ({ request }) => {
    const url = new URL(request.url);
    const dealType = url.searchParams.get('dealType') ?? '';
    const sector = url.searchParams.get('sector') ?? '';
    const bankId = url.searchParams.get('bankId') ?? '';
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    let txs = [...allTransactions];
    if (dealType) txs = txs.filter((t) => (t.dealType ?? '') === dealType);
    if (sector) txs = txs.filter((t) => (t.sector ?? '') === sector);
    if (bankId) txs = txs.filter((t) => t.bankId === bankId);
    if (q)
      txs = txs.filter((t) =>
        [t.dealName, t.targetCompany, t.acquirerCompany, t.bankName, t.sector]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      );
    return ok({ transactions: txs });
  }),
  http.get(endpoints.ib.people, ({ request }) => {
    const url = new URL(request.url);
    const bankId = url.searchParams.get('bankId') ?? '';
    const title = (url.searchParams.get('title') ?? '').toLowerCase();
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    let people = [...allPeople];
    if (bankId) people = people.filter((p) => p.bankId === bankId);
    if (title) people = people.filter((p) => (p.title ?? '').toLowerCase().includes(title));
    if (q)
      people = people.filter((p) =>
        [p.name, p.title, p.bankName, p.bio]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      );
    return ok({ people });
  }),

  // Mutations (literal)
  http.post(endpoints.ib.bulkImport, async ({ request }) => {
    const body = (await request.json()) as { urls: string[] };
    const results: IBBulkImportRow[] = body.urls.map((u) => {
      if (u.includes('bad')) return { url: u, status: 'error' };
      if (u.includes('moelis')) return { url: u, status: 'exists', name: 'Moelis & Company' };
      // name-from-domain: first hostname label minus www., first letter capitalized.
      let name = u;
      try {
        const host = new URL(u).hostname.replace(/^www\./, '');
        const label = host.split('.')[0];
        name = label.charAt(0).toUpperCase() + label.slice(1);
      } catch {
        /* leave raw */
      }
      return { url: u, status: 'created', name };
    });
    const created = results.filter((r) => r.status === 'created').length;
    return ok({ results, created }, { status: 201 });
  }),
  http.post(endpoints.ib.banks, async ({ request }) => {
    const body = (await request.json()) as { name: string; websiteUrl: string };
    return ok(
      { ...bankA, id: 'ib-new', name: body.name, websiteUrl: body.websiteUrl },
      { status: 201 },
    );
  }),
  http.post(endpoints.ib.scrapeAll, () =>
    ok({ queued: 2, message: 'Queued 2 banks for scraping.' }, { status: 202 }),
  ),
  http.post(endpoints.ib.rescrapePeople, () =>
    ok({ queued: 1, message: 'Queued 1 bank missing people.' }, { status: 202 }),
  ),
  http.post(endpoints.ib.rescrapeTransactions, () =>
    ok({ queued: 0, message: 'No banks match this re-queue.' }),
  ),
  http.post(endpoints.ib.rescrapeZeroCoverage, () =>
    ok({ queued: 1, message: 'Queued 1 zero-coverage bank.' }, { status: 202 }),
  ),
  http.post(endpoints.ib.inferEmails, () =>
    ok({ processed: 10, inferred: 4, message: 'Inferred 4 emails.' }),
  ),
  http.post(endpoints.ib.scanContactPages, () =>
    ok({ queued: 2, message: 'Queued 2 contact-page scans.' }, { status: 202 }),
  ),

  // Banks list (GET /api/ib) — newest-created first.
  http.get(endpoints.ib.banks, () => ok({ banks: allBanks })),

  // --- per-bank sub-resources (registered before the `:id` catch-all) -------
  http.post(endpoints.ib.bankScrape(':id'), ({ params }) =>
    ok({ queued: true, bankId: params.id as string }, { status: 202 }),
  ),
  http.post(endpoints.ib.bankEnrich(':id'), ({ params }) =>
    ok({ queued: true, bankId: params.id as string }, { status: 202 }),
  ),
  http.get(endpoints.ib.bankEnrichmentStatus(':id'), () =>
    ok({
      total: 2,
      urlEnriched: 1,
      urlAttempted: 2,
      locationEnriched: 1,
      locationAttempted: 2,
      activeJobs: [],
    }),
  ),
  http.get(endpoints.ib.bankTransactions(':id'), ({ params }) =>
    ok({ transactions: allTransactions.filter((t) => t.bankId === params.id) }),
  ),
  http.get(endpoints.ib.bankPeople(':id'), ({ params }) =>
    ok({ people: allPeople.filter((p) => p.bankId === params.id) }),
  ),

  // --- `/:id` detail + PATCH/DELETE (registered LAST) -----------------------
  http.get(endpoints.ib.bank(':id'), ({ params }) => {
    if (params.id === 'unknown') return err(404, 'Bank not found');
    const bank = bankById(params.id as string);
    return bank ? ok(bank) : err(404, 'Bank not found');
  }),
  http.patch(endpoints.ib.bank(':id'), async ({ params, request }) => {
    const bank = bankById(params.id as string);
    if (!bank) return err(404, 'Bank not found');
    const patch = (await request.json()) as Partial<IBBank>;
    return ok({ ...bank, ...patch });
  }),
  // Backend DELETE returns a 200 envelope (status_ok), not a bare 204 — CU.5 aligned
  // this when the delete UI landed (a 204-with-envelope-body is invalid anyway).
  http.delete(endpoints.ib.bank(':id'), ({ params }) => ok({ id: String(params.id) })),
];
