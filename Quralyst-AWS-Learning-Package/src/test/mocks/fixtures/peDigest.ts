// MSW fixtures for PE Digest (F37.2) — one event per category, all four enrichment tags,
// importance spread across High (≥75) / Notable (≥50) / Low, plus an empty-window helper.
import type { DigestEvent, DigestResponse } from '@/types';
import { CATEGORY_META } from '@/components/pe/digest/digestMeta';

const base: Omit<
  DigestEvent,
  'id' | 'headline' | 'whyItMatters' | 'tags' | 'category' | 'importance'
> = {
  occurredAt: '2026-06-14T12:00:00.000Z',
  firmId: 'pef1',
  firmName: 'Acme Capital',
  holdingId: 'h1',
};

export const mockDigestEvents: DigestEvent[] = [
  {
    ...base,
    id: 'change:1',
    headline: 'AddOn3 added to Acme Capital roll-up',
    whyItMatters: 'AddOn3 extends an active Healthcare roll-up at Acme Capital.',
    tags: ['Roll-up'],
    category: 'rollup_addon',
    importance: 88,
  },
  {
    ...base,
    id: 'change:2',
    headline: 'PayCo — new investment by Acme Capital',
    whyItMatters: 'Thesis shift: recent deals concentrate in Fintech versus Industrials.',
    tags: ['Thesis shift'],
    category: 'new_investment',
    importance: 72,
    holdingId: 'h2',
  },
  {
    ...base,
    id: 'change:3',
    headline: "GoneCo exited Acme Capital's portfolio",
    whyItMatters: 'GoneCo exited the portfolio of Acme Capital.',
    tags: [],
    category: 'exit',
    importance: 61,
    holdingId: 'h3',
  },
  {
    ...base,
    id: 'move:5-9',
    headline: 'Sam Lead moved to New Firm',
    whyItMatters: 'Sam Lead moved from Old Firm to New Firm.',
    tags: ['Talent'],
    category: 'talent_move',
    importance: 55,
    holdingId: null,
    personId: 9,
    firmId: 'pef2',
    firmName: 'New Firm',
  },
  {
    ...base,
    id: 'change:4',
    headline: 'AgedCo — date_found updated',
    whyItMatters: "Exit-readiness note: held ~11y versus this firm's typical 3y median hold.",
    tags: ['Exit-ready', 'Watch'],
    category: 'portfolio_update',
    importance: 28,
    holdingId: 'h10',
  },
];

function groupFrom(events: DigestEvent[]): DigestResponse {
  const cats = [
    'new_investment',
    'rollup_addon',
    'exit',
    'talent_move',
    'portfolio_update',
  ] as const;
  const sorted = [...events].sort(
    (a, b) => b.importance - a.importance || a.id.localeCompare(b.id),
  );
  return {
    window: '7d',
    generatedAt: '2026-06-15T00:00:00.000Z',
    asOfYear: 2026,
    groups: cats.map((category) => {
      const evs = sorted.filter((e) => e.category === category);
      return {
        category,
        label: CATEGORY_META[category].label,
        count: evs.length,
        events: evs,
      };
    }),
    topEvents: sorted,
    totalEvents: events.length,
  };
}

export const mockDigest: DigestResponse = groupFrom(mockDigestEvents);

export const mockDigestEmpty: DigestResponse = {
  window: '7d',
  generatedAt: '2026-06-15T00:00:00.000Z',
  asOfYear: 2026,
  groups: [
    { category: 'new_investment', label: 'New investments', count: 0, events: [] },
    { category: 'rollup_addon', label: 'Roll-up add-ons', count: 0, events: [] },
    { category: 'exit', label: 'Exits', count: 0, events: [] },
    { category: 'talent_move', label: 'Talent moves', count: 0, events: [] },
    { category: 'portfolio_update', label: 'Portfolio updates', count: 0, events: [] },
  ],
  topEvents: [],
  totalEvents: 0,
};
