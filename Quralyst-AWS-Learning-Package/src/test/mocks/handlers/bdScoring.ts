// MSW handlers for BD Scoring (F36.3).
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { err, ok } from '@/test/mocks/envelope';
import {
  mockBdBenchmarks,
  mockBdCompanies,
  mockBdContexts,
  mockBdTemplates,
} from '@/test/mocks/fixtures/bdScoring';
import type { BdScoredCompany, BdScoringTemplate } from '@/types';
import { computeScore } from '@/features/bd-scoring/scoringEngine';

const templates: BdScoringTemplate[] = structuredClone(mockBdTemplates);
let companies: BdScoredCompany[] = structuredClone(mockBdCompanies);

function findTemplate(id: string) {
  return templates.find((t) => t.id === id) ?? null;
}

export const bdScoringHandlers = [
  http.get(endpoints.bdScoring.templates, ({ request }) => {
    const url = new URL(request.url);
    const tut = url.searchParams.get('target_user_type');
    const dir = url.searchParams.get('scoring_direction');
    if (tut && !['ibanking', 'pe', 'both'].includes(tut)) {
      return err(400, 'Invalid target_user_type.');
    }
    if (dir && !['seller', 'buyer'].includes(dir)) {
      return err(400, 'Invalid scoring_direction.');
    }
    let items = templates.filter((t) => t.isActive);
    if (tut) {
      items = items.filter((t) => t.targetUserType === tut || t.targetUserType === 'both');
    }
    if (dir === 'buyer') items = items.filter((t) => t.scoringDirection === 'buyer');
    if (dir === 'seller') {
      items = items.filter((t) => !t.scoringDirection || t.scoringDirection === 'seller');
    }
    items = [...items].sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return ok({ templates: items });
  }),

  http.get(endpoints.bdScoring.template(':id'), ({ params }) => {
    const t = findTemplate(String(params.id));
    if (!t) return err(404, 'Template not found.');
    return ok({ template: t });
  }),

  http.post(endpoints.bdScoring.generateTemplate, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const description = String(body.description || '').trim();
    if (description.length < 20) {
      return err(400, 'Please describe your scoring needs in at least a short paragraph.');
    }
    return ok({
      draft: {
        name: 'AI Generated Template',
        description: description.slice(0, 120),
        slug: 'ai-generated-template',
        targetUserType: String(body.targetUserType || body.target_user_type || 'both'),
        scoringDirection: String(body.scoringDirection || body.scoring_direction || 'seller'),
        provider: 'anthropic',
        config: {
          version: '1.0',
          max_base_score: 100,
          max_total_score: 120,
          max_bonus_score: 20,
          modules: [
            {
              id: 'm1',
              name: 'Fit',
              max_score: 100,
              criteria: [
                {
                  id: 'revenue_range',
                  label: 'Revenue',
                  type: 'single_select',
                  options: [{ value: 'r5', label: '$5–10M', score: 10 }],
                },
              ],
            },
          ],
          bonus_rules: [],
          disqualifiers: [],
          tier_thresholds: [
            { key: 'tier1', label: 'Tier 1: Outreach now', color: 'green', min_score: 75 },
            { key: 'tier2', label: 'Tier 2: Nurture', color: 'amber', min_score: 50 },
            { key: 'tier3', label: 'Tier 3: Monitor', color: 'gray', min_score: 30 },
            { key: 'tier4', label: 'Tier 4: Archive', color: 'light-gray', min_score: 0 },
          ],
        },
      },
    });
  }),

  http.post(endpoints.bdScoring.templates, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name || '').trim();
    if (!name) return err(400, 'name is required.');
    const config = body.config as BdScoringTemplate['config'] | undefined;
    if (config && typeof config === 'object') {
      for (const m of config.modules || []) {
        for (const c of m.criteria || []) {
          if (c.type === 'computed' && c.computation?.type !== 'ratio') {
            return err(422, "computed criteria must use computation.type == 'ratio'.");
          }
        }
      }
    }
    const t: BdScoringTemplate = {
      id: `tpl-org-${templates.length + 1}`,
      slug: String(body.slug || name.toLowerCase().replace(/\s+/g, '-')),
      name,
      description: (body.description as string) ?? null,
      targetUserType: String(body.targetUserType || body.target_user_type || 'both'),
      scoringDirection: String(body.scoringDirection || body.scoring_direction || 'seller'),
      isDefault: false,
      isActive: true,
      config: (config || {
        modules: [],
        bonus_rules: [],
        disqualifiers: [],
        tier_thresholds: [],
        max_total_score: 120,
        max_bonus_score: 20,
        version: '1',
        max_base_score: 100,
      }) as BdScoringTemplate['config'],
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    templates.push(t);
    return ok({ template: t }, { status: 201 });
  }),

  http.put(endpoints.bdScoring.template(':id'), async ({ params, request }) => {
    const t = findTemplate(String(params.id));
    if (!t) return err(404, 'Template not found.');
    const body = (await request.json()) as Record<string, unknown>;
    if (t.isSystem) {
      const cloned: BdScoringTemplate = {
        ...structuredClone(t),
        id: `tpl-clone-${Date.now()}`,
        slug: `${t.slug}-org-clone`,
        isSystem: false,
        isDefault: false,
        name: String(body.name ?? t.name),
        config: (body.config as BdScoringTemplate['config']) ?? t.config,
      };
      templates.push(cloned);
      return ok({ template: cloned });
    }
    if (body.name != null) t.name = String(body.name);
    if (body.config != null) t.config = body.config as BdScoringTemplate['config'];
    t.updatedAt = new Date().toISOString();
    return ok({ template: t });
  }),

  http.delete(endpoints.bdScoring.template(':id'), ({ params }) => {
    const idx = templates.findIndex((t) => t.id === String(params.id));
    if (idx < 0) return err(404, 'Template not found.');
    if (templates[idx].isSystem) {
      return err(400, 'System templates cannot be deleted; clone and edit instead.');
    }
    templates.splice(idx, 1);
    return new Response(null, { status: 204 });
  }),

  http.get(endpoints.bdScoring.companies, ({ request }) => {
    const url = new URL(request.url);
    const tid = url.searchParams.get('template_id');
    if (!tid) return err(400, 'template_id is required.');
    let rows = companies.filter((c) => c.templateId === tid);
    const tier = url.searchParams.get('tier');
    const search = url.searchParams.get('search');
    const lc = url.searchParams.get('list_context');
    if (tier) rows = rows.filter((c) => c.tier === tier);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((c) => c.companyName.toLowerCase().includes(q));
    }
    if (lc) rows = rows.filter((c) => c.listContext === lc);
    rows = [...rows].sort((a, b) => {
      if (b.scoreTotal !== a.scoreTotal) return b.scoreTotal - a.scoreTotal;
      return a.companyName.localeCompare(b.companyName);
    });
    return ok({ companies: rows });
  }),

  http.get(endpoints.bdScoring.contexts, ({ request }) => {
    const tid = new URL(request.url).searchParams.get('template_id');
    if (!tid) return err(400, 'template_id is required.');
    return ok({ contexts: mockBdContexts });
  }),

  http.get(endpoints.bdScoring.company(':id'), ({ params }) => {
    const c = companies.find((x) => x.id === String(params.id));
    if (!c) return err(404, 'Company not found.');
    return ok({ company: c });
  }),

  http.post(endpoints.bdScoring.companies, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const tid = String(body.templateId || body.template_id || '');
    if (!tid) return err(400, 'template_id is required.');
    const template = findTemplate(tid);
    if (!template) return err(404, 'Template not found.');
    const fv = (body.fieldValues || body.field_values || {}) as Record<string, unknown>;
    if (typeof fv !== 'object' || Array.isArray(fv)) {
      return err(400, 'field_values must be an object.');
    }
    const score = computeScore(template.config, fv as never);
    const company: BdScoredCompany = {
      id: `c-${Date.now()}`,
      templateId: tid,
      companyName: String(body.companyName || body.company_name || ''),
      notes: (body.notes as string) ?? null,
      industryKey: (body.industryKey as string) ?? null,
      listContext: (body.listContext as string) ?? null,
      fieldValues: fv as never,
      scoreTotal: score.score_total,
      moduleScores: score.module_scores,
      scoreBreakdown: score.score_breakdown,
      bonusScore: score.bonus_score,
      isDisqualified: score.is_disqualified,
      tier: score.tier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    companies.push(company);
    return ok({ company }, { status: 201 });
  }),

  http.put(endpoints.bdScoring.company(':id'), async ({ params, request }) => {
    const c = companies.find((x) => x.id === String(params.id));
    if (!c) return err(404, 'Company not found.');
    const body = (await request.json()) as Record<string, unknown>;
    if (body.companyName != null || body.company_name != null) {
      c.companyName = String(body.companyName ?? body.company_name ?? '');
    }
    if ('notes' in body) c.notes = body.notes as string | null;
    if ('fieldValues' in body || 'field_values' in body) {
      const fv = (body.fieldValues ?? body.field_values) as Record<string, unknown>;
      if (typeof fv !== 'object' || Array.isArray(fv)) {
        return err(400, 'field_values must be an object.');
      }
      c.fieldValues = fv as never; // replace
    }
    const template = findTemplate(c.templateId || '');
    if (template) {
      const score = computeScore(template.config, c.fieldValues);
      c.scoreTotal = score.score_total;
      c.moduleScores = score.module_scores;
      c.scoreBreakdown = score.score_breakdown;
      c.bonusScore = score.bonus_score;
      c.isDisqualified = score.is_disqualified;
      c.tier = score.tier;
    }
    c.updatedAt = new Date().toISOString();
    return ok({ company: c });
  }),

  http.delete(endpoints.bdScoring.company(':id'), ({ params }) => {
    const idx = companies.findIndex((x) => x.id === String(params.id));
    if (idx < 0) return err(404, 'Company not found.');
    companies.splice(idx, 1);
    return new Response(null, { status: 204 });
  }),

  http.post(endpoints.bdScoring.importCsv, async () =>
    ok({
      created: 1,
      skipped: 2,
      errors: ['Row 2: missing company_name.'],
    }),
  ),

  http.post(endpoints.bdScoring.bulkFromRows, async () => ok({ created: 3, skipped: 1 })),

  http.get(endpoints.bdScoring.benchmarks, () => ok({ benchmarks: mockBdBenchmarks })),
];

/** Test helper — reset in-memory company rows between tests if needed. */
export function resetBdScoringMockState() {
  companies = structuredClone(mockBdCompanies);
}
