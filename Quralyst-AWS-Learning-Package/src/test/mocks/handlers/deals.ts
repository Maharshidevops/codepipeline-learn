// MSW handlers for Deal Workspaces (Tier B / B1 / F17) — in-memory store. Mirrors the FastAPI
// contract; the current mock user is "u1" (the lead of seeded deals).
import { http } from 'msw';
import { ok, err } from '@/test/mocks/envelope';

interface MockDeal {
  id: string;
  name: string;
  dealType: 'sell_side' | 'buy_side';
  description: string;
  status: 'active' | 'archived';
  leadUserId: string;
  yourRole: 'lead' | 'member' | null;
  stages: { stageId: string; name: string; order: number; isTerminal: boolean; color: string }[];
  members: { userId: string; name: string; email: string; role: 'lead' | 'member' }[];
  pipelineSummary?: { stageId: string; count: number }[];
  createdAt: string;
  updatedAt: string;
}

const SELL_STAGES = ['Sourcing', 'Outreach', 'NDA', 'IOI', 'LOI', 'Closed – Won', 'Closed – Lost'];

function makeStages(names: string[]) {
  return names.map((name, i) => ({
    stageId: `stg_${i}`,
    name,
    order: i,
    isTerminal: name.startsWith('Closed'),
    color: '',
  }));
}

let store: MockDeal[] = [];
let seq = 0;

export function resetDealsStore() {
  seq = 1;
  store = [
    {
      id: 'deal_1',
      name: 'Project Falcon',
      dealType: 'sell_side',
      description: 'Sell-side mandate for Indago Research.',
      status: 'active',
      leadUserId: 'u1',
      yourRole: 'lead',
      stages: makeStages(SELL_STAGES),
      members: [{ userId: 'u1', name: 'Raghav', email: 'r@x.com', role: 'lead' }],
      createdAt: '2026-07-20T00:00:00Z',
      updatedAt: '2026-07-20T00:00:00Z',
    },
  ];
}
resetDealsStore();

const find = (id: string) => store.find((d) => d.id === id);

/** Org directory used by member-search and add-member (mirrors backend _user_identity). */
const ORG_DIRECTORY = [
  { userId: 'u2', name: 'Karan Parmar', email: 'karan@quralyst.ai' },
  { userId: 'u3', name: 'Amit Shah', email: 'amit@quralyst.ai' },
];

// F18 — per-deal company records + comments (in-memory).
interface MockCompany {
  id: string;
  dealId: string;
  companyName: string;
  website: string;
  stageId: string;
  tier: number | null;
  buyerType: string;
  outreachStatus: string;
  passReason: string;
  predictedFit: string;
  sourceResultId: string;
  contacts: {
    contactId?: string;
    name: string;
    email: string;
    phone: string;
    title: string;
    isPrimary: boolean;
    outreachStatus?: string;
  }[];
  notes: string;
  ownerUserId: string;
  ownerName: string;
}
let companies: MockCompany[] = [];
let comments: {
  id: string;
  recordId: string;
  authorUserId: string;
  authorName: string;
  text: string;
  mentions: string[];
  createdAt: string;
}[] = [];
let cSeq = 0;

export function resetDealCompanies() {
  companies = [];
  comments = [];
  cSeq = 0;
}
resetDealCompanies();

// F19 — briefs (one per deal) + list links (in-memory).
interface MockBrief {
  id: string;
  dealId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: 'parsing' | 'ready' | 'error';
  errorMessage: string;
  criteria: Record<string, unknown>;
  hasFile: boolean;
  uploadedBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}
interface MockLink {
  id: string;
  dealId: string;
  resultId: string;
  kind: 'processed' | 'financial';
  title: string;
  listType: string;
  totalCount: number;
  linkedBy: string;
  createdAt: string | null;
}
let briefs: MockBrief[] = [];
let links: MockLink[] = [];
let fSeq = 0;

export function resetDealBriefsLinks() {
  briefs = [];
  links = [];
  fSeq = 0;
}
resetDealBriefsLinks();

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const dealCompanies = (dealId: string) => companies.filter((c) => c.dealId === dealId);

