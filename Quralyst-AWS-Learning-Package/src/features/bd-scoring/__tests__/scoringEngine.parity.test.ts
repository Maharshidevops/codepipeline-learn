// Parity: TS computeScore must match Python engine on the shared fixture (F36.3).
import { describe, it, expect } from 'vitest';
import { computeScore, type TemplateConfig } from '../scoringEngine';
import parity from './bd_scoring_parity_cases.json';
import seed from './bd_scoring_templates_seed.json';

const configs = Object.fromEntries(
  (seed as { slug: string; config: TemplateConfig }[]).map((s) => [s.slug, s.config]),
);

describe('bd scoringEngine parity', () => {
  it('matches every fixture case', () => {
    for (const caseRow of parity.cases) {
      const kind = (caseRow as { kind?: string }).kind || 'seed_config';
      if (kind === 'mapping') {
        // Mapping helpers live only on the Python side for F36.1; skip on FE.
        continue;
      }
      let config: TemplateConfig;
      if (kind === 'inline_config') {
        config = (caseRow as { config: TemplateConfig }).config;
      } else {
        const slug = (caseRow as { template_slug: string }).template_slug;
        config = configs[slug];
        expect(config, slug).toBeTruthy();
      }
      const fieldValues = (caseRow as { field_values: Record<string, unknown> }).field_values;
      const expected = (caseRow as { expected: Record<string, unknown> }).expected;
      const got = computeScore(config, fieldValues as never);
      expect(got, (caseRow as { id: string }).id).toEqual(expected);
    }
  });

  it('pins management_layer none IB=6 PE=2', () => {
    const ib = configs['sell-side-mandate-readiness-v1'];
    const pe = configs['acquisition-target-readiness-v1'];
    expect(computeScore(ib, { management_layer: 'none' }).score_breakdown.m3.management_layer).toBe(
      6,
    );
    expect(computeScore(pe, { management_layer: 'none' }).score_breakdown.m3.management_layer).toBe(
      2,
    );
  });
});
