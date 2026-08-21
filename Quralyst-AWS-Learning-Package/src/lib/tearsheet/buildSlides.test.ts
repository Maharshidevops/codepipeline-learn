// buildSlides unit tests (F40.2 + Gamma parity slide set).
import { describe, it, expect } from 'vitest';
import { buildSlides } from '@/lib/tearsheet/buildSlides';
import { mockTearsheetComplete } from '@/test/mocks/fixtures/peTearsheet';

describe('buildSlides', () => {
  it('creates a branded title slide from company name and one-liner', () => {
    const slides = buildSlides(mockTearsheetComplete);
    const title = slides[0];
    expect(title?.variant).toBe('title');
    if (title?.variant === 'title') {
      expect(title.title).toBe('Acme Robotics');
      expect(title.kicker).toMatch(/COMPANY TEARSHEET/i);
      expect(title.subtitle).toContain('Autonomous warehouse robotics');
    }
  });

  it('splits executive summary and thesis into separate slides', () => {
    const slides = buildSlides(mockTearsheetComplete);
    const exec = slides.find((s) => s.id === 'exec');
    expect(exec?.variant).toBe('content');
    if (exec?.variant === 'content') {
      expect(exec.blocks.some((b) => b.kind === 'paragraph')).toBe(true);
    }

    const thesis = slides.find((s) => s.id === 'thesis');
    expect(thesis?.variant).toBe('content');
    if (thesis?.variant === 'content') {
      expect(thesis.blocks.some((b) => b.kind === 'columns')).toBe(true);
    }

    const overview = slides.find((s) => s.id === 'overview');
    if (overview?.variant === 'content') {
      expect(overview.confidence).toBe('high');
      expect(overview.blocks.some((b) => b.kind === 'keyvalue')).toBe(true);
    }
  });

  it('builds people, table, and LinkedIn chart blocks when content is present', () => {
    const slides = buildSlides(mockTearsheetComplete);
    const leadership = slides.find((s) => s.id === 'leadership');
    if (leadership?.variant === 'content') {
      expect(leadership.blocks.some((b) => b.kind === 'people')).toBe(true);
    }
    const competitors = slides.find((s) => s.id === 'competitors');
    if (competitors?.variant === 'content') {
      expect(competitors.blocks.some((b) => b.kind === 'table')).toBe(true);
    }
    const linkedin = slides.find((s) => s.id === 'linkedin');
    expect(linkedin?.variant).toBe('content');
    if (linkedin?.variant === 'content') {
      expect(linkedin.blocks.some((b) => b.kind === 'charts')).toBe(true);
    }
  });

  it('includes sources slide when sources are present', () => {
    const slides = buildSlides(mockTearsheetComplete);
    const sources = slides.find((s) => s.id === 'sources');
    expect(sources?.variant).toBe('content');
  });
});
