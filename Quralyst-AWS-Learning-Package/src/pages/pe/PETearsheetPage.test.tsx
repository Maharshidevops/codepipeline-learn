// PE Tearsheet page tests (F40.2).
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import { err, ok } from '@/test/mocks/envelope';
import {
  mockTearsheetComplete,
  mockTearsheetFailed,
  mockTearsheetGammaGenerating,
  mockTearsheetInflight,
  mockTearsheetSynthesizing,
  mockTearsheetWithGamma,
} from '@/test/mocks/fixtures/peTearsheet';
import { openTearsheet } from '@/lib/tearsheet/openTearsheet';
import {
  formatCostBadgeTotal,
  formatCostLineAmount,
  CostTooltip,
} from '@/components/pe/tearsheet/CostTooltip';
import PETearsheetPage, { __resetTearsheetCreateGuardForTests } from './PETearsheetPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  __resetTearsheetCreateGuardForTests();
});
afterAll(() => server.close());

function renderPage(search = '?company=Widget%20Co') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/pe/tearsheet${search}`]}>
        <Routes>
          <Route path="/pe/tearsheet" element={<PETearsheetPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('openTearsheet', () => {
  it('builds the tearsheet URL with encoded company and optional website', () => {
    expect(openTearsheet('Acme & Co')).toBe('/pe/tearsheet?company=Acme+%26+Co');
    expect(openTearsheet('Acme', 'https://acme.com')).toBe(
      '/pe/tearsheet?company=Acme&website=https%3A%2F%2Facme.com',
    );
  });
});

describe('CostTooltip formatting', () => {
  it('formats badge total to 4dp with plus when unknown costs exist', () => {
    const cost = mockTearsheetComplete.cost!;
    expect(formatCostBadgeTotal(cost)).toBe('Est. $0.8425+');
    expect(formatCostLineAmount(null)).toBe('plan-based');
    expect(formatCostLineAmount(0.33)).toBe('$0.3300');
  });

  it('renders cost tooltip with plan-based line', () => {
    render(<CostTooltip cost={mockTearsheetComplete.cost!} />);
    expect(screen.getByTestId('tearsheet-cost-badge')).toHaveTextContent('Est. $0.8425+');
    const lines = screen.getAllByTestId('tearsheet-cost-line');
    expect(lines.some((el) => el.textContent === 'plan-based')).toBe(true);
  });
});

describe('PETearsheetPage', () => {
  it('shows a company picker when no company query param is set', async () => {
    renderPage('');
    expect(await screen.findByTestId('tearsheet-picker')).toBeInTheDocument();
    expect(screen.getByTestId('tearsheet-picker-search')).toBeInTheDocument();
    expect(await screen.findByTestId('tearsheet-picker-list')).toBeInTheDocument();
    expect(await screen.findByTestId('tearsheet-recent')).toBeInTheDocument();
    expect(screen.getByTestId('tearsheet-recent-generated')).toHaveTextContent(/Generated/i);
    // Recent section is above portfolio companies in the document order.
    const recent = screen.getByTestId('tearsheet-recent');
    const holdings = screen.getByTestId('tearsheet-picker-list');
    expect(
      recent.compareDocumentPosition(holdings) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText(/No company specified/i)).not.toBeInTheDocument();
  });

  it('fires exactly one POST on mount (StrictMode-safe)', async () => {
    let postCount = 0;
    server.use(
      http.post(endpoints.pe.tearsheets, async ({ request }) => {
        postCount += 1;
        const body = (await request.json()) as { companyName?: string };
        return ok({ ...mockTearsheetInflight, companyName: body.companyName ?? 'Widget Co' });
      }),
      http.get(endpoints.pe.tearsheet('ts-inflight'), () => ok(mockTearsheetComplete)),
    );

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/pe/tearsheet?company=Widget%20Co']}>
          <StrictMode>
            <Routes>
              <Route path="/pe/tearsheet" element={<PETearsheetPage />} />
            </Routes>
          </StrictMode>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(postCount).toBe(1));
    expect(await screen.findByTestId('tearsheet-deck')).toBeInTheDocument();
  });

  it('polls until complete and shows stage header labels', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let getCount = 0;
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetInflight)),
      http.get(endpoints.pe.tearsheet('ts-inflight'), () => {
        getCount += 1;
        if (getCount === 1) return ok(mockTearsheetInflight);
        if (getCount === 2) return ok(mockTearsheetSynthesizing);
        return ok(mockTearsheetComplete);
      }),
    );

    renderPage('?company=Widget%20Co');
    // Create is async — LoadingState first paints as Queued before adopt().
    await waitFor(() => {
      expect(screen.getByTestId('tearsheet-stage-header')).toHaveTextContent(
        /Now: News scan|Researching company across the web/i,
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(25000);
    });

    expect(await screen.findByTestId('tearsheet-deck')).toBeInTheDocument();
    expect(getCount).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });

  it('shows synthesizing header label when status is synthesizing', async () => {
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetSynthesizing)),
      http.get(endpoints.pe.tearsheet('ts-synth'), () => ok(mockTearsheetSynthesizing)),
    );
    renderPage('?company=Synth%20Co');
    // Create is async — LoadingState first paints as Queued before adopt().
    await waitFor(() => {
      expect(screen.getByTestId('tearsheet-stage-header')).toHaveTextContent(
        /Now: AI synthesis|Synthesizing tearsheet with AI/i,
      );
    });
    expect(screen.getByTestId('tearsheet-stages')).toBeInTheDocument();
  });

  it('marks skipped stages as Skipped (red), not Done', async () => {
    server.use(
      http.post(endpoints.pe.tearsheets, () =>
        ok({
          ...mockTearsheetSynthesizing,
          status: 'researching',
          stages: [
            {
              key: 'perplexity',
              label: 'Perplexity deep research',
              status: 'failed',
              message: 'Skipped — no Perplexity key configured',
            },
            {
              key: 'brave',
              label: 'Brave web search',
              status: 'complete',
              message: 'Skipped — News API budget exceeded',
            },
            { key: 'serper', label: 'Serper news + knowledge graph', status: 'running' },
            { key: 'coresignal', label: 'LinkedIn metrics', status: 'pending' },
            { key: 'reviews', label: 'Review-site insights', status: 'pending' },
            { key: 'synthesis', label: 'LLM synthesis', status: 'pending' },
          ],
        }),
      ),
      http.get(endpoints.pe.tearsheet('ts-synth'), () =>
        ok({
          ...mockTearsheetSynthesizing,
          status: 'researching',
          stages: [
            {
              key: 'perplexity',
              label: 'Perplexity deep research',
              status: 'failed',
              message: 'Skipped — no Perplexity key configured',
            },
            {
              key: 'brave',
              label: 'Brave web search',
              status: 'complete',
              message: 'Skipped — News API budget exceeded',
            },
            { key: 'serper', label: 'Serper news + knowledge graph', status: 'running' },
            { key: 'coresignal', label: 'LinkedIn metrics', status: 'pending' },
            { key: 'reviews', label: 'Review-site insights', status: 'pending' },
            { key: 'synthesis', label: 'LLM synthesis', status: 'pending' },
          ],
        }),
      ),
    );
    renderPage('?company=Synth%20Co');
    await waitFor(() => {
      expect(screen.getByTestId('tearsheet-stage-perplexity')).toHaveAttribute(
        'data-stage-kind',
        'skipped',
      );
    });
    expect(screen.getByTestId('tearsheet-stage-perplexity')).toHaveTextContent(/Skipped/i);
    expect(screen.getByTestId('tearsheet-stage-brave')).toHaveAttribute(
      'data-stage-kind',
      'skipped',
    );
    expect(screen.getByTestId('tearsheet-stage-brave')).toHaveTextContent(/Skipped/i);
    expect(screen.getByTestId('tearsheet-stage-brave')).not.toHaveTextContent(/^Done$/);
  });

  it('cancels an in-flight tearsheet and returns to the picker', async () => {
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetSynthesizing)),
      http.get(endpoints.pe.tearsheet('ts-synth'), () => ok(mockTearsheetSynthesizing)),
    );
    renderPage('?company=Synth%20Co');
    expect(await screen.findByTestId('tearsheet-loading')).toBeInTheDocument();
    // Cancel is hidden until create returns a real id (not pending-*).
    expect(await screen.findByTestId('tearsheet-cancel')).toBeInTheDocument();
    await act(async () => {
      screen.getByTestId('tearsheet-cancel').click();
    });
    expect(await screen.findByTestId('tearsheet-picker')).toBeInTheDocument();
  });

  it('shows error card when generation failed', async () => {
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetFailed)),
      http.get(endpoints.pe.tearsheet('ts-failed'), () => ok(mockTearsheetFailed)),
    );
    renderPage('?company=Bad%20Co');
    const card = await screen.findByTestId('tearsheet-error');
    expect(card).toHaveTextContent(/Couldn't generate tearsheet/i);
    expect(card).toHaveTextContent(/Unable to find enough public information/i);
  });

  it('shows queued label for pending status', async () => {
    server.use(
      http.post(endpoints.pe.tearsheets, () =>
        ok({ ...mockTearsheetInflight, id: 'ts-pending', status: 'pending', stages: [] }),
      ),
      http.get(endpoints.pe.tearsheet('ts-pending'), () =>
        ok({ ...mockTearsheetInflight, id: 'ts-pending', status: 'pending', stages: [] }),
      ),
    );
    renderPage('?company=Pending%20Co');
    expect(await screen.findByTestId('tearsheet-stage-header')).toHaveTextContent('Queued');
  });

  it('has no axe violations on loading and complete deck', async () => {
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetComplete)),
      http.get(endpoints.pe.tearsheet('ts-complete'), () => ok(mockTearsheetComplete)),
    );
    const { container } = renderPage('?company=Acme%20Robotics');
    expect(await screen.findByTestId('tearsheet-deck')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('regenerates a completed tearsheet and returns to loading', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    let getCount = 0;
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetComplete)),
      http.get(endpoints.pe.tearsheet('ts-complete'), () => {
        getCount += 1;
        // Simulate a stale complete overlapping regenerate — must not drop progress UI.
        if (getCount === 1) return ok(mockTearsheetComplete);
        return ok({
          ...mockTearsheetComplete,
          status: 'pending',
          content: undefined,
          cost: undefined,
          updatedAt: new Date().toISOString(),
          stages: mockTearsheetComplete.stages.map((s) => ({
            ...s,
            status: 'pending' as const,
          })),
        });
      }),
      http.post(endpoints.pe.tearsheetRerun('ts-complete'), async () => {
        await new Promise((r) => setTimeout(r, 50));
        return ok({
          ...mockTearsheetComplete,
          status: 'pending',
          content: undefined,
          cost: undefined,
          updatedAt: new Date().toISOString(),
          stages: mockTearsheetComplete.stages.map((s) => ({
            ...s,
            status: 'pending' as const,
          })),
        });
      }),
    );
    renderPage('?company=Acme%20Robotics');
    expect(await screen.findByTestId('tearsheet-deck')).toBeInTheDocument();
    await act(async () => {
      screen.getByTestId('tearsheet-regenerate').click();
    });
    expect(confirmSpy).toHaveBeenCalled();
    expect(await screen.findByTestId('tearsheet-loading')).toBeInTheDocument();
    expect(screen.getByTestId('tearsheet-stages')).toBeInTheDocument();
    // Stale complete must not yank us back to an empty/missing deck.
    expect(screen.queryByTestId('tearsheet-deck')).not.toBeInTheDocument();
    expect(screen.getByTestId('tearsheet-stage-header')).toHaveTextContent(
      /Queued|Regenerating|Now:/i,
    );
    confirmSpy.mockRestore();
  });

  it('opens polished tearsheet in a full-page tab when ready', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetWithGamma)),
      http.get(endpoints.pe.tearsheet('ts-gamma'), () => ok(mockTearsheetWithGamma)),
    );
    renderPage('?company=Gamma%20Co');
    expect(await screen.findByTestId('tearsheet-ready-card')).toBeInTheDocument();
    expect(openSpy).toHaveBeenCalledWith(
      '/pe/tearsheet/view/ts-gamma',
      '_blank',
      'noopener,noreferrer',
    );
    // The export is fetched, never linked — a raw href would hand the user the JSON error
    // envelope when the Gamma link has expired. The button goes live once the bytes arrive.
    const downloadPdf = screen.getByTestId('tearsheet-download-gamma-pdf');
    expect(downloadPdf).not.toHaveAttribute('href');
    expect(downloadPdf).toHaveTextContent(/Download PDF/i);
    await waitFor(() => expect(downloadPdf).not.toBeDisabled());
    expect(screen.getByTestId('tearsheet-cost-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('tearsheet-deck')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tearsheet-data-version')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tearsheet-gamma-view')).not.toBeInTheDocument();

    openSpy.mockClear();
    await act(async () => {
      screen.getByTestId('tearsheet-open-full-page').click();
    });
    expect(openSpy).toHaveBeenCalledWith(
      '/pe/tearsheet/view/ts-gamma',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('explains an expired polished PDF and offers a Gamma-only re-render', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    let rerunCount = 0;
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetWithGamma)),
      http.get(endpoints.pe.tearsheet('ts-gamma'), () => ok(mockTearsheetWithGamma)),
      http.get(endpoints.pe.tearsheetGammaPdf('ts-gamma'), () =>
        err(410, 'The Gamma PDF link has expired. Rerun the tearsheet to regenerate it.'),
      ),
      http.post(endpoints.pe.tearsheetGammaRerun('ts-gamma'), () => {
        rerunCount += 1;
        return ok({ ok: true, gammaStatus: 'generating' });
      }),
    );

    renderPage('?company=Gamma%20Co');
    expect(await screen.findByTestId('tearsheet-ready-card')).toBeInTheDocument();

    // The card checks the export up front, so the user is told before clicking anything.
    const banner = await screen.findByTestId('tearsheet-gamma-unavailable');
    expect(banner).toHaveTextContent(/expired/i);
    expect(banner).toHaveTextContent(/Rerun the tearsheet to regenerate it/i);
    expect(banner).not.toHaveTextContent(/410/);
    expect(screen.getByTestId('tearsheet-download-gamma-pdf')).toBeDisabled();

    await act(async () => {
      screen.getByTestId('tearsheet-gamma-regenerate-pdf').click();
    });
    await waitFor(() => expect(rerunCount).toBe(1));
    openSpy.mockRestore();
  });

  it('keeps polishing progress UI while Gamma is generating', async () => {
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetGammaGenerating)),
      http.get(endpoints.pe.tearsheet('ts-gamma-gen'), () => ok(mockTearsheetGammaGenerating)),
    );
    renderPage('?company=Gamma%20Gen');
    // The gamma row is in the canonical stage list from the first paint, so it can't be the signal
    // that create has been adopted — wait for the header to leave the seeded "Queued" phase.
    await waitFor(() =>
      expect(screen.getByTestId('tearsheet-stage-header')).toHaveTextContent(/Polishing|Gamma/i),
    );
    expect(screen.getByTestId('tearsheet-stage-gamma')).toBeInTheDocument();
    expect(screen.getByTestId('tearsheet-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('tearsheet-deck')).not.toBeInTheDocument();
  });

  it('keeps progress UI if a stale complete arrives without content during regenerate', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const oldComplete = {
      ...mockTearsheetComplete,
      content: undefined,
      updatedAt: '2020-01-01T00:00:00.000Z',
    };
    server.use(
      http.post(endpoints.pe.tearsheets, () => ok(mockTearsheetComplete)),
      http.get(endpoints.pe.tearsheet('ts-complete'), () => ok(oldComplete)),
      http.post(endpoints.pe.tearsheetRerun('ts-complete'), () =>
        ok({
          ...mockTearsheetComplete,
          status: 'researching',
          content: undefined,
          cost: undefined,
          updatedAt: new Date().toISOString(),
          stages: mockTearsheetComplete.stages.map((s) => ({
            ...s,
            status: 'pending' as const,
          })),
        }),
      ),
    );
    renderPage('?company=Acme%20Robotics');
    expect(await screen.findByTestId('tearsheet-deck')).toBeInTheDocument();
    await act(async () => {
      screen.getByTestId('tearsheet-regenerate').click();
    });
    expect(await screen.findByTestId('tearsheet-loading')).toBeInTheDocument();
    // Even after poll returns stale complete-without-content, stay on progress.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(screen.getByTestId('tearsheet-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('tearsheet-deck')).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
