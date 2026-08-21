// ComparableDealNote (Tier A / A5) — pure presentational box. Shows the backend's `why` when a real
// comparable exists, and renders nothing otherwise (no fabricated "no comparable" text).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComparableDeal } from './types';
import ComparableDealNote from './ComparableDealNote';

const MATCH: ComparableDeal = {
  name: 'Acme Corp',
  outcome: 'closed_won',
  outcome_label: 'closed/won',
  why: 'Same sector (IT Services) as Acme Corp, which you closed/won.',
};

describe('ComparableDealNote', () => {
  it('renders the why text when a comparable is present', () => {
    render(<ComparableDealNote comparable={MATCH} />);
    expect(screen.getByRole('note')).toHaveTextContent(
      'Same sector (IT Services) as Acme Corp, which you closed/won.',
    );
    expect(screen.getByText(/comparable past deal/i)).toBeInTheDocument();
  });

  it('renders nothing when there is no comparable', () => {
    const { container: c1 } = render(<ComparableDealNote comparable={null} />);
    expect(c1).toBeEmptyDOMElement();
    const { container: c2 } = render(<ComparableDealNote comparable={undefined} />);
    expect(c2).toBeEmptyDOMElement();
  });

  it('renders nothing when why is empty (a match object with no explanation is not shown)', () => {
    const { container } = render(<ComparableDealNote comparable={{ ...MATCH, why: '' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
