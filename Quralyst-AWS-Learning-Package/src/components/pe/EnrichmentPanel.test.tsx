// PE enrichment panel: the ledger read that made the pipeline's own answers visible.
//
// The assertions that matter are the three OUTCOMES, not the values. A pass that answered, a
// pass that ran and found nothing, and a pass that has not reached this holding are three
// different facts, and the worker log can only report counts — "classified=40" beside 15 stored
// sectors looked like a contradiction for exactly this reason. If the UI ever collapses
// "not found" into "never ran" (or into a blank field), these fail.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import EnrichmentPanel from './EnrichmentPanel';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPanel(holdingId: string, companyName = 'Acme Analytics') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EnrichmentPanel holdingId={holdingId} companyName={companyName} />
    </QueryClientProvider>,
  );
}

function section(title: string) {
  return screen.getByRole('heading', { name: new RegExp(title, 'i') }).closest('section')!;
}

describe('EnrichmentPanel', () => {
  it('shows the GICS answer the holdings table has no column for', async () => {
    // holding.sector carries the INVESTOR vocabulary; GICS is ledger-only (F60 13.1), so this
    // panel is the only place the GICS taxonomy is readable at all.
    renderPanel('peh1');
    const gics = await screen.findByRole('heading', { name: /gics/i });
    const box = gics.closest('section')!;
    // Was `getByText('Industrials')`. The sector now renders its code like every other level;
    // it was the sole level shown bare, which read as a missing value beside
    // "Commercial & Professional Services (2020)". The assertion was the outdated side here,
    // not the component.
    expect(within(box).getByText('Industrials (20)')).toBeInTheDocument();
    // F70 Unit C: the official 4-digit group code renders beside the name, so the ledger row
    // is joinable on standard GICS codes rather than only on a display string.
    expect(within(box).getByText('Commercial & Professional Services (2020)')).toBeInTheDocument();
    expect(within(box).getByText(/found/i)).toBeInTheDocument();
  });

  it('distinguishes "ran and found nothing" from "has not run yet"', async () => {
    renderPanel('peh1');
    await screen.findByRole('heading', { name: /gics/i });
    // URL pass ran, answered nothing.
    expect(within(section('Website lookup')).getByText(/not found/i)).toBeInTheDocument();
    // Location pass has not covered this holding — must NOT read as a failed lookup.
    const loc = section('Location');
    expect(within(loc).getByText(/not run yet/i)).toBeInTheDocument();
    expect(within(loc).getByText(/has not reached this company/i)).toBeInTheDocument();
  });

  it('shows GICS levels 3 and 4 with their codes', async () => {
    // F70 Unit E. A populated name here means the model's code NESTED under its confirmed
    // parent — a name without a validated code is dropped rather than shown.
    renderPanel('peh1');
    const box = (await screen.findByRole('heading', { name: /gics/i })).closest('section')!;
    expect(within(box).getByText('Commercial Services & Supplies (202010)')).toBeInTheDocument();
    expect(
      within(box).getByText('Environmental & Facilities Services (20201050)'),
    ).toBeInTheDocument();
  });

  it('still shows the deep rows when the pass ran but gave no usable code', async () => {
    // A validated code is required before a name is stored, so levels 3/4 are often null on an
    // otherwise good row. The LABELS must stay so an absent level reads as absent rather than
    // as a hidden field. (Distinct from a leg that never ran, which shows "not run yet" and no
    // fields at all — that case is covered above.)
    server.use(
      http.get(`${endpoints.pe.holdings}/:id/enrichment`, () =>
        HttpResponse.json({
          status: 'success',
          data: {
            companyName: 'Acme Analytics',
            gics: {
              status: 'found',
              confidence: 'high',
              errorMessage: null,
              checkedAt: null,
              sector: 'Industrials',
              sectorCode: '20',
              industryGroup: 'Capital Goods',
              industryGroupCode: '2010',
              industry: null,
              industryCode: null,
              subIndustry: null,
              subIndustryCode: null,
              reasoning: null,
            },
            url: null,
            location: null,
          },
        }),
      ),
    );
    renderPanel('peh1');
    const box = (await screen.findByRole('heading', { name: /gics/i })).closest('section')!;
    expect(within(box).getByText('Sub-industry')).toBeInTheDocument();
    expect(within(box).getByText('Capital Goods (2010)')).toBeInTheDocument();
    // The sector carries its code too. It was the one level rendered bare, which read as a
    // missing value sitting next to "Capital Goods (2010)".
    expect(within(box).getByText('Industrials (20)')).toBeInTheDocument();
  });

  // The classifier's own justification (F70 Unit D). The API has always sent it; the panel
  // dropped it, which left "why is this company Consumer Discretionary?" unanswerable from
  // the UI — the exact question the field was added to answer.
  describe('GICS reasoning', () => {
    const withReasoning = (reasoning: string | null) =>
      server.use(
        http.get(`${endpoints.pe.holdings}/:id/enrichment`, () =>
          HttpResponse.json({
            status: 'success',
            data: {
              companyName: 'Acme Analytics',
              gics: {
                status: 'found',
                confidence: 'high',
                errorMessage: null,
                checkedAt: null,
                sector: 'Industrials',
                sectorCode: '20',
                industryGroup: 'Capital Goods',
                industryGroupCode: '2010',
                industry: null,
                industryCode: null,
                subIndustry: null,
                subIndustryCode: null,
                reasoning,
              },
              url: null,
              location: null,
            },
          }),
        ),
      );

    it('hides the reasoning behind a disclosure and reveals it on click', async () => {
      const user = userEvent.setup();
      withReasoning('Manufactures industrial pumps for municipal water utilities.');
      renderPanel('peh1');

      const summary = await screen.findByText(/why this classification/i);
      const details = summary.closest('details')!;
      // Collapsed by default — the text is in the DOM but not exposed, which is what makes
      // this a disclosure rather than a paragraph we simply styled small.
      expect(details).not.toHaveAttribute('open');

      await user.click(summary);
      expect(details).toHaveAttribute('open');
      expect(within(details).getByText(/manufactures industrial pumps/i)).toBeInTheDocument();
    });

    it('renders nothing at all when the classifier gave no reason', async () => {
      withReasoning(null);
      renderPanel('peh1');
      await screen.findByRole('heading', { name: /gics/i });
      // Not an empty disclosure — a control that opens onto nothing is worse than its absence.
      expect(screen.queryByText(/why this classification/i)).not.toBeInTheDocument();
    });
  });

  it('renders a holding no pass has touched without crashing', async () => {
    renderPanel('unknown-holding');
    expect(await screen.findByTestId('enrichment-panel')).toBeInTheDocument();
    expect(screen.getAllByText(/not run yet/i)).toHaveLength(3);
  });

  it('handles a failed request without taking the row down', async () => {
    server.use(
      http.get(`${endpoints.pe.holdings}/:id/enrichment`, () =>
        HttpResponse.json({ status: 'error' }, { status: 500 }),
      ),
    );
    renderPanel('peh1', 'Acme Analytics');
    expect(
      await screen.findByText(/could not load enrichment data for acme analytics/i),
    ).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderPanel('peh1');
    await screen.findByRole('heading', { name: /gics/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});
