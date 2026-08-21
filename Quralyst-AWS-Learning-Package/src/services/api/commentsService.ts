// Per-row comments (Phase 29) — typed facade over http(), same shape as resultsService.
// Contract notes (FastAPI must honor — see REF-API-CONTRACTS.md):
// - one comment per (resultId, companyName, position); saving over a filled slot is an UPDATE
// - save() with empty/whitespace text DELETES the slot (legacy semantic) and returns comment: null
// - author-only edit/delete is re-enforced server-side; the client only hides controls
import { http } from '../http';
import { endpoints } from '../endpoints';
import type { Comment, CommentStats, SaveCommentPayload } from '@/types';
import type { MessageResult } from './resultsService';

export interface CommentsListResponse {
  success: boolean;
  comments: Comment[];
  count: number;
}

export interface SaveCommentResponse {
  success: boolean;
  comment: Comment | null;
  message?: string;
}

export interface CommentStatsResponse {
  success: boolean;
  stats: CommentStats;
}

export interface CommentsService {
  /** All comments for a result (feeds the per-row count badges in one request). */
  list(resultId: string): Promise<CommentsListResponse>;
  /** Both position slots for one company row. */
  getForCompany(resultId: string, companyName: string): Promise<CommentsListResponse>;
  /** Create/update a position slot; empty text deletes it. */
  save(payload: SaveCommentPayload): Promise<SaveCommentResponse>;
  remove(commentId: string): Promise<MessageResult>;
  getStats(resultId: string): Promise<CommentStatsResponse>;
}

// Phase 11: list comments live in `data` with `count` in `meta`; save returns the comment in `data`
// + the toast in `message`; stats live in `data`. Re-assemble the existing service interfaces.
async function commentsList(path: string): Promise<CommentsListResponse> {
  const env = await http.full<Comment[]>(path);
  const count = (env.meta?.count as number | undefined) ?? env.data.length;
  return { success: true, comments: env.data, count };
}

export const commentsService: CommentsService = {
  list: (resultId) => commentsList(endpoints.comments.list(resultId)),
  getForCompany: (resultId, companyName) =>
    commentsList(endpoints.comments.forCompany(resultId, companyName)),
  save: async (payload) => {
    const env = await http.full<Comment | null>(endpoints.comments.save, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { success: true, comment: env.data, message: env.message ?? undefined };
  },
  remove: async (commentId) => {
    const env = await http.full(endpoints.comments.remove(commentId), { method: 'DELETE' });
    return { success: true, message: env.message ?? '' };
  },
  getStats: async (resultId) => ({
    success: true,
    stats: await http<CommentStats>(endpoints.comments.stats(resultId)),
  }),
};
