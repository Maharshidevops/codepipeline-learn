// MSW handlers for per-row comments (Phase 29) — full CRUD against an in-memory store seeded
// from fixtures, with per-result isolation. Defines the contract FastAPI must later honor
// (see REF-API-CONTRACTS.md). ROUTE ORDER MATTERS: /api/comments/stats/:resultId must be
// registered before the :resultId/:companyName patterns or "stats" is swallowed as a resultId.
import { http } from 'msw';
import { ok, err } from '@/test/mocks/envelope';
import { seedComments } from '../fixtures/comments';
import { mockUser } from '../fixtures/users';
import type { Comment, CommentStats, SaveCommentPayload } from '@/types';

// Module-level mutable store; reset() is exported for test isolation.
let store: Comment[] = seedComments.map((c) => ({ ...c }));
let nextId = 2000;

export function resetCommentsStore() {
  store = seedComments.map((c) => ({ ...c }));
  nextId = 2000;
}

function statsFor(resultId: string): CommentStats {
  const comments = store.filter((c) => c.resultId === resultId);
  const perUserMap = new Map<string, { userId: string; name: string; count: number }>();
  let lastUpdatedAt: string | null = null;
  for (const c of comments) {
    const entry = perUserMap.get(c.createdBy) ?? {
      userId: c.createdBy,
      name: c.createdByName,
      count: 0,
    };
    entry.count += 1;
    perUserMap.set(c.createdBy, entry);
    if (!lastUpdatedAt || c.updatedAt > lastUpdatedAt) lastUpdatedAt = c.updatedAt;
  }
  return { total: comments.length, perUser: [...perUserMap.values()], lastUpdatedAt };
}

export const commentsHandlers = [
  // Phase 11: stats object in data; comment lists in data with count in meta; save returns the
  // comment in data + the toast in message; failures use the error envelope.
  // Stats — MUST precede the parameterized GETs below.
  http.get('/api/comments/stats/:resultId', ({ params }) =>
    ok(statsFor(params.resultId as string)),
  ),

  // Both position slots for one company row. (MSW hands path params already-decoded,
  // matching how FastAPI will deliver them.)
  http.get('/api/comments/:resultId/:companyName', ({ params }) => {
    const resultId = params.resultId as string;
    const companyName = params.companyName as string;
    const comments = store.filter((c) => c.resultId === resultId && c.companyName === companyName);
    return ok(comments, { meta: { count: comments.length } });
  }),

  // All comments for a result (feeds the per-row count badges in one request).
  http.get('/api/comments/:resultId', ({ params }) => {
    const comments = store.filter((c) => c.resultId === params.resultId);
    return ok(comments, { meta: { count: comments.length } });
  }),

  // Create/update a position slot; empty text deletes it (legacy semantic).
  http.post('/api/comments', async ({ request }) => {
    const body = (await request.json()) as SaveCommentPayload;
    const { resultId, companyName, position } = body;
    if (!resultId || !companyName || (position !== 1 && position !== 2)) {
      return err(400, 'Missing required fields or invalid position');
    }
    const text = (body.text ?? '').trim();
    const slotIndex = store.findIndex(
      (c) => c.resultId === resultId && c.companyName === companyName && c.position === position,
    );

    if (!text) {
      if (slotIndex >= 0) store.splice(slotIndex, 1);
      return ok<Comment | null>(null, { message: 'Comment deleted successfully' });
    }

    const now = new Date().toISOString();
    if (slotIndex >= 0) {
      const updated: Comment = { ...store[slotIndex], text, updatedAt: now };
      store[slotIndex] = updated;
      return ok(updated, { message: 'Comment saved successfully' });
    }
    const created: Comment = {
      id: `c-${nextId++}`,
      resultId,
      companyName,
      position,
      text,
      createdBy: mockUser.id,
      createdByName: `${mockUser.profile.firstName} ${mockUser.profile.lastName}`,
      createdAt: now,
      updatedAt: now,
    };
    store.push(created);
    return ok(created, { message: 'Comment saved successfully' });
  }),

  // Delete by comment id (author-only; the mock enforces it like the server will).
  http.delete('/api/comments/:commentId', ({ params }) => {
    const idx = store.findIndex((c) => c.id === params.commentId);
    if (idx < 0) {
      return err(404, 'Comment not found');
    }
    if (store[idx].createdBy !== mockUser.id) {
      return err(403, 'Failed to delete comment or access denied');
    }
    store.splice(idx, 1);
    return ok(null, { message: 'Comment deleted successfully' });
  }),
];
