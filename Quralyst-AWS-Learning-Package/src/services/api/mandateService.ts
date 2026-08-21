// Mandate parser (Tier A / A12 / F11) — POST a pasted mandate / CIM + attachments + URLs and get
// back a structured prefill for the research wizards. Snake_case is returned as-is (the backend
// keeps envelope keys literal; the composer hook maps it onto the wizard form fields).
import { http } from '../http';
import { endpoints } from '../endpoints';
import { industryList, subIndustryMap } from '@/data/subIndustryMap';

export interface MandateGeography {
  countries: string[];
  states: string[];
  cities: string[];
}

/** Structured criteria extracted from a mandate (matches the backend MandatePrefill shape). */
export interface MandatePrefill {
  /** Which builder to open — set by Research Home parse / LLM. Optional for older callers. */
  mode?: 'target' | 'strategic' | 'financial';
  business_queries: string[];
  industry: string;
  sub_industry: string;
  geography: MandateGeography;
  revenue_min: number | null;
  revenue_max: number | null;
  ebitda_min: number | null;
  ebitda_max: number | null;
  employees_min: number | null;
  employees_max: number | null;
  description: string;
  ideal_buyer_types: string[];
}

export type MandateIntent = 'example-target-profile' | 'example-buyer-profile' | 'default';

export interface ParseMandateInput {
  text?: string;
  files?: File[];
  urls?: string[];
  intent?: MandateIntent;
}

export interface MandateService {
  parseMandate(input: ParseMandateInput): Promise<MandatePrefill>;
}

export const mandateService: MandateService = {
  parseMandate: async ({ text, files, urls, intent }) => {
    const fd = new FormData();
    if (text) fd.append('text', text);
    if (intent) fd.append('intent', intent);
    (files ?? []).forEach((f) => fd.append('files', f));
    if (urls && urls.length) fd.append('urls', JSON.stringify(urls));
    // Send the wizard's fixed vocabulary so industry/sub-industry come back dropdown-valid.
    fd.append('industries', JSON.stringify([...industryList]));
    fd.append('sub_industries_map', JSON.stringify(subIndustryMap));
    const data = await http<{ prefill: MandatePrefill }>(endpoints.research.parseMandate, {
      method: 'POST',
      body: fd,
    });
    return data.prefill;
  },
};
