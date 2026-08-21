// Build presentation slides from tearsheet content (F40.2) — Replit slide parity.
import type { Confidence, Tearsheet, TearsheetContent, TearsheetSource } from '@/types';

export type SlidePerson = { name: string; title: string; detail?: string };

export type ChartSeries = {
  heading?: string;
  color?: string;
  points: [string, number][];
};

export type SlideBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; heading?: string; items: string[] }
  | { kind: 'columns'; columns: { heading?: string; items: string[] }[] }
  | { kind: 'keyvalue'; rows: [string, string][] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'charts'; items: ChartSeries[] }
  | { kind: 'people'; groups: { heading?: string; people: SlidePerson[] }[] };

export type Slide =
  | {
      id: string;
      variant: 'title';
      kicker?: string;
      title: string;
      subtitle?: string;
      website?: string;
      meta?: string;
    }
  | {
      id: string;
      variant: 'content';
      kicker?: string;
      title: string;
      confidence?: Confidence;
      blocks: SlideBlock[];
    };

function has(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function personRow(p: {
  name: string;
  title: string;
  bio?: string;
  background?: string;
  linkedinUrl?: string;
}): SlidePerson {
  const detail = p.bio || p.background;
  const clipped = detail && detail.length > 160 ? `${detail.slice(0, 157)}…` : detail;
  return {
    name: p.name,
    title: p.title,
    detail: clipped || (p.linkedinUrl ? p.linkedinUrl : undefined),
  };
}

function chartFromHistory(
  heading: string,
  history: { date: string; employeeCount?: number; followerCount?: number }[],
  valueKey: 'employeeCount' | 'followerCount',
  color: string,
): ChartSeries | null {
  const points: [string, number][] = [];
  for (const row of history) {
    const v = row[valueKey];
    if (v != null && Number.isFinite(v)) points.push([row.date, v]);
  }
  if (points.length < 2) return null;
  return { heading, color, points };
}

function pushIf(blocks: SlideBlock[], block: SlideBlock | null | undefined) {
  if (block) blocks.push(block);
}

function cleanSourceTitle(t: string): string {
  // Strip combining marks / ZWSP / bidi controls without a multi-code-unit char class
  // (eslint no-misleading-character-class flags some unicode ranges in classes).
  return t
    .replace(/\p{M}/gu, '')
    .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^[\u201c\u201d\u2018\u2019"']+|[\u201c\u201d\u2018\u2019"']+$/g, '')
    .trim()
    .slice(0, 90);
}

function fmtGenerated(iso?: string): string {
  if (!iso) return `Generated ${new Date().toLocaleDateString()}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? `Generated ${iso}` : `Generated ${d.toLocaleDateString()}`;
}

export function buildSlides(
  data: Pick<Tearsheet, 'companyName' | 'website' | 'content' | 'sources' | 'updatedAt'>,
): Slide[] {
  const content = data.content ?? ({} as TearsheetContent);
  const slides: Slide[] = [];
  const overview = content.overview;
  const cleanSite = (overview?.website || data.website || '').replace(/^https?:\/\//, '');

  // 1. Title
  slides.push({
    id: 'title',
    variant: 'title',
    kicker: 'COMPANY TEARSHEET',
    title: data.companyName,
    subtitle: overview?.oneLiner || overview?.description,
    website: cleanSite || undefined,
    meta: fmtGenerated(data.updatedAt),
  });

  // 2. Executive summary
  if (has(content.executiveSummary)) {
    slides.push({
      id: 'exec',
      variant: 'content',
      kicker: 'Overview',
      title: 'Executive Summary',
      blocks: [{ kind: 'paragraph', text: content.executiveSummary! }],
    });
  }

  // 3. Thesis & risks
  if (content.thesisPoints?.length || content.riskFlags?.length) {
    const cols: { heading?: string; items: string[] }[] = [];
    if (content.thesisPoints?.length) {
      cols.push({ heading: 'Investment thesis', items: content.thesisPoints });
    }
    if (content.riskFlags?.length) {
      cols.push({ heading: 'Key risks', items: content.riskFlags });
    }
    slides.push({
      id: 'thesis',
      variant: 'content',
      kicker: 'Thesis',
      title: 'Investment Thesis & Risks',
      blocks: [{ kind: 'columns', columns: cols }],
    });
  }

  // 4. Overview
  if (overview) {
    const rows: [string, string][] = [];
    if (overview.yearFounded) rows.push(['Founded', overview.yearFounded]);
    if (overview.employeeCount) rows.push(['Employees', overview.employeeCount]);
    if (overview.businessStatus) rows.push(['Status', overview.businessStatus]);
    if (overview.ownershipStatus) rows.push(['Ownership', overview.ownershipStatus]);
    if (overview.headquarters) rows.push(['HQ', overview.headquarters]);
    for (const f of overview.keyFacts ?? []) {
      rows.push([f.label, f.value]);
    }
    const blocks: SlideBlock[] = [];
    if (overview.description) blocks.push({ kind: 'paragraph', text: overview.description });
    if (rows.length) blocks.push({ kind: 'keyvalue', rows });
    if (overview.industries?.length) {
      blocks.push({ kind: 'bullets', heading: 'Industries', items: overview.industries });
    }
    if (blocks.length) {
      slides.push({
        id: 'overview',
        variant: 'content',
        kicker: 'Company',
        title: 'Company Overview',
        confidence: overview.confidence,
        blocks,
      });
    }
  }

  // 5. LinkedIn metrics + charts
  {
    const li = content.linkedinMetrics;
    if (li) {
      const blocks: SlideBlock[] = [];
      const kv: [string, string][] = [];
      if (li.followerCount != null)
        kv.push(['LinkedIn followers', li.followerCount.toLocaleString()]);
      if (li.employeeCountCurrent != null) {
        kv.push(['Employees (LinkedIn)', li.employeeCountCurrent.toLocaleString()]);
      }
      if (li.industry) kv.push(['Industry', li.industry]);
      if (li.hqCountry) kv.push(['HQ country', li.hqCountry]);
      if (li.founded != null) kv.push(['Founded', String(li.founded)]);
      if (li.activeJobPostingsCount != null) {
        kv.push(['Active job postings', String(li.activeJobPostingsCount)]);
      }
      if (li.linkedinUrl) kv.push(['LinkedIn', li.linkedinUrl]);
      pushIf(blocks, kv.length ? { kind: 'keyvalue', rows: kv } : null);

      const charts: ChartSeries[] = [];
      const emp = li.employeeHistory
        ? chartFromHistory('Employee count', li.employeeHistory, 'employeeCount', '#60a5fa')
        : null;
      const fol = li.followerHistory
        ? chartFromHistory('LinkedIn followers', li.followerHistory, 'followerCount', '#a78bfa')
        : null;
      if (emp) charts.push(emp);
      if (fol) charts.push(fol);
      if (charts.length) blocks.push({ kind: 'charts', items: charts });

      if (blocks.length) {
        slides.push({
          id: 'linkedin',
          variant: 'content',
          kicker: 'Signals',
          title: 'LinkedIn & Digital Presence',
          blocks,
        });
      }
    }
  }

  // 6. Financials
  const financials = content.financials;
  if (financials) {
    const blocks: SlideBlock[] = [];
    if (financials.summary) blocks.push({ kind: 'paragraph', text: financials.summary });
    const kv: [string, string][] = [];
    if (financials.revenue) kv.push(['Revenue', financials.revenue]);
    if (financials.revenueGrowth) kv.push(['Growth', financials.revenueGrowth]);
    if (financials.profitability) kv.push(['Profitability', financials.profitability]);
    if (financials.burnRate) kv.push(['Burn rate', financials.burnRate]);
    if (financials.runway) kv.push(['Runway', financials.runway]);
    if (financials.unitEconomics) kv.push(['Unit economics', financials.unitEconomics]);
    pushIf(blocks, kv.length ? { kind: 'keyvalue', rows: kv } : null);
    if (financials.metrics?.length) {
      blocks.push({
        kind: 'table',
        headers: ['Metric', 'Value', 'Period'],
        rows: financials.metrics.map((m) => [m.label ?? '—', m.value ?? '—', m.period ?? '—']),
      });
    }
    if (blocks.length) {
      slides.push({
        id: 'financials',
        variant: 'content',
        kicker: 'Capital',
        title: 'Financials',
        confidence: financials.confidence,
        blocks,
      });
    }
  }

  // 7. Funding
  const funding = content.funding;
  if (funding) {
    const blocks: SlideBlock[] = [];
    if (funding.summary) blocks.push({ kind: 'paragraph', text: funding.summary });
    const kv: [string, string][] = [];
    if (funding.totalRaised) kv.push(['Total raised', funding.totalRaised]);
    if (funding.latestRound) kv.push(['Latest round', funding.latestRound]);
    if (funding.latestValuation) kv.push(['Latest valuation', funding.latestValuation]);
    if (funding.keyInvestors?.length) kv.push(['Key investors', funding.keyInvestors.join(', ')]);
    pushIf(blocks, kv.length ? { kind: 'keyvalue', rows: kv } : null);
    if (funding.rounds?.length) {
      blocks.push({
        kind: 'table',
        headers: ['Date', 'Round', 'Amount', 'Lead'],
        rows: funding.rounds.map((r) => [
          r.date ?? '—',
          r.round ?? '—',
          r.amount ?? '—',
          (r.leadInvestors ?? []).join(', ') || '—',
        ]),
      });
    }
    if (blocks.length) {
      slides.push({
        id: 'funding',
        variant: 'content',
        kicker: 'Capital',
        title: 'Funding & Investors',
        confidence: funding.confidence,
        blocks,
      });
    }
  }

  // 8. Cap table
  const cap = content.capTable;
  if (cap?.entries?.length) {
    const blocks: SlideBlock[] = [];
    if (cap.summary) blocks.push({ kind: 'paragraph', text: cap.summary });
    blocks.push({
      kind: 'table',
      headers: ['Stakeholder', 'Type', 'Class', 'Owned', 'Notes'],
      rows: cap.entries.map((e) => [
        e.stakeholder ?? '—',
        e.stakeholderType ?? '—',
        e.shareClass ?? '—',
        e.percentOwned ?? '—',
        e.notes ?? '—',
      ]),
    });
    slides.push({
      id: 'captable',
      variant: 'content',
      kicker: 'Ownership',
      title: 'Cap Table',
      confidence: cap.confidence,
      blocks,
    });
  }

  // 9. Leadership
  const leadership = content.leadership;
  if (leadership?.executives?.length || leadership?.board?.length) {
    const groups: { heading?: string; people: SlidePerson[] }[] = [];
    if (leadership.executives?.length) {
      groups.push({
        heading: 'Executives',
        people: leadership.executives.map(personRow),
      });
    }
    if (leadership.board?.length) {
      groups.push({
        heading: 'Board',
        people: leadership.board.map(personRow),
      });
    }
    const blocks: SlideBlock[] = [];
    if (leadership.summary) blocks.push({ kind: 'paragraph', text: leadership.summary });
    blocks.push({ kind: 'people', groups });
    slides.push({
      id: 'leadership',
      variant: 'content',
      kicker: 'Team',
      title: 'Leadership',
      confidence: leadership.confidence,
      blocks,
    });
  }

  // 10. Competitors
  const competitors = content.competitors;
  if (competitors?.competitors?.length) {
    const blocks: SlideBlock[] = [];
    if (competitors.summary) blocks.push({ kind: 'paragraph', text: competitors.summary });
    blocks.push({
      kind: 'table',
      headers: ['Company', 'HQ', 'Employees', 'Funding', 'Differentiator'],
      rows: competitors.competitors.map((c) => [
        c.name,
        c.hqLocation ?? '—',
        c.employees ?? '—',
        c.funding ?? '—',
        c.differentiator ?? c.description ?? '—',
      ]),
    });
    slides.push({
      id: 'competitors',
      variant: 'content',
      kicker: 'Landscape',
      title: 'Competitive Landscape',
      confidence: competitors.confidence,
      blocks,
    });
  }

  // 11. Acquisitions
  const acq = content.acquisitions;
  if (acq?.items?.length) {
    const blocks: SlideBlock[] = [];
    if (acq.summary) blocks.push({ kind: 'paragraph', text: acq.summary });
    blocks.push({
      kind: 'table',
      headers: ['Target', 'Date', 'Value', 'Type', 'Rationale'],
      rows: acq.items.map((a) => [
        a.targetName,
        a.date ?? '—',
        a.dealValue ?? '—',
        a.dealType ?? '—',
        a.rationale ?? '—',
      ]),
    });
    slides.push({
      id: 'acquisitions',
      variant: 'content',
      kicker: 'M&A',
      title: 'M&A Activity',
      confidence: acq.confidence,
      blocks,
    });
  }

  // 12. Industry
  const industry = content.industry;
  if (industry) {
    const blocks: SlideBlock[] = [];
    if (industry.summary) blocks.push({ kind: 'paragraph', text: industry.summary });
    const kv: [string, string][] = [];
    if (industry.marketSize) kv.push(['Market size', industry.marketSize]);
    if (industry.growthRate) kv.push(['Growth', industry.growthRate]);
    pushIf(blocks, kv.length ? { kind: 'keyvalue', rows: kv } : null);
    const cols: { heading?: string; items: string[] }[] = [];
    if (industry.tailwinds?.length) cols.push({ heading: 'Tailwinds', items: industry.tailwinds });
    if (industry.headwinds?.length) cols.push({ heading: 'Headwinds', items: industry.headwinds });
    if (industry.trends?.length) cols.push({ heading: 'Trends', items: industry.trends });
    if (cols.length) blocks.push({ kind: 'columns', columns: cols });
    if (industry.regulatoryContext) {
      blocks.push({ kind: 'paragraph', text: industry.regulatoryContext });
    }
    if (blocks.length) {
      slides.push({
        id: 'industry',
        variant: 'content',
        kicker: 'Sector',
        title: 'Industry & Market',
        confidence: industry.confidence,
        blocks,
      });
    }
  }

  // 13. News
  const news = content.news;
  if (news?.items?.length || news?.signals?.length) {
    const blocks: SlideBlock[] = [];
    if (news.summary) blocks.push({ kind: 'paragraph', text: news.summary });
    if (news.items?.length) {
      blocks.push({
        kind: 'bullets',
        heading: 'Recent headlines',
        items: news.items.map((n) => [n.date, n.headline, n.source].filter(Boolean).join(' — ')),
      });
    }
    if (news.signals?.length) {
      blocks.push({ kind: 'bullets', heading: 'Signals', items: news.signals });
    }
    slides.push({
      id: 'news',
      variant: 'content',
      kicker: 'Market',
      title: 'Recent News',
      confidence: news.confidence,
      blocks,
    });
  }

  // 14. Reviews
  const reviews = content.reviewInsights;
  if (reviews) {
    const blocks: SlideBlock[] = [];
    if (reviews.sentimentSummary) {
      blocks.push({ kind: 'paragraph', text: reviews.sentimentSummary });
    }
    const kv: [string, string][] = [];
    if (reviews.googleRating) kv.push(['Google rating', reviews.googleRating]);
    if (reviews.reviewCount != null) kv.push(['Review count', String(reviews.reviewCount)]);
    pushIf(blocks, kv.length ? { kind: 'keyvalue', rows: kv } : null);
    if (reviews.strengths?.length) {
      blocks.push({ kind: 'bullets', heading: 'Strengths', items: reviews.strengths });
    }
    if (reviews.risks?.length) {
      blocks.push({ kind: 'bullets', heading: 'Risks', items: reviews.risks });
    }
    if (reviews.mandaTakeaway) {
      blocks.push({
        kind: 'paragraph',
        text: `M&A takeaway: ${reviews.mandaTakeaway}`,
      });
    }
    if (blocks.length) {
      slides.push({
        id: 'reviews',
        variant: 'content',
        kicker: 'Voice of customer',
        title: 'Reviews & Sentiment',
        confidence: reviews.confidence,
        blocks,
      });
    }
  }

  // 15. Sources
  const sources = (data.sources ?? []) as TearsheetSource[];
  if (sources.length) {
    const items = sources
      .slice(0, 10)
      .map((s) => {
        const title = cleanSourceTitle(s.title || s.url || 'Source');
        const provider = s.provider ? ` (${s.provider})` : '';
        return `${title}${provider}`;
      })
      .filter(Boolean);
    if (items.length) {
      slides.push({
        id: 'sources',
        variant: 'content',
        kicker: 'Appendix',
        title: 'Sources',
        blocks: [{ kind: 'bullets', items }],
      });
    }
  }

  return slides;
}
