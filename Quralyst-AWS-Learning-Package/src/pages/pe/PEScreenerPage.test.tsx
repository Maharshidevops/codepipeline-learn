// PE Screener page (F29.2): each tab renders fixtures + forwards its filters as query params;
// tab switching preserves per-tab filter state + page; options dropdowns populate; the suspect
// toggle flips the qualityFilter param; find-similar happy path renders the criteria panel +
// ranked cards + expandable evidence; the empty-plan path renders the rephrase hint (not a crash);
// the mode selector switches the request body; Mode C cards render cleanly; and axe on all tabs.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import PEScreenerPage from './PEScreenerPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Capture screener GET requests so tests can assert forwarded query params.
function trackRequests() {
  const seen: { url: string; method: string; body?: unknown }[] = [];
  const onStart = async ({ request }: { request: Request }) => {
    if (request.url.includes('/api/pe/screener/')) {
      const method = request.method;
      let body: unknown;
      if (method === 'POST')
        body = await request
          .clone()
          .json()
          .catch(() => undefined);
      seen.push({ url: request.url, method, body });
    }
  };
  server.events.on('request:start', onStart);
  return seen;
}

function lastMatching(seen: { url: string; method: string }[], predicate: (u: string) => boolean) {
  return [...seen].reverse().find((r) => predicate(r.url));
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/pe/screener']}>
          <PEScreenerPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

// The find-similar tab is the default; helper to reach a data tab.
async function goToTab(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('tab', { name }));
}

// All tabs stay mounted (hidden), so scope queries to the tab's panel to avoid cross-tab duplicates.
function panel(id: 'similar' | 'holdings' | 'firms' | 'people') {
  return within(screen.getByTestId(`panel-${id}`));
}

describe('PEScreenerPage — tabs & layout', () => {
  it('defaults to Find Similar and switches to Holdings on tab click', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole('tab', { name: /find similar/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await goToTab(user, /holdings/i);
    // Holdings stat row + a fixture row.
    expect(await panel('holdings').findByText(/total holdings/i)).toBeInTheDocument();
    expect(await panel('holdings').findByText('Acme HealthTech')).toBeInTheDocument();
  });

  it('populates the sector/geography dropdowns from /options', async () => {
    const user = userEvent.setup();
    renderPage();
    await goToTab(user, /holdings/i);
    await panel('holdings').findByText('Acme HealthTech');
    await user.click(panel('holdings').getByRole('combobox', { name: /filter by sector/i }));
    expect(await panel('holdings').findByRole('option', { name: 'Logistics' })).toBeInTheDocument();
  });
});

describe('PEScreenerPage — Holdings tab', () => {
  it('forwards the search param and the suspect toggle flips qualityFilter=suspect', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await goToTab(user, /holdings/i);
    await panel('holdings').findByText('Acme HealthTech');

    await user.type(panel('holdings').getByRole('textbox', { name: /search holdings/i }), 'beacon');
    // Debounced — wait for a request carrying the search term.
    await vi.waitFor(() => {
      const req = lastMatching(seen, (u) => u.includes('holdings') && u.includes('search=beacon'));
      expect(req).toBeTruthy();
    });

    // Suspect-only toggle → qualityFilter=suspect on the next request.
    await user.click(panel('holdings').getByLabelText(/suspect only/i));
    await vi.waitFor(() => {
      const req = lastMatching(
        seen,
        (u) => u.includes('holdings') && u.includes('qualityFilter=suspect'),
      );
      expect(req).toBeTruthy();
    });
  });
});

describe('PEScreenerPage — Firms tab', () => {
  it('renders firm rows with provenance badges and forwards a rev target', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await goToTab(user, /firms/i);
    expect(await panel('firms').findByText(/thoma bravo/i)).toBeInTheDocument();
    // Provenance badges from the fixture.
    expect(panel('firms').getAllByText(/auto-filled/i).length).toBeGreaterThan(0);

    await user.type(panel('firms').getByRole('spinbutton', { name: /revenue target/i }), '150');
    await vi.waitFor(() => {
      const req = lastMatching(seen, (u) => u.includes('firms') && u.includes('revTarget=150'));
      expect(req).toBeTruthy();
    });
  });

  it('can filter firms by paused status (F60 §7)', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await goToTab(user, /firms/i);
    expect(await panel('firms').findByText(/thoma bravo/i)).toBeInTheDocument();

    await user.click(panel('firms').getByRole('combobox', { name: /filter by status/i }));
    await user.click(await panel('firms').findByRole('option', { name: 'Paused' }));
    await vi.waitFor(() => {
      const req = lastMatching(seen, (u) => u.includes('firms') && u.includes('status=paused'));
      expect(req).toBeTruthy();
    });
    expect(await panel('firms').findByText(/paused partners/i)).toBeInTheDocument();
    expect(panel('firms').queryByText(/thoma bravo/i)).not.toBeInTheDocument();
  });
});

