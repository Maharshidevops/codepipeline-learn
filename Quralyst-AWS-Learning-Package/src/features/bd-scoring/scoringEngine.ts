// BD scoring engine (frontend). Must stay byte-for-byte equivalent to the Python
// engine in artifacts/quralyst-api/services/bd_scoring_service.py so the live
// score shown in the drawer always matches what the server persists. No criteria,
// weights, labels, or scores are hardcoded: everything is read from the template
// config.

export interface ScoringOption {
  value: string;
  label: string;
  score: number;
  note?: string;
}

export interface ScoringBand {
  min: number | null;
  max: number | null;
  score: number;
}

export interface RatioComputation {
  type: 'ratio';
  numerator_field: string;
  numerator_midpoints: Record<string, number>;
  denominator_field: string;
}

export interface Criterion {
  id: string;
  label: string;
  type: 'single_select' | 'integer' | 'computed';
  data_source?: 'database' | 'research';
  help_text?: string;
  options?: ScoringOption[];
  scoring_bands?: ScoringBand[];
  computation?: RatioComputation;
}

export interface ScoringModule {
  id: string;
  name: string;
  description?: string;
  max_score: number;
  criteria: Criterion[];
}

export interface BonusCondition {
  field: string;
  operator: 'eq' | 'in';
  value?: string;
  values?: string[];
}

export interface BonusRule {
  id: string;
  label: string;
  description?: string;
  type: 'auto' | 'manual';
  score: number;
  conditions?: BonusCondition[];
}

export interface Disqualifier {
  id: string;
  label: string;
}

export interface TierThreshold {
  key: string;
  label: string;
  color: string;
  min_score: number;
}

export interface TemplateConfig {
  version: string;
  max_base_score: number;
  max_total_score: number;
  max_bonus_score: number;
  scored_entity_label?: string;
  tier_thresholds: TierThreshold[];
  modules: ScoringModule[];
  bonus_rules: BonusRule[];
  disqualifiers: Disqualifier[];
}

export type FieldValues = Record<string, string | number | boolean | null | undefined>;

export interface ScoreResult {
  score_total: number;
  module_scores: Record<string, number>;
  score_breakdown: Record<string, Record<string, number>>;
  bonus_score: number;
  is_disqualified: boolean;
  tier: string;
}

function toInt(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(n)) return 0;
  return Math.trunc(n);
}

