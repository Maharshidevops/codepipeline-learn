// Seed comments (dummy-data mode) for the detailed result (tl_1, "Acme N Inc." rows — see
// results.ts DETAIL_ROWS). A few rows carry comments across both positions and from two
// different authors so the badge counts, author-only gating, and per-user stats are all
// exercised out of the box. mockUser is the current user (author of the u-jatin comments).
import { mockUser } from './users';
import type { Comment } from '@/types';

export const seedComments: Comment[] = [
  {
    id: 'c-1001',
    resultId: 'tl_1',
    companyName: 'Acme 1 Inc.',
    position: 1,
    text: 'Strong fit — revenue and headcount both inside the mandate. Flagging for partner review.',
    createdBy: mockUser.id,
    createdByName: 'Jatin Choudhary',
    createdAt: '2026-02-20T09:15:00Z',
    updatedAt: '2026-02-20T09:15:00Z',
  },
  {
    id: 'c-1002',
    resultId: 'tl_1',
    companyName: 'Acme 1 Inc.',
    position: 2,
    text: 'Family-owned since 1998; founder is exploring succession options per their last press cycle.',
    createdBy: 'u2',
    createdByName: 'Maya Patel',
    createdAt: '2026-02-21T14:02:00Z',
    updatedAt: '2026-02-21T14:30:00Z',
  },
  {
    id: 'c-1003',
    resultId: 'tl_1',
    companyName: 'Acme 3 Inc.',
    position: 1,
    text: 'Partial fit only — Texas footprint overlaps with the portfolio company; check conflicts.',
    createdBy: 'u2',
    createdByName: 'Maya Patel',
    createdAt: '2026-02-22T11:45:00Z',
    updatedAt: '2026-02-22T11:45:00Z',
  },
  {
    id: 'c-1004',
    resultId: 'tl_1',
    companyName: 'Acme 5 Inc.',
    position: 2,
    text: 'Mention the regional consolidation angle when reaching out — they lost two competitors to PE roll-ups last year.',
    createdBy: mockUser.id,
    createdByName: 'Jatin Choudhary',
    createdAt: '2026-02-23T16:20:00Z',
    updatedAt: '2026-02-23T16:20:00Z',
  },
];
