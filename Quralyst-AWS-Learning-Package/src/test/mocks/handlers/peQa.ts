// MSW handlers for PE Ask-the-Market (F39.2).
// Default: answered-with-citations. Keyword switches cover unsupported / empty / 429 / 400.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { err, ok } from '@/test/mocks/envelope';
import { mockQaAnswered, mockQaEmpty, mockQaUnsupported } from '@/test/mocks/fixtures/peQa';

export const peQaHandlers = [
  http.post(endpoints.pe.qa, async ({ request }) => {
    const body = (await request.json()) as { question?: unknown };
    const q = typeof body.question === 'string' ? body.question.trim() : '';
    if (!q) return err(400, 'question is required');
    if (q.length > 1000) return err(400, 'question is too long');
    if (q.toLowerCase().includes('rate limit')) {
      return err(429, 'Too many questions — please wait a moment and try again.', {
        retryAfterSeconds: 30,
      });
    }
    if (q.toLowerCase().includes('unsupported')) return ok(mockQaUnsupported);
    if (q.toLowerCase().includes('antarctica')) return ok(mockQaEmpty);
    return ok(mockQaAnswered);
  }),
];