describe('PEScreenerPage — People tab', () => {
  it('renders people with verification badges and forwards hasLinkedIn', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await goToTab(user, /people/i);
    expect(await panel('people').findByText(/ada partner/i)).toBeInTheDocument();
    expect(panel('people').getByText(/deliverable/i)).toBeInTheDocument();
    expect(panel('people').getByText(/inferred/i)).toBeInTheDocument();

    await user.click(panel('people').getByRole('combobox', { name: /has linkedin/i }));
    await user.click(await panel('people').findByRole('option', { name: 'Yes' }));
    await vi.waitFor(() => {
      const req = lastMatching(seen, (u) => u.includes('people') && u.includes('hasLinkedIn=yes'));
      expect(req).toBeTruthy();
    });
  });
});

describe('PEScreenerPage — tab state preservation', () => {
  it('keeps a Holdings search after switching to People and back', async () => {
    const user = userEvent.setup();
    renderPage();
    await goToTab(user, /holdings/i);
    await panel('holdings').findByText('Acme HealthTech');
    const searchBox = panel('holdings').getByRole('textbox', { name: /search holdings/i });
    await user.type(searchBox, 'beacon');
    expect(searchBox).toHaveValue('beacon');

    await goToTab(user, /people/i);
    await panel('people').findByText(/ada partner/i);
    await goToTab(user, /holdings/i);
    // Value survived the switch (tabs stay mounted).
    expect(panel('holdings').getByRole('textbox', { name: /search holdings/i })).toHaveValue(
      'beacon',
    );
  });
});

describe('PEScreenerPage — Find Similar', () => {
  it('renders the criteria panel, ranked cards, and expandable evidence', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      panel('similar').getByRole('textbox', { name: /target company description/i }),
      'B2B SaaS for healthcare revenue cycle management',
    );
    await user.click(panel('similar').getByRole('button', { name: /^search$/i }));

    // Criteria panel.
    expect(
      await panel('similar').findByText(/healthcare revenue cycle software/i),
    ).toBeInTheDocument();
    expect(panel('similar').getByText(/searched 128 portfolio/i)).toBeInTheDocument();
    // Ranked firm cards.
    expect(panel('similar').getByText(/vista equity partners/i)).toBeInTheDocument();
    expect(panel('similar').getByText(/92% best match/i)).toBeInTheDocument();

    // Expand evidence for the first firm.
    const [showBtn] = panel('similar').getAllByRole('button', { name: /show evidence/i });
    await user.click(showBtn);
    expect(await panel('similar').findByText('Acme HealthTech')).toBeInTheDocument();
    expect(panel('similar').getByText(/directly operates in healthcare rcm/i)).toBeInTheDocument();
  });

  it('switches the request body mode via the mode selector', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await user.click(panel('similar').getByRole('radio', { name: /past owners/i }));
    await user.type(
      panel('similar').getByRole('textbox', { name: /target company description/i }),
      'industrial distribution',
    );
    await user.click(panel('similar').getByRole('button', { name: /^search$/i }));
    await panel('similar').findByText(/healthcare revenue cycle software/i);
    const req = lastMatching(seen, (u) => u.includes('find-similar-firms'));
    expect((req?.body as { mode?: string })?.mode).toBe('past_owners');
  });

  it('renders Mode C cards cleanly (score 100, no evidence)', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(panel('similar').getByRole('radio', { name: /sector interest/i }));
    await user.type(
      panel('similar').getByRole('textbox', { name: /target company description/i }),
      'healthcare software',
    );
    await user.click(panel('similar').getByRole('button', { name: /^search$/i }));
    expect(await panel('similar').findByText(/sector interest capital/i)).toBeInTheDocument();
    expect(panel('similar').getByText(/100% best match/i)).toBeInTheDocument();
    // No evidence toggle for Mode C.
    expect(
      panel('similar').queryByRole('button', { name: /show evidence/i }),
    ).not.toBeInTheDocument();
  });

  it('surfaces the backend rephrase hint on an empty plan (no crash)', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      panel('similar').getByRole('textbox', { name: /target company description/i }),
      'asdfghjkl',
    );
    await user.click(panel('similar').getByRole('button', { name: /^search$/i }));
    expect(await panel('similar').findByText(/couldn't identify an industry/i)).toBeInTheDocument();
  });
});

describe('PEScreenerPage — accessibility', () => {
  it('has no axe violations on each tab and the evidence expansion', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    // Find Similar (default) + results with evidence expanded.
    await user.type(
      panel('similar').getByRole('textbox', { name: /target company description/i }),
      'B2B SaaS for healthcare revenue cycle management',
    );
    await user.click(panel('similar').getByRole('button', { name: /^search$/i }));
    await panel('similar').findByText(/healthcare revenue cycle software/i);
    const [showBtn] = panel('similar').getAllByRole('button', { name: /show evidence/i });
    await user.click(showBtn);
    await panel('similar').findByText('Acme HealthTech');
    expect(await axe(container)).toHaveNoViolations();

    // Holdings.
    await goToTab(user, /holdings/i);
    await panel('holdings').findByText(/total holdings/i);
    expect(await axe(container)).toHaveNoViolations();

    // Firms.
    await goToTab(user, /firms/i);
    await panel('firms').findByText(/thoma bravo/i);
    expect(await axe(container)).toHaveNoViolations();

    // People.
    await goToTab(user, /people/i);
    await panel('people').findByText(/ada partner/i);
    expect(await axe(container)).toHaveNoViolations();
  }, 15_000);
});
