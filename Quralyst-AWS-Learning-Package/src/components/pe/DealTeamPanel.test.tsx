// PE deal-team panel (F66 Unit 4): the three match tiers and how they are labelled, the contact
// links, the initials fallback, and the empty/error states.
//
// The contact-link and avatar assertions are the ones that matter most: the backend used to ship
// snake_case keys for exactly these fields (`photo_url`, `linkedin_url`) while the FE type said
// camelCase, and the old fixture left them all null — so nothing caught it. These tests fail if
// that regresses.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import DealTeamPanel from './DealTeamPanel';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPanel(holdingId: string, companyName = 'Acme Analytics') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DealTeamPanel holdingId={holdingId} companyName={companyName} />
    </QueryClientProvider>,
  );
}

describe('DealTeamPanel', () => {
  it('renders the heading and the per-tier counts', async () => {
    renderPanel('peh1');
    // Fixture peh1: 1 direct + 2 sector-focus matches on the Energy sector.
    expect(await screen.findByText(/deal team \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText('1 direct')).toBeInTheDocument();
    expect(screen.getByText('2 Energy focus')).toBeInTheDocument();
  });

  it('marks only the direct member as Direct', async () => {
    renderPanel('peh1');
    await screen.findByText('Dana Director');
    // One chip, on the direct member — a sector match must not be presented as a verified link.
    expect(screen.getAllByText('Direct')).toHaveLength(1);
    expect(screen.queryByText('Firm Lead')).not.toBeInTheDocument();
  });

  it('renders contact links from camelCase fields', async () => {
    renderPanel('peh1');
    const email = await screen.findByLabelText(/email dana director/i);
    expect(email).toHaveAttribute('href', 'mailto:dana@example.com');
    expect(screen.getByLabelText(/call dana director/i)).toHaveAttribute(
      'href',
      'tel:+15551234567',
    );
    expect(screen.getByLabelText(/dana director on linkedin/i)).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/danadirector',
    );
  });

  it('uses the photo when present and initials when not', async () => {
    const { container } = renderPanel('peh1');
    await screen.findByText('Dana Director');
    const img = container.querySelector('img.peh-team__avatar');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/dana.jpg');
    // 'Ana Analyst' has no photoUrl → initials avatar.
    expect(screen.getByText('AA')).toBeInTheDocument();
  });

  it('labels the firm-lead fallback as a stand-in, not a match', async () => {
    renderPanel('peh2', 'Beacon Health');
    expect(await screen.findByText('Firm Lead')).toBeInTheDocument();
    expect(screen.getByText(/senior investment lead/i)).toBeInTheDocument();
    expect(screen.queryByText('Direct')).not.toBeInTheDocument();
  });

  it('explains a sector-only roster', async () => {
    server.use(
      http.get(`${endpoints.pe.holdings}/:id/team`, () =>
        HttpResponse.json({
          status: 'success',
          data: {
            people: [
              {
                id: 'x1',
                name: 'Sam Sector',
                title: 'Principal',
                email: null,
                emailInferred: false,
                emailSource: null,
                emailVerificationStatus: null,
                emailVerificationScore: null,
                emailVerifiedAt: null,
                phone: null,
                phoneSource: null,
                linkedinUrl: null,
                linkedinSource: null,
                contactSourceUrl: null,
                photoUrl: null,
                bio: null,
                bioSource: null,
                roleTag: 'investment',
                focusTags: ['Energy'],
                matchType: 'sector',
              },
            ],
            matchType: 'sector_fallback',
            sector: 'Energy',
            directCount: 0,
            sectorCount: 1,
            fallbackCount: 0,
          },
        }),
      ),
    );
    renderPanel('peh1');
    expect(await screen.findByText(/matched by sector focus/i)).toBeInTheDocument();
  });

  it('shows an empty state naming the company', async () => {
    renderPanel('peh-none', 'Cobalt Robotics');
    expect(await screen.findByText(/no deal team members linked/i)).toBeInTheDocument();
    expect(screen.getByText(/cobalt robotics/i)).toBeInTheDocument();
  });

  it('degrades to a message when the request fails', async () => {
    server.use(
      http.get(`${endpoints.pe.holdings}/:id/team`, () =>
        HttpResponse.json({ status: 'error', message: 'boom' }, { status: 500 }),
      ),
    );
    renderPanel('peh1', 'Acme Analytics');
    expect(await screen.findByText(/could not load the deal team/i)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderPanel('peh1');
    await screen.findByText('Dana Director');
    expect(await axe(container)).toHaveNoViolations();
  });
});
