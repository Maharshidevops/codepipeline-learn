// PE Digest service (F37.2) — typed seam over GET /api/pe/digest?window=.
// Ranked market-event feed. Gated by require_pe_access; read-only GET; 60 s server memo.
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Digest. Types: `src/types/peDigest.ts`.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { DigestResponse, DigestWindow } from '@/types';

export interface PEDigestService {
  getDigest(window?: DigestWindow): Promise<DigestResponse>;
}

export const peDigestService: PEDigestService = {
  getDigest: (window = '7d') => {
    const qs = new URLSearchParams({ window });
    return http<DigestResponse>(`${endpoints.pe.digest}?${qs.toString()}`);
  },
};
