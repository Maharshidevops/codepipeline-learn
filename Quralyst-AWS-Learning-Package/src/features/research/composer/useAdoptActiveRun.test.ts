/**
 * F12 — ownsActiveJob gating for mount-time adopt (cross-mode bleed guard).
 */
import { describe, expect, it } from 'vitest';
import { ownsActiveJob, researchHomeHrefForProcessType } from './useAdoptActiveRun';
import type { ActiveProcessing } from '@/services/api/processService';
import { paths } from '@/routes/paths';

function active(partial: Partial<ActiveProcessing>): ActiveProcessing {
  return { active: true, ...partial };
}

describe('ownsActiveJob', () => {
  it('matches exact processType to composer mode', () => {
    expect(ownsActiveJob(active({ processType: 'strategic_buyer_list' }), 'strategic')).toBe(true);
    expect(ownsActiveJob(active({ processType: 'target_list' }), 'strategic')).toBe(false);
    expect(ownsActiveJob(active({ processType: 'financial_verticals' }), 'financial')).toBe(true);
  });

  it('claims typeless jobs on target only', () => {
    expect(ownsActiveJob(active({ processId: 'x' }), 'target')).toBe(true);
    expect(ownsActiveJob(active({ processId: 'x' }), 'strategic')).toBe(false);
  });
});

describe('researchHomeHrefForProcessType', () => {
  it('routes strategic and FV to the correct composer', () => {
    expect(researchHomeHrefForProcessType('strategic_buyer_list')).toBe(paths.strategic);
    expect(researchHomeHrefForProcessType('financial_verticals')).toBe(paths.financialVerticals);
    expect(researchHomeHrefForProcessType('target_list')).toBe(paths.targetList);
  });
});
