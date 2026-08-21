// MSW handlers for PE Digest (F37.2). Honours `?window=` passthrough; default fixture
// covers all windows. Empty-state tests override this handler via `server.use`.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { ok } from '@/test/mocks/envelope';
import { mockDigest } from '@/test/mocks/fixtures/peDigest';

export const peDigestHandlers = [http.get(endpoints.pe.digest, () => ok(mockDigest))];
