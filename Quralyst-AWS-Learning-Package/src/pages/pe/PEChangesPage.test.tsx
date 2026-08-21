// PE Activity Feed page (F31.2): the feed renders mixed-type MSW fixture rows with the correct badges
// and narrative descriptions; Market Pulse + summary pills match the fixture byType bundle; the type
// pills + firm filter forward the right query params (MSW spy) and write them to the URL; deep links
// point at /pe/firms/:id (firm) and /pe/firms/:id?holding=:hid (company), and a null-holdingId row
// renders with NO holding link; "Load more" fires the next offset page and appends it; axe finds no
// violations. UI port of Replit Changes.tsx (date-grouped feed + Market Pulse).
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { ok } from '@/test/mocks/envelope';
import { endpoints } from '@/services/endpoints';
import type { PEChangeRow } from '@/types';
import PEChangesPage from './PEChangesPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function trackRequests() {
  const seen: { url: string }[] = [];
  const onStart = ({ request }: { request: Request }) => {
    const u = request.url;
    if (u.includes('/api/pe/changes') && !u.includes('/summary')) seen.push({ url: u });
  };
  server.events.on('request:start', onStart);
  return seen;
}

function lastMatching(seen: { url: string }[], predicate: (u: string) => boolean) {
  return [...seen].reverse().find((r) => predicate(r.url));
}

function renderPage(initialEntry = '/pe/changes') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <PEChangesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PEChangesPage — feed', () => {
  it('renders mixed-type rows with badges + narrative descriptions', async () => {
    renderPage();
    expect(await screen.findByText('Helio Robotics')).toBeInTheDocument();

    const badges = screen.getAllByTestId('change-type-badge');
    const types = badges.map((b) => b.getAttribute('data-type'));
    expect(types).toContain('added');
    expect(types).toContain('removed');
    expect(types).toContain('status_change');
    expect(types).toContain('field_change');

    // status_change row narrative includes old → new values.
    const statusRow = screen.getByText('Beacon Analytics').closest('[data-testid="change-row"]')!;
    expect(
      within(statusRow).getByText(/status changed from "current" to "exited"/i),
    ).toBeInTheDocument();

    // field_change row narrative includes the fieldName + new value.
    const fieldRow = screen.getByText('Zenith Health').closest('[data-testid="change-row"]')!;
    expect(within(fieldRow).getByText(/sector changed from/i)).toBeInTheDocument();
    expect(within(fieldRow).getByText(/Healthcare IT/i)).toBeInTheDocument();
  });

  it('deep-links firm and shows chevron to firm when holding exists', async () => {
    renderPage();
    await screen.findByText('Helio Robotics');

    expect(screen.getAllByRole('link', { name: 'Vista Equity Partners' })[0]).toHaveAttribute(
      'href',
      '/pe/firms/pef1',
    );

    // Replit: company name is plain text; chevron → firm detail when holdingId is set.
    expect(screen.queryByRole('link', { name: 'Helio Robotics' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Open Helio Robotics')).toHaveAttribute('href', '/pe/firms/pef1');

    // Removed row whose delete was applied (holdingId=null) → no chevron.
    expect(screen.queryByLabelText('Open Cobalt Logistics')).not.toBeInTheDocument();
    expect(screen.getByText('Cobalt Logistics')).toBeInTheDocument();
  });

  it('does not show the Private Equity breadcrumb', async () => {
    renderPage();
    await screen.findByText('Helio Robotics');
    expect(screen.queryByText('Private Equity')).not.toBeInTheDocument();
  });

  it('groups rows by calendar day', async () => {
    renderPage();
    await screen.findByText('Helio Robotics');
    expect(screen.getByText(/July 12, 2026|12 July 2026/i)).toBeInTheDocument();
  });
});

describe('PEChangesPage — summary cards', () => {
  it('renders Market Pulse + one pill per byType entry matching the fixture', async () => {
    renderPage();
    const cards = await screen.findByTestId('summary-cards');
    expect(within(cards).getByTestId('summary-total')).toHaveTextContent('5');
    expect(within(screen.getByTestId('summary-added')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('summary-removed')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('summary-status_change')).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Status Change/i })).toBeInTheDocument();
  });
});

describe('PEChangesPage — filters', () => {
  it('type pill forwards type=added to the request query', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await screen.findByText('Helio Robotics');

    await user.click(screen.getByRole('button', { name: /New Addition/i, pressed: false }));
    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('type=added'))).toBeTruthy();
    });
    await vi.waitFor(() => {
      expect(screen.queryByText('Cobalt Logistics')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Helio Robotics')).toBeInTheDocument();
  });

  it('firm filter forwards firmId to the request query', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    renderPage();
    await screen.findByText('Helio Robotics');

    await user.click(screen.getByRole('combobox', { name: /filter by firm/i }));
    await user.click(await screen.findByRole('option', { name: 'Vista Equity Partners' }));
    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('firmId=pef1'))).toBeTruthy();
    });
    await vi.waitFor(() => {
      expect(screen.queryByText('Delta Foods')).not.toBeInTheDocument();
    });
  });

  it('restores the type filter from the URL query string (shareable)', async () => {
    const seen = trackRequests();
    renderPage('/pe/changes?type=removed');
    await screen.findByText('Cobalt Logistics');
    expect(lastMatching(seen, (u) => u.includes('type=removed'))).toBeTruthy();
    // Pill (not the type-select trigger, which also mentions "No longer seen").
    expect(screen.getByTestId('summary-removed')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('PEChangesPage — load more', () => {
  it('appends the next offset page', async () => {
    const extra: PEChangeRow = {
      id: 'chg-page2',
      firmId: 'pef1',
      firmName: 'Vista Equity Partners',
      holdingId: 'h-p2',
      companyName: 'Second Page Co',
      changeType: 'added',
      fieldName: null,
      oldValue: null,
      newValue: null,
      detectedAt: '2026-07-01T00:00:00Z',
      scrapeJobId: null,
    };
    const seen = trackRequests();
    server.use(
      http.get(endpoints.pe.changes, ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get('offset') ?? '0');
        const limit = Number(url.searchParams.get('limit') ?? '100');
        const firstPage: PEChangeRow[] = Array.from({ length: limit }, (_, i) => ({
          ...extra,
          id: `p1-${i}`,
          companyName: i === 0 ? 'First Page Co' : `Filler ${i}`,
          holdingId: `h1-${i}`,
        }));
        const changes = offset === 0 ? firstPage : [extra];
        return ok({ changes, total: limit + 1, limit, offset });
      }),
    );

    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('First Page Co')).toBeInTheDocument();
    expect(screen.queryByText('Second Page Co')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load more/i }));

    await vi.waitFor(() => {
      expect(lastMatching(seen, (u) => u.includes('offset=100'))).toBeTruthy();
    });
    expect(await screen.findByText('Second Page Co')).toBeInTheDocument();
    expect(screen.getByText('First Page Co')).toBeInTheDocument();
  });
});

describe('PEChangesPage — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByText('Helio Robotics');
    expect(await axe(container)).toHaveNoViolations();
  });
});
