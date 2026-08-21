// MSW handlers for the research wizards: submit (→ {process_id}), AI-assist (canned), reuse-filters,
// and the progress stop/disconnect endpoints. The SSE stream itself is produced by MockProgressSource
// (not MSW) so it can drive smooth-increment timing directly in the browser.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import type { AiAutofillResult } from '@/types';

// Deterministic process id (no Math.random — keeps mock output stable for snapshots/tests).
let processCounter = 1000;
const nextProcessId = () => `proc_${++processCounter}`;

const cannedAutofill: AiAutofillResult = {
  businessQuery:
    'Mid-market B2B software companies in North America providing workflow automation to ' +
    'financial-services teams, $10M–$50M revenue, 50–250 employees.',
  industry: 'Information Technology & Software Services',
  subIndustry: 'Custom & Enterprise Software (ERP, CRM, SCM, cybersecurity, analytics)',
  primaryActivity: 'Service',
};

export const researchHandlers = [
  http.post(endpoints.research.targetList, () =>
    ok({ process_id: nextProcessId(), status: 'processing_started' }),
  ),
  // F9 — column mapping preview: canned mapping per uploaded file. jsdom's fetch doesn't produce a
  // multipart body MSW can parse via request.formData(), so pull filenames from the raw body.
  http.post(endpoints.research.previewMapping, async ({ request }) => {
    let names: string[] = [];
    try {
      const raw = await request.text();
      names = [...raw.matchAll(/filename="([^"]+)"/g)].map((m) => m[1]);
    } catch {
      /* ignore — fall back below */
    }
    if (!names.length) names = ['upload.csv'];
    return ok({
      files: names.map((name) => ({
        filename: name,
        header_row: 0,
        row_count: 3,
        raw_sample: [
          ['Company', 'Rev'],
          ['Acme', '5'],
          ['Beta', '9'],
        ],
        columns: [
          { source: 'Company', target: 'Company Name', confidence: 'suggested' },
          { source: 'Rev', target: '', confidence: 'unmapped' },
        ],
        blocked_outputs: ['Score', 'Fit/No Fit'],
        mappable_fields: ['Company Name', 'Website', 'Revenue', 'Number of Employees'],
        needs_confirmation: true,
        headerless: false,
      })),
    });
  }),
  http.post(endpoints.research.strategic, () =>
    ok({
      process_id: nextProcessId(),
      status: 'processing_started',
      session_id: nextProcessId(),
    }),
  ),
  http.post(endpoints.research.financialVerticals, () =>
    ok({ process_id: nextProcessId(), status: 'processing_started' }),
  ),
  // FV database Excel upload — canned success with plausible counts (dummy-data mode). data is
  // camelCase (the service maps it back to firms_processed/sectors_updated); toast in message.
  http.post(endpoints.research.financialVerticalsDatabase, () =>
    ok(
      { firmsProcessed: 128, sectorsUpdated: 42, sessionId: nextProcessId() },
      { message: 'Financial Verticals database updated from the uploaded file.' },
    ),
  ),

  // AI mandate helpers (F10) — canned outputs (dummy-data mode).
  http.post(endpoints.research.enhanceTargetDescription, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { description?: string };
    const base = body.description?.trim() || 'the target';
    return ok({
      description: `${base} — expanded with adjacent categories, buyer-fit qualifiers, and recurring-revenue emphasis.`,
    });
  }),
  http.post(endpoints.research.describeFromWebsite, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { url?: string };
    return ok({
      description: `A company (from ${body.url || 'the site'}) providing vertical SaaS with recurring revenue.`,
      suggested_industry: 'Software',
    });
  }),
  http.post(endpoints.research.describeFromPdf, () =>
    ok({
      description: 'A company described in the uploaded PDF: vertical SaaS with managed services.',
    }),
  ),
  // List Enrichment (F14) — start returns running; status returns completed (dummy-data mode).
  http.post(endpoints.enrich.start, () =>
    ok({
      status: 'running',
      processed: 0,
      total: 3,
      message: 'Enriching 3 companies…',
      found: true,
      running: true,
      done: 0,
      skipped: 0,
      failed: 0,
      byCompany: {},
    }),
  ),
  http.get('/api/enrich-list/status', () =>
    ok({
      status: 'completed',
      processed: 3,
      total: 3,
      message: 'Enriched 3 of 3 companies.',
      found: true,
      running: false,
      done: 3,
      skipped: 0,
      failed: 0,
      byCompany: {},
    }),
  ),

  // Custom AI column fill (ResultDetail parity).
  http.post(endpoints.customColumn.start, async ({ request }) => {
    const body = (await request.json()) as { label?: string };
    return ok({ success: true, label: body.label || 'Custom', alreadyRunning: false });
  }),
  http.get('/api/custom-column/status', () => ok({ found: false })),

  // Custom Insight presets (F13) — system-provided one-click questions.
  http.get(endpoints.customInsights.presets, () =>
    ok({
      presets: [
        { id: 'recurring_revenue', label: 'Recurring revenue?' },
        { id: 'customer_concentration', label: 'Customer concentration?' },
        { id: 'ownership', label: 'Ownership / founder-owned?' },
      ],
    }),
  ),

  // Parse Mandate (F11) — canned structured prefill (dummy-data mode).
  http.post(endpoints.research.parseMandate, () =>
    ok({
      prefill: {
        mode: 'target',
        business_queries: ['Boutique financial research firms serving PE and M&A advisors'],
        industry: 'Financial Services',
        sub_industry: 'Investment Banking & Advisory',
        geography: { countries: ['United States'], states: [], cities: [] },
        revenue_min: 5000000,
        revenue_max: 15000000,
        ebitda_min: null,
        ebitda_max: null,
        employees_min: 10,
        employees_max: 100,
        description: 'Lower-mid-market financial research & analytics providers.',
        ideal_buyer_types: ['Horizontal', 'Vertical'],
      },
    }),
  ),

  http.post(endpoints.research.suggestIndustry, async ({ request }) => {
    // Echo a value from the FE-supplied vocabulary so the Select can actually display it
    // (the real backend constrains its answer to the passed industries list).
    const body = (await request.json().catch(() => ({}))) as {
      industries?: string[];
      subIndustriesMap?: Record<string, string[]>;
    };
    const industry = body.industries?.[0] ?? 'Software';
    const subIndustry = body.subIndustriesMap?.[industry]?.[0] ?? '';
    return ok({ industry, subIndustry });
  }),

  http.post(endpoints.research.extractFormCriteria, () => ok(cannedAutofill)),
  http.post(endpoints.research.enhanceBusinessQuery, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { text?: string };
    const base = body.text?.trim() || 'your target companies';
    return ok({
      enhanced: `${base} — refined to emphasize recurring-revenue models, recent funding or M&A activity, and a clear ICP fit within the defined industry and geography.`,
    });
  }),
  http.post(endpoints.research.buyerRecommendation, () =>
    ok({
      recommendation:
        'Strategic acquirers in adjacent verticals seeking recurring-revenue expansion, plus ' +
        'PE platforms consolidating fragmented SaaS niches. Prioritize buyers with prior ' +
        'bolt-on activity and overlapping customer segments.',
      buyers: ['Horizontal', 'Vertical', 'Adjacent'],
    }),
  ),

  http.get(endpoints.research.reuseFilters, () =>
    ok({
      industry: 'Manufacturing',
      sub_industry: 'Machinery & Industrial Equipment',
      min_revenue: '10000000',
      max_revenue: '50000000',
      business_query: ['Industrial automation equipment manufacturers in North America'],
    }),
  ),

  // Progress stop + disconnect beacon — accept and succeed.
  http.post('/api/quralyst_research/stop', () => ok(null, { message: 'Processing stopped.' })),
  http.post('/api/financial-verticals/stop', () => ok(null, { message: 'Processing stopped.' })),
  http.post(endpoints.progress.notifyDisconnect, () => ok()),
];