function isSet(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function bandScore(bands: ScoringBand[] | undefined, value: number): number {
  for (const band of bands || []) {
    const lo = band.min;
    const hi = band.max;
    if (
      (lo === null || lo === undefined || value >= lo) &&
      (hi === null || hi === undefined || value <= hi)
    ) {
      return Math.trunc(band.score || 0);
    }
  }
  return 0;
}

export function computeScore(config: TemplateConfig, fieldValues: FieldValues): ScoreResult {
  const cfg = config || ({} as TemplateConfig);
  const fv = fieldValues || {};

  // 1. DISQUALIFIER CHECK
  for (const dq of cfg.disqualifiers || []) {
    if (fv[dq.id]) {
      return {
        score_total: 0,
        is_disqualified: true,
        tier: 'disqualified',
        module_scores: {},
        score_breakdown: {},
        bonus_score: 0,
      };
    }
  }

  // 2. MODULE SCORING
  const moduleScores: Record<string, number> = {};
  const scoreBreakdown: Record<string, Record<string, number>> = {};
  for (const module of cfg.modules || []) {
    let moduleScore = 0;
    const breakdown: Record<string, number> = {};
    for (const crit of module.criteria || []) {
      let contribution = 0;

      if (crit.type === 'single_select') {
        const selected = fv[crit.id];
        for (const opt of crit.options || []) {
          if (opt.value === selected) {
            contribution = Math.trunc(opt.score || 0);
            break;
          }
        }
      } else if (crit.type === 'integer') {
        const value = toInt(fv[crit.id]);
        contribution = bandScore(crit.scoring_bands, value);
      } else if (crit.type === 'computed') {
        const comp = crit.computation;
        if (comp && comp.type === 'ratio') {
          const numKey = fv[comp.numerator_field] as string | undefined;
          const midpoints = comp.numerator_midpoints || {};
          const midpoint = numKey != null && numKey in midpoints ? toInt(midpoints[numKey]) : 0;
          const denom = toInt(fv[comp.denominator_field]);
          if (midpoint > 0 && denom > 0) {
            const ratio = midpoint / denom;
            contribution = bandScore(crit.scoring_bands, ratio);
          }
        }
      }

      breakdown[crit.id] = contribution;
      moduleScore += contribution;
    }
    moduleScores[module.id] = moduleScore;
    scoreBreakdown[module.id] = breakdown;
  }

  // 3. BONUS CALCULATION
  let autoBonus = 0;
  let manualBonus = 0;
  for (const rule of cfg.bonus_rules || []) {
    if (rule.type === 'auto') {
      let allMet = true;
      for (const cond of rule.conditions || []) {
        if (cond.operator === 'eq') {
          if (fv[cond.field] !== cond.value) {
            allMet = false;
            break;
          }
        } else if (cond.operator === 'in') {
          if (!(cond.values || []).includes(fv[cond.field] as string)) {
            allMet = false;
            break;
          }
        }
      }
      if (allMet) autoBonus += Math.trunc(rule.score || 0);
    } else if (rule.type === 'manual') {
      if (fv[rule.id]) manualBonus += Math.trunc(rule.score || 0);
    }
  }

  const maxBonus = Math.trunc(cfg.max_bonus_score || 0);
  const totalBonus = Math.min(autoBonus + manualBonus, maxBonus);

  // 4. TOTAL AND TIER
  const base = Object.values(moduleScores).reduce((a, b) => a + b, 0);
  const maxTotal = Math.trunc(cfg.max_total_score ?? base + totalBonus);
  const scoreTotal = Math.min(base + totalBonus, maxTotal);

  let tier: string;
  if (!anyScoringFieldSet(cfg, fv)) {
    tier = 'unscored';
  } else {
    tier = resolveTier(cfg, scoreTotal);
  }

  return {
    score_total: scoreTotal,
    module_scores: moduleScores,
    score_breakdown: scoreBreakdown,
    bonus_score: totalBonus,
    is_disqualified: false,
    tier,
  };
}

function anyScoringFieldSet(config: TemplateConfig, fv: FieldValues): boolean {
  for (const module of config.modules || []) {
    for (const crit of module.criteria || []) {
      if (crit.type === 'single_select' || crit.type === 'integer') {
        if (isSet(fv[crit.id])) return true;
      }
    }
  }
  return false;
}

function resolveTier(config: TemplateConfig, scoreTotal: number): string {
  let bestKey: string | null = null;
  let bestMin: number | null = null;
  for (const t of config.tier_thresholds || []) {
    const minScore = Math.trunc(t.min_score || 0);
    if (scoreTotal >= minScore && (bestMin === null || minScore > bestMin)) {
      bestMin = minScore;
      bestKey = t.key;
    }
  }
  return bestKey || 'unscored';
}

// Returns the calculated ratio and a formatted display string for a computed
// criterion (revenue per employee). Used by CriterionField for read-only display.
export function computeRpeDisplay(
  crit: Criterion,
  fieldValues: FieldValues,
): { value: number | null; display: string; score: number } {
  const comp = crit.computation;
  if (!comp || comp.type !== 'ratio') {
    return { value: null, display: 'n/a', score: 0 };
  }
  const numKey = fieldValues[comp.numerator_field] as string | undefined;
  const midpoints = comp.numerator_midpoints || {};
  const midpoint = numKey != null && numKey in midpoints ? toInt(midpoints[numKey]) : 0;
  const denom = toInt(fieldValues[comp.denominator_field]);
  if (midpoint > 0 && denom > 0) {
    const ratio = midpoint / denom;
    const score = bandScore(crit.scoring_bands, ratio);
    return {
      value: ratio,
      display: `$${Math.round(ratio).toLocaleString()} per employee`,
      score,
    };
  }
  return { value: null, display: 'Set revenue and employees to calculate', score: 0 };
}

export function tierForScore(config: TemplateConfig, scoreTotal: number): string {
  return resolveTier(config, scoreTotal);
}

// ── Census revenue estimate helpers ─────────────────────────────────────────
// Advisory only: these estimate a revenue range from an industry benchmark and
// an employee count. They never feed computeScore or auto-populate revenue_range.

export interface RevenueBenchmarkLite {
  revenue_per_employee_low: number;
  revenue_per_employee_mid: number;
  revenue_per_employee_high: number;
}

export interface RevenueEstimate {
  low: number;
  mid: number;
  high: number;
}

// Estimate total revenue (low/mid/high, in dollars) from a per employee
// benchmark and a headcount. Returns null when either input is missing.
export function estimateRevenue(
  benchmark: RevenueBenchmarkLite | null | undefined,
  employees: number | null | undefined,
): RevenueEstimate | null {
  if (!benchmark) return null;
  const emp = typeof employees === 'number' ? employees : Number(employees);
  if (!Number.isFinite(emp) || emp <= 0) return null;
  const mid = Math.round((benchmark.revenue_per_employee_mid || 0) * emp);
  if (mid <= 0) return null;
  return {
    low: Math.round((benchmark.revenue_per_employee_low || 0) * emp),
    mid,
    high: Math.round((benchmark.revenue_per_employee_high || 0) * emp),
  };
}

// Map an estimated revenue (dollars) to a revenue_range option value, mirroring
// the backend map_revenue_to_range thresholds exactly. Returns the matching
// option value only when it exists in the template's revenue_range options.
export function suggestRevenueBand(
  estMid: number | null | undefined,
  revenueRangeOptions: ScoringOption[] | null | undefined,
): string | null {
  if (typeof estMid !== 'number' || !Number.isFinite(estMid) || estMid <= 0) {
    return null;
  }
  const m = estMid / 1_000_000;
  let key: string;
  if (m < 1) key = 'r0';
  else if (m < 2) key = 'r1';
  else if (m < 3) key = 'r2';
  else if (m < 5) key = 'r3';
  else if (m < 10) key = 'r5';
  else if (m < 20) key = 'r10';
  else key = 'r20';
  const opts = revenueRangeOptions || [];
  return opts.some((o) => o.value === key) ? key : null;
}

// Format a dollar amount as a compact money string (e.g. $7.0M, $850K).
export function formatMoney(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return 'n/a';
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}K`;
  }
  return `$${Math.round(amount)}`;
}