// Mirror backend services/deals/company_service (reference-parity, 2026-07-29): buyer type is keyed
// off the source RUN KIND, not the data source. financial run → financial_sponsor, processed run →
// strategic, else unset. auto_tier leaves the field null (unset) when the fit is unbucketable.
function autoBuyerType(resultId: string): string {
  const kind = (resultId || '').startsWith('fv_') ? 'financial' : resultId ? 'processed' : '';
  if (kind === 'financial') return 'financial_sponsor';
  if (kind === 'processed') return 'strategic';
  return '';
}

function autoTier(predictedFit: string, hasRun: boolean): number | null {
  if (!hasRun) return null; // no run link → no trusted fit → tier unset
  const p = (predictedFit || '').toLowerCase();
  if (p.includes('no') && p.includes('fit')) return 3;
  if (p.includes('partial')) return 2;
  if (p.includes('fit')) return 1;
  return null;
}

export const dealsHandlers = [
  http.get('/api/v1/deals', ({ request }) => {
    const status = new URL(request.url).searchParams.get('status') ?? 'active';
    const deals = status === 'all' ? store : store.filter((d) => d.status === status);
    return ok({
      deals: deals.map((d) => ({
        ...d,
        pipelineSummary: d.pipelineSummary ?? [],
      })),
    });
  }),

  http.post('/api/v1/deals', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      dealType?: 'sell_side' | 'buy_side';
      description?: string;
    };
    if (!body.name?.trim()) return err(400, 'Deal name is required.');
    seq += 1;
    const deal: MockDeal = {
      id: `deal_${seq}`,
      name: body.name.trim(),
      dealType: body.dealType ?? 'sell_side',
      description: body.description ?? '',
      status: 'active',
      leadUserId: 'u1',
      yourRole: 'lead',
      stages: makeStages(SELL_STAGES),
      members: [{ userId: 'u1', name: 'Raghav', email: 'r@x.com', role: 'lead' }],
      createdAt: '2026-07-22T00:00:00Z',
      updatedAt: '2026-07-22T00:00:00Z',
    };
    store.push(deal);
    return ok({ deal }, { message: 'Deal created.' });
  }),

  http.get('/api/v1/deals/:id', ({ params }) => {
    const d = find(String(params.id));
    return d ? ok({ deal: d }) : err(404, 'Deal not found.');
  }),

  http.patch('/api/v1/deals/:id', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
    };
    if (body.name !== undefined) d.name = body.name;
    if (body.description !== undefined) d.description = body.description;
    return ok({ deal: d }, { message: 'Deal updated.' });
  }),

  http.post('/api/v1/deals/:id/archive', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    d.status = 'archived';
    return ok({ deal: d }, { message: 'Deal archived.' });
  }),

  http.put('/api/v1/deals/:id/stages', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const body = (await request.json().catch(() => ({}))) as { stages?: MockDeal['stages'] };
    if (!body.stages?.length) return err(400, 'A deal must have at least one stage.');
    d.stages = body.stages;
    return ok({ deal: d }, { message: 'Stages updated.' });
  }),

  http.get('/api/v1/deals/:id/member-search', ({ request, params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const q = (new URL(request.url).searchParams.get('q') ?? '').trim().toLowerCase();
    const existing = new Set(d.members.map((m) => m.userId));
    const users = q
      ? ORG_DIRECTORY.filter(
          (u) => !existing.has(u.userId) && `${u.name} ${u.email}`.toLowerCase().includes(q),
        )
      : [];
    return ok({ users });
  }),

  http.post('/api/v1/deals/:id/members', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const body = (await request.json().catch(() => ({}))) as { userId?: string };
    if (!body.userId) return err(400, 'user_id is required.');
    if (!d.members.some((m) => m.userId === body.userId)) {
      // Resolve name/email like the real backend (_user_identity), not the raw user id.
      const identity = ORG_DIRECTORY.find((u) => u.userId === body.userId);
      d.members.push({
        userId: body.userId,
        name: identity?.name ?? body.userId,
        email: identity?.email ?? '',
        role: 'member',
      });
    }
    return ok({ deal: d }, { message: 'Member added.' });
  }),

  http.delete('/api/v1/deals/:id/members/:uid', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    if (String(params.uid) === d.leadUserId) return err(400, 'Transfer the lead role first.');
    d.members = d.members.filter((m) => m.userId !== String(params.uid));
    return ok({ deal: d }, { message: 'Member removed.' });
  }),

  http.post('/api/v1/deals/:id/lead', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const body = (await request.json().catch(() => ({}))) as { userId?: string };
    if (!d.members.some((m) => m.userId === body.userId))
      return err(400, 'New lead must be a member.');
    d.members.forEach((m) => (m.role = m.userId === body.userId ? 'lead' : 'member'));
    d.leadUserId = String(body.userId);
    d.yourRole = body.userId === 'u1' ? 'lead' : 'member';
    return ok({ deal: d }, { message: 'Lead transferred.' });
  }),

  // ── F18 pipeline companies ──
  http.get('/api/v1/deals/:id/companies', ({ params }) =>
    ok({ companies: dealCompanies(String(params.id)) }),
  ),

  http.post('/api/v1/deals/:id/companies', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const body = (await request.json().catch(() => ({}))) as {
      companyName?: string;
      website?: string;
      predictedFit?: string;
    };
    if (!body.companyName?.trim()) return err(400, 'Company name is required.');
    cSeq += 1;
    const rec: MockCompany = {
      id: `rec_${cSeq}`,
      dealId: d.id,
      companyName: body.companyName.trim(),
      website: body.website ?? '',
      stageId: d.stages[0]?.stageId ?? '',
      // Hand-added record: no source run, so no trusted fit and no buyer type — both left unset,
      // mirroring the backend's _seed_buyer_attrs.
      tier: null,
      buyerType: '',
      outreachStatus: '',
      passReason: '',
      predictedFit: body.predictedFit ?? '',
      sourceResultId: '',
      contacts: [],
      notes: '',
      ownerUserId: '',
      ownerName: '',
    };
    companies.push(rec);
    return ok({ company: rec }, { message: 'Company added.' });
  }),

  http.post('/api/v1/deals/:id/companies/bulk', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const body = (await request.json().catch(() => ({}))) as {
      rows?: {
        companyName?: string;
        predictedFit?: string;
        website?: string;
        sourceResultId?: string;
        buyerType?: string;
        contacts?: {
          name?: string;
          email?: string;
          phone?: string;
          title?: string;
          isPrimary?: boolean;
          contactId?: string;
          outreachStatus?: string;
        }[];
      }[];
    };
    const existing = new Set(dealCompanies(d.id).map((c) => norm(c.companyName)));
    const seen = new Set<string>();
    let added = 0;
    const skipped: { name: string; reason: string }[] = [];
    for (const row of body.rows ?? []) {
      const name = (row.companyName ?? '').trim();
      if (!name) {
        skipped.push({ name: '', reason: 'missing name' });
        continue;
      }
      const key = norm(name);
      if (existing.has(key) || seen.has(key)) {
        skipped.push({ name, reason: 'duplicate in deal' });
        continue;
      }
      seen.add(key);
      cSeq += 1;
      const fit = row.predictedFit ?? '';
      const sourceResultId = row.sourceResultId ?? '';
      companies.push({
        id: `rec_${cSeq}`,
        dealId: d.id,
        companyName: name,
        website: row.website ?? '',
        stageId: d.stages[0]?.stageId ?? '',
        tier: autoTier(fit, Boolean(sourceResultId)),
        buyerType: row.buyerType || autoBuyerType(sourceResultId),
        outreachStatus: '',
        passReason: '',
        predictedFit: fit,
        sourceResultId: '',
        contacts: (row.contacts ?? []).map((c, i) => ({
          contactId: c.contactId || `ct_${cSeq}_${i}`,
          name: c.name ?? '',
          email: c.email ?? '',
          phone: c.phone ?? '',
          title: c.title ?? '',
          isPrimary: !!c.isPrimary,
          outreachStatus: c.outreachStatus || 'not_contacted',
        })),
        notes: '',
        ownerUserId: '',
        ownerName: '',
      });
      added += 1;
    }
    return ok({ added, skipped }, { message: `Added ${added} companies.` });
  }),

  http.patch('/api/v1/deals/:id/companies/:rid', async ({ params, request }) => {
    const rec = companies.find((c) => c.id === String(params.rid));
    if (!rec) return err(404, 'Company record not found.');
    const body = (await request.json().catch(() => ({}))) as Partial<MockCompany>;
    if (Array.isArray(body.contacts)) {
      body.contacts = body.contacts.map((c, i) => ({
        contactId: c.contactId || `ct_${rec.id}_${i}`,
        name: c.name ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        title: c.title ?? '',
        isPrimary: !!c.isPrimary,
        outreachStatus: c.outreachStatus || 'not_contacted',
      }));
    }
    Object.assign(rec, body);
    return ok({ company: rec });
  }),

  http.delete('/api/v1/deals/:id/companies/:rid', ({ params }) => {
    companies = companies.filter((c) => c.id !== String(params.rid));
    return ok(null, { message: 'Company removed.' });
  }),

  http.post('/api/v1/deals/:id/companies/:rid/stage', async ({ params, request }) => {
    const rec = companies.find((c) => c.id === String(params.rid));
    if (!rec) return err(404, 'Company record not found.');
    const body = (await request.json().catch(() => ({}))) as {
      stageId?: string;
      passReason?: string;
    };
    rec.stageId = body.stageId ?? rec.stageId;
    if (body.passReason) rec.passReason = body.passReason;
    return ok({ company: rec }, { message: 'Stage updated.' });
  }),

  http.get('/api/v1/deals/:id/companies/:rid/comments', ({ params }) =>
    ok({ comments: comments.filter((c) => c.recordId === String(params.rid)) }),
  ),

  http.post('/api/v1/deals/:id/companies/:rid/comments', async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { text?: string; mentions?: string[] };
    if (!body.text?.trim()) return err(400, 'Comment text is required.');
    cSeq += 1;
    const c = {
      id: `cmt_${cSeq}`,
      recordId: String(params.rid),
      authorUserId: 'u1',
      authorName: 'Raghav',
      text: body.text,
      mentions: body.mentions ?? [],
      createdAt: '2026-07-22T00:00:00Z',
    };
    comments.push(c);
    return ok({ comment: c }, { message: 'Comment added.' });
  }),

  http.get('/api/v1/deals/:id/buyer-log', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const stageName = new Map(d.stages.map((s) => [s.stageId, s.name]));
    return ok({
      buyerLog: dealCompanies(d.id).map((c) => ({
        id: c.id,
        companyName: c.companyName,
        website: c.website,
        stageId: c.stageId,
        tier: c.tier,
        buyerType: c.buyerType,
        stage: stageName.get(c.stageId) ?? '',
        outreachStatus: c.outreachStatus,
        passReason: c.passReason,
        notes: c.notes,
        ownerUserId: c.ownerUserId,
        ownerName: c.ownerName,
        contacts: c.contacts,
        stageDates: {},
      })),
    });
  }),

  http.get('/api/v1/deals/:id/activity', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    return ok({
      activity: [
        {
          id: 'act_1',
          dealId: d.id,
          actionType: 'deal.created',
          actorUserId: 'u1',
          actorName: 'Raghav',
          recordRef: '',
          payload: { name: d.name },
          createdAt: d.createdAt,
        },
      ],
    });
  }),

  http.get('/api/v1/deals/:id/companies/:rid/activity', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const rec = companies.find((c) => c.id === String(params.rid) && c.dealId === d.id);
    if (!rec) return err(404, 'Company record not found.');
    return ok({
      activity: [
        {
          id: 'act_rec_1',
          dealId: d.id,
          actionType: 'company.added',
          actorUserId: 'u1',
          actorName: 'Raghav',
          recordRef: rec.id,
          payload: { companyName: rec.companyName },
          createdAt: d.createdAt,
        },
      ],
    });
  }),

  http.post('/api/v1/deals/:id/companies/:rid/activity', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const rec = companies.find((c) => c.id === String(params.rid) && c.dealId === d.id);
    if (!rec) return err(404, 'Company record not found.');
    const body = (await request.json().catch(() => ({}))) as { note?: string };
    if (!body.note?.trim()) return err(400, 'note is required.');
    return ok({ success: true }, { message: 'Note added.' });
  }),

  // ── F19 brief ──
  http.get('/api/v1/deals/:id/brief', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    return ok({ brief: briefs.find((b) => b.dealId === d.id) ?? null });
  }),

  http.post('/api/v1/deals/:id/brief', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    const filename = file instanceof File ? file.name : 'brief.pdf';
    const size = file instanceof File ? file.size : 0;
    let brief = briefs.find((b) => b.dealId === d.id);
    if (!brief) {
      fSeq += 1;
      brief = {
        id: `brief_${fSeq}`,
        dealId: d.id,
        filename,
        contentType: 'application/pdf',
        sizeBytes: size,
        status: 'parsing',
        errorMessage: '',
        criteria: {},
        hasFile: true,
        uploadedBy: 'u1',
        createdAt: '2026-07-23T00:00:00Z',
        updatedAt: '2026-07-23T00:00:00Z',
      };
      briefs.push(brief);
    } else {
      brief.filename = filename;
      brief.sizeBytes = size;
      brief.status = 'parsing';
      brief.errorMessage = '';
      brief.criteria = {};
      brief.hasFile = true;
    }
    return ok({ brief }, { message: 'Brief uploaded.' });
  }),

  http.put('/api/v1/deals/:id/brief/criteria', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const brief = briefs.find((b) => b.dealId === d.id);
    if (!brief) return err(404, 'No brief for this deal.');
    const body = (await request.json().catch(() => ({}))) as {
      criteria?: Record<string, unknown>;
      status?: 'parsing' | 'ready' | 'error';
      errorMessage?: string;
    };
    brief.status = body.status ?? 'ready';
    if (brief.status === 'ready') {
      brief.criteria = body.criteria ?? {};
      brief.errorMessage = '';
    } else if (brief.status === 'error') {
      brief.errorMessage = body.errorMessage ?? 'Could not parse the brief.';
    }
    return ok({ brief }, { message: 'Brief criteria saved.' });
  }),

  http.delete('/api/v1/deals/:id/brief', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const before = briefs.length;
    briefs = briefs.filter((b) => b.dealId !== d.id);
    if (briefs.length === before) return err(404, 'No brief for this deal.');
    return ok(null, { message: 'Brief deleted.' });
  }),

  http.get('/api/v1/deals/:id/brief/download', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const brief = briefs.find((b) => b.dealId === d.id);
    if (!brief) return err(404, 'No brief file for this deal.');
    return new Response(new Blob(['%PDF mock brief'], { type: 'application/pdf' }), {
      headers: { 'Content-Disposition': `attachment; filename="${brief.filename}"` },
    });
  }),

  // ── F19 list linking ──
  http.get('/api/v1/deals/lists/for-result/:resultId', ({ params }) =>
    ok({ links: links.filter((l) => l.resultId === String(params.resultId)) }),
  ),

  http.get('/api/v1/deals/:id/lists', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    return ok({ links: links.filter((l) => l.dealId === d.id) });
  }),

  http.post('/api/v1/deals/:id/lists', async ({ params, request }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const body = (await request.json().catch(() => ({}))) as {
      resultId?: string;
      kind?: 'processed' | 'financial';
      title?: string;
      listType?: string;
      totalCount?: number;
    };
    const resultId = (body.resultId ?? '').trim();
    if (!resultId) return err(400, 'A result id is required.');
    let link = links.find((l) => l.dealId === d.id && l.resultId === resultId);
    if (link) {
      link.title = body.title ?? link.title;
      link.listType = body.listType ?? link.listType;
      link.totalCount = body.totalCount ?? link.totalCount;
    } else {
      fSeq += 1;
      link = {
        id: `link_${fSeq}`,
        dealId: d.id,
        resultId,
        kind: body.kind ?? 'processed',
        title: body.title ?? '',
        listType: body.listType ?? '',
        totalCount: body.totalCount ?? 0,
        linkedBy: 'u1',
        createdAt: '2026-07-23T00:00:00Z',
      };
      links.push(link);
    }
    return ok({ link }, { message: 'List linked.' });
  }),

  http.delete('/api/v1/deals/:id/lists/:resultId', ({ params }) => {
    const d = find(String(params.id));
    if (!d) return err(404, 'Deal not found.');
    const before = links.length;
    links = links.filter((l) => !(l.dealId === d.id && l.resultId === String(params.resultId)));
    if (links.length === before) return err(404, 'List link not found.');
    return ok(null, { message: 'List unlinked.' });
  }),
];
