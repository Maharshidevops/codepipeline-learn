// composerPrefill (F11) — store/take round-trip + prefill→form mapping (pure, no DOM).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  storeComposerPrefill,
  takeComposerPrefill,
  applyMandatePrefill,
  profileExampleUrl,
} from './composerPrefill';
import type { MandatePrefill } from '@/services/api';

// Mock the API facade so profileExampleUrl is tested in isolation (no network).
vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return { ...actual, mandateService: { parseMandate: vi.fn() } };
});
import { mandateService } from '@/services/api';

const PREFILL: MandatePrefill = {
  business_queries: ['HVAC services companies', 'in the US'],
  industry: 'Construction & Engineering',
  sub_industry: 'HVAC',
  geography: { countries: ['United States'], states: ['Texas'], cities: [] },
  revenue_min: 5_000_000,
  revenue_max: 15_000_000,
  ebitda_min: null,
  ebitda_max: null,
  employees_min: 20,
  employees_max: 200,
  description: 'Lower-mid-market HVAC services businesses.',
  ideal_buyer_types: ['Horizontal'],
};

describe('composerPrefill store/take', () => {
  beforeEach(() => sessionStorage.clear());

  it('round-trips and is one-shot (cleared after take)', () => {
    storeComposerPrefill(PREFILL);
    const got = takeComposerPrefill();
    expect(got?.industry).toBe('Construction & Engineering');
    expect(takeComposerPrefill()).toBeNull(); // consumed
  });

  it('returns null when nothing stored', () => {
    expect(takeComposerPrefill()).toBeNull();
  });

  it('falls back to a plain-text seed', async () => {
    const { storeComposerSeed } = await import('./composerPrefill');
    storeComposerSeed('B2B SaaS companies with around $2M ARR');
    const got = takeComposerPrefill();
    expect(got?.description).toBe('B2B SaaS companies with around $2M ARR');
    expect(got?.business_queries).toEqual(['B2B SaaS companies with around $2M ARR']);
    expect(takeComposerPrefill()).toBeNull();
  });
});

describe('applyMandatePrefill', () => {
  function fakeForm() {
    const calls: Record<string, unknown> = {};
    const getValues = () => ({
      businessQuery: [{ value: '' }],
      industry: '',
      subIndustry: '',
      size: {},
      geography: [],
    });
    const setValue = (name: string, value: unknown) => {
      calls[name] = value;
    };
    return { calls, getValues, setValue };
  }

  it('maps known fields onto the wizard form', () => {
    const { calls, getValues, setValue } = fakeForm();
    const n = applyMandatePrefill(PREFILL, getValues, setValue);
    expect(n).toBeGreaterThan(0);
    expect(calls['businessQuery.0.value']).toContain('HVAC services companies');
    expect(calls['industry']).toBe('Construction & Engineering');
    expect(calls['subIndustry']).toBe('HVAC');
    expect(calls['size.minRevenue']).toBe('5000000');
    expect(calls['size.maxRevenue']).toBe('15000000');
    expect(calls['size.minEmployees']).toBe('20');
    expect(calls['geography']).toEqual([
      { country: 'United States', state: 'Texas', city: undefined },
    ]);
  });

  it('never touches fields the form does not have', () => {
    const calls: Record<string, unknown> = {};
    const getValues = () => ({ industry: '' }); // minimal form: only industry
    const setValue = (name: string, value: unknown) => {
      calls[name] = value;
    };
    applyMandatePrefill(PREFILL, getValues, setValue);
    expect(calls['industry']).toBe('Construction & Engineering');
    expect('businessQuery.0.value' in calls).toBe(false);
    expect('size.minRevenue' in calls).toBe(false);
    expect('geography' in calls).toBe(false);
  });
});

describe('profileExampleUrl (example-company chips)', () => {
  const parseMandate = mandateService.parseMandate as unknown as ReturnType<typeof vi.fn>;
  beforeEach(() => parseMandate.mockReset());

  function fakeForm() {
    const calls: Record<string, unknown> = {};
    const getValues = () => ({
      businessQuery: [{ value: '' }],
      industry: '',
      subIndustry: '',
      size: {},
      geography: [],
    });
    const setValue = (name: string, value: unknown) => {
      calls[name] = value;
    };
    return { calls, getValues, setValue };
  }

  it('profiles the URL with the given intent and folds the criteria into the form', async () => {
    parseMandate.mockResolvedValue(PREFILL);
    const { calls, getValues, setValue } = fakeForm();

    const applied = await profileExampleUrl(
      'https://comfortsystems.com',
      'example-buyer-profile',
      getValues,
      setValue,
    );

    // Sent exactly the one URL, tagged as a BUYER example (intent-aware).
    expect(parseMandate).toHaveBeenCalledWith({
      urls: ['https://comfortsystems.com'],
      intent: 'example-buyer-profile',
    });
    // The profiled criteria overwrote the (empty) form.
    expect(applied).toBeGreaterThan(0);
    expect(calls['industry']).toBe('Construction & Engineering');
    expect(calls['subIndustry']).toBe('HVAC');
    expect(calls['size.minRevenue']).toBe('5000000');
  });

  it('passes the target intent through unchanged (same UI, different prompt)', async () => {
    parseMandate.mockResolvedValue(PREFILL);
    const { getValues, setValue } = fakeForm();
    await profileExampleUrl('https://acme.com', 'example-target-profile', getValues, setValue);
    expect(parseMandate).toHaveBeenCalledWith({
      urls: ['https://acme.com'],
      intent: 'example-target-profile',
    });
  });

  it('propagates a profiling failure so the caller can flag the chip', async () => {
    parseMandate.mockRejectedValueOnce(new Error('could not read that site'));
    const { calls, getValues, setValue } = fakeForm();
    await expect(
      profileExampleUrl('https://bad.example', 'example-buyer-profile', getValues, setValue),
    ).rejects.toThrow();
    expect(Object.keys(calls)).toHaveLength(0); // nothing applied on failure
  });
});
