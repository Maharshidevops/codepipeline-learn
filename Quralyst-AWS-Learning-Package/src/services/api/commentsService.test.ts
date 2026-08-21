// Integration test: commentsService against the MSW handlers — exercises the full Phase 29
// contract (upsert semantics, empty-text delete, encoding, stats, author-only delete).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { commentsHandlers, resetCommentsStore } from '@/test/mocks/handlers/comments';
import { commentsService } from './commentsService';
import { mockUser } from '@/test/mocks/fixtures/users';

const server = setupServer(...commentsHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => resetCommentsStore());

describe('commentsService', () => {
  it('lists seeded comments for a result and per-company slots', async () => {
    const all = await commentsService.list('tl_1');
    expect(all.success).toBe(true);
    expect(all.count).toBe(4);

    const acme1 = await commentsService.getForCompany('tl_1', 'Acme 1 Inc.');
    expect(acme1.count).toBe(2);
    expect(acme1.comments.map((c) => c.position).sort()).toEqual([1, 2]);
  });

  it('isolates comments per result', async () => {
    const other = await commentsService.list('tl_2');
    expect(other.count).toBe(0);
  });

  it('creates a comment in an empty slot with the current user as author', async () => {
    const res = await commentsService.save({
      resultId: 'tl_1',
      companyName: 'Acme 2 Inc.',
      position: 1,
      text: 'New internal note',
    });
    expect(res.success).toBe(true);
    expect(res.comment?.createdBy).toBe(mockUser.id);
    expect(res.comment?.position).toBe(1);

    const after = await commentsService.getForCompany('tl_1', 'Acme 2 Inc.');
    expect(after.count).toBe(1);
  });

  it('updates (not appends) when saving over a filled slot', async () => {
    const res = await commentsService.save({
      resultId: 'tl_1',
      companyName: 'Acme 1 Inc.',
      position: 1,
      text: 'Revised note',
    });
    expect(res.comment?.id).toBe('c-1001'); // same slot, same id
    expect(res.comment?.text).toBe('Revised note');

    const after = await commentsService.getForCompany('tl_1', 'Acme 1 Inc.');
    expect(after.count).toBe(2); // still one per position
  });

  it('deletes the slot when saving empty text (legacy semantic)', async () => {
    const res = await commentsService.save({
      resultId: 'tl_1',
      companyName: 'Acme 1 Inc.',
      position: 1,
      text: '   ',
    });
    expect(res.success).toBe(true);
    expect(res.comment).toBeNull();

    const after = await commentsService.getForCompany('tl_1', 'Acme 1 Inc.');
    expect(after.count).toBe(1);
  });

  it('encodes URL-hostile company names round-trip', async () => {
    const name = 'Smith & Sons / 50% Co.?';
    await commentsService.save({ resultId: 'tl_1', companyName: name, position: 2, text: 'note' });
    const fetched = await commentsService.getForCompany('tl_1', name);
    expect(fetched.count).toBe(1);
    expect(fetched.comments[0].companyName).toBe(name);
  });

  it('computes stats with per-user breakdown', async () => {
    const { stats } = await commentsService.getStats('tl_1');
    expect(stats.total).toBe(4);
    expect(stats.perUser).toHaveLength(2);
    const jatin = stats.perUser.find((u) => u.userId === mockUser.id);
    expect(jatin?.count).toBe(2);
    expect(stats.lastUpdatedAt).toBe('2026-02-23T16:20:00Z');
  });

  it('deletes own comment by id; rejects deleting others (403)', async () => {
    const ok = await commentsService.remove('c-1001'); // authored by mockUser
    expect(ok.success).toBe(true);

    await expect(commentsService.remove('c-1002')).rejects.toThrow(); // Maya's comment
    const after = await commentsService.getForCompany('tl_1', 'Acme 1 Inc.');
    expect(after.count).toBe(1);
  });
});
