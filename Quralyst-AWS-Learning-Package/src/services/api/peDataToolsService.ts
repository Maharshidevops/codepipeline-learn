// PE Data Tools service (F42.3) — typed seam over /api/pe/tools/*.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  DataToolJob,
  DataToolJobResults,
  DataToolJobsList,
  GicsClassifyResult,
  HoldingsClassifyResponse,
  LocationLookupResult,
  PeLookupResult,
  PeLookupType,
  ResumeJobResponse,
  UrlLookupResult,
} from '@/types';

export interface PEDataToolsService {
  urlLookup(input: {
    companyName: string;
    location?: string;
    description?: string;
  }): Promise<UrlLookupResult>;
  peLookup(input: {
    portfolioCompany: string;
    peFirm: string;
    lookupType?: PeLookupType;
  }): Promise<PeLookupResult>;
  locationLookup(input: { companyName: string; website?: string }): Promise<LocationLookupResult>;
  gicsClassify(input: {
    companyName: string;
    description?: string;
    productsServices?: string;
    keywords?: string[];
    website?: string;
  }): Promise<GicsClassifyResult>;
  recentUrl(limit?: number): Promise<UrlLookupResult[]>;
  recentPe(limit?: number): Promise<PeLookupResult[]>;
  recentLocation(limit?: number): Promise<LocationLookupResult[]>;
  recentGics(limit?: number): Promise<GicsClassifyResult[]>;
  bulkUrl(
    companies: Array<{ companyName: string; location?: string; description?: string }>,
  ): Promise<DataToolJob>;
  bulkPe(
    items: Array<{ portfolioCompany: string; peFirm: string; lookupType?: string }>,
  ): Promise<DataToolJob>;
  bulkLocation(companies: Array<{ companyName: string; website?: string }>): Promise<DataToolJob>;
  bulkGics(
    items: Array<{
      companyName: string;
      description?: string;
      productsServices?: string;
      keywords?: string[];
      website?: string;
      peFirm?: string;
    }>,
  ): Promise<DataToolJob>;
  classifyHoldings(): Promise<HoldingsClassifyResponse | DataToolJob>;
  listJobs(limit?: number, offset?: number): Promise<DataToolJobsList>;
  getJob(id: string): Promise<DataToolJob>;
  getJobResults(id: string, limit?: number, offset?: number): Promise<DataToolJobResults>;
  resumeJob(id: string): Promise<ResumeJobResponse>;
}

function q(limit?: number, offset?: number) {
  const p = new URLSearchParams();
  if (limit != null) p.set('limit', String(limit));
  if (offset != null) p.set('offset', String(offset));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const peDataToolsService: PEDataToolsService = {
  urlLookup: (input) =>
    http<UrlLookupResult>(endpoints.pe.toolsUrlLookup, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  peLookup: (input) =>
    http<PeLookupResult>(endpoints.pe.toolsPeLookup, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  locationLookup: (input) =>
    http<LocationLookupResult>(endpoints.pe.toolsLocationLookup, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  gicsClassify: (input) =>
    http<GicsClassifyResult>(endpoints.pe.toolsGicsClassify, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  recentUrl: (limit = 50) => http<UrlLookupResult[]>(`${endpoints.pe.toolsUrlRecent}${q(limit)}`),
  recentPe: (limit = 50) => http<PeLookupResult[]>(`${endpoints.pe.toolsPeRecent}${q(limit)}`),
  recentLocation: (limit = 50) =>
    http<LocationLookupResult[]>(`${endpoints.pe.toolsLocationRecent}${q(limit)}`),
  recentGics: (limit = 50) =>
    http<GicsClassifyResult[]>(`${endpoints.pe.toolsGicsRecent}${q(limit)}`),
  bulkUrl: (companies) =>
    http<DataToolJob>(endpoints.pe.toolsUrlBulk, {
      method: 'POST',
      body: JSON.stringify({ companies }),
    }),
  bulkPe: (items) =>
    http<DataToolJob>(endpoints.pe.toolsPeBulk, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  bulkLocation: (companies) =>
    http<DataToolJob>(endpoints.pe.toolsLocationBulk, {
      method: 'POST',
      body: JSON.stringify({ companies }),
    }),
  bulkGics: (items) =>
    http<DataToolJob>(endpoints.pe.toolsGicsBulk, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  classifyHoldings: () =>
    http<HoldingsClassifyResponse | DataToolJob>(endpoints.pe.toolsGicsHoldings, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  listJobs: (limit = 20, offset = 0) =>
    http<DataToolJobsList>(`${endpoints.pe.toolsJobs}${q(limit, offset)}`),
  getJob: (id) => http<DataToolJob>(endpoints.pe.toolsJob(id)),
  getJobResults: (id, limit = 100, offset = 0) =>
    http<DataToolJobResults>(`${endpoints.pe.toolsJobResults(id)}${q(limit, offset)}`),
  resumeJob: (id) =>
    http<ResumeJobResponse>(endpoints.pe.toolsJobResume(id), {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};
