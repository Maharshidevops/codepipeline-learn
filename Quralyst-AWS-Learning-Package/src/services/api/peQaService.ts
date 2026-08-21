// PE Ask-the-Market service (F39.2) — typed seam over POST /api/pe/qa.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type { QaResponse } from '@/types';

export interface PEQaService {
  ask(question: string): Promise<QaResponse>;
}

export const peQaService: PEQaService = {
  ask: (question) =>
    http<QaResponse>(endpoints.pe.qa, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
};
