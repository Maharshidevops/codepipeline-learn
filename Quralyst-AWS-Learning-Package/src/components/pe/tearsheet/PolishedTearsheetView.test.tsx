// The polished viewer fetches the Gamma export instead of pointing an <object> at the proxy, so an
// expired link (410) renders an explained error with a Gamma-only re-render — never raw JSON.
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import { err } from '@/test/mocks/envelope';
import { mockTearsheetWithGamma } from '@/test/mocks/fixtures/peTearsheet';
import { registerErrorToast } from '@/lib/toastBus';
import { PolishedTearsheetView } from './PolishedTearsheetView';
import { __resetGammaExportMemoForTests } from './useGammaExport';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  registerErrorToast(null);
});
afterAll(() => server.close());

const EXPIRED_MESSAGE = 'The Gamma PDF link has expired. Rerun the tearsheet to regenerate it.';

let toastCalls: [string, string | undefined][] = [];

beforeEach(() => {
  // jsdom ships neither half of the object-URL API.
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:mock-pdf'),
    revokeObjectURL: vi.fn(),
  });
  toastCalls = [];
  registerErrorToast((title, message) => toastCalls.push([title, message]));
  __resetGammaExportMemoForTests();
});

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PolishedTearsheetView data={mockTearsheetWithGamma} onViewData={() => {}} />
    </QueryClientProvider>,
  );
}

describe('PolishedTearsheetView', () => {
  it('renders the fetched PDF from a blob URL', async () => {
    renderView();
    await waitFor(() =>
      expect(screen.getByTestId('tearsheet-gamma-pdf')).toHaveAttribute('data', 'blob:mock-pdf'),
    );
    expect(screen.queryByTestId('tearsheet-gamma-unavailable')).not.toBeInTheDocument();
  });

  it('explains an expired export and disables the actions that would fail', async () => {
    server.use(
      http.get(endpoints.pe.tearsheetGammaPdf(mockTearsheetWithGamma.id), () =>
        err(410, EXPIRED_MESSAGE),
      ),
    );
    renderView();

    const panel = await screen.findByTestId('tearsheet-gamma-unavailable');
    expect(panel).toHaveTextContent(/This polished PDF has expired/i);
    expect(panel).toHaveTextContent(EXPIRED_MESSAGE);
    // The HTTP status only classifies the failure; it never reaches the copy.
    expect(panel).not.toHaveTextContent(/410/);
    expect(screen.queryByTestId('tearsheet-gamma-pdf')).not.toBeInTheDocument();
    expect(screen.getByTestId('tearsheet-download-gamma-pdf')).toBeDisabled();
    // The PPTX export is a separate upstream call, so it stays available.
    expect(screen.getByTestId('tearsheet-download-gamma-pptx')).not.toBeDisabled();
  });

  it('drops the PPTX button once its export fails, without leaking the upstream code', async () => {
    server.use(
      http.get(endpoints.pe.tearsheetGammaPptx(mockTearsheetWithGamma.id), () =>
        err(502, 'Gamma PPTX export request failed (401)'),
      ),
    );
    renderView();

    const pptx = await screen.findByTestId('tearsheet-download-gamma-pptx');
    await act(async () => {
      pptx.click();
    });

    await waitFor(() =>
      expect(screen.queryByTestId('tearsheet-download-gamma-pptx')).not.toBeInTheDocument(),
    );
    expect(toastCalls.at(-1)).toEqual([
      "Couldn't load the polished PowerPoint",
      'Gamma PPTX export request failed',
    ]);
  });

  it('re-renders the deck through the Gamma-only rerun and reloads the PDF', async () => {
    let pdfHits = 0;
    let rerunHits = 0;
    server.use(
      http.get(endpoints.pe.tearsheetGammaPdf(mockTearsheetWithGamma.id), () => {
        pdfHits += 1;
        return err(410, EXPIRED_MESSAGE);
      }),
      http.post(endpoints.pe.tearsheetGammaRerun(mockTearsheetWithGamma.id), () => {
        rerunHits += 1;
        return err(409, 'Gamma is not configured for this organisation');
      }),
    );
    renderView();

    const regenerate = await screen.findByTestId('tearsheet-gamma-regenerate-pdf');
    await act(async () => {
      regenerate.click();
    });
    await waitFor(() => expect(rerunHits).toBe(1));

    await act(async () => {
      screen.getByTestId('tearsheet-gamma-retry').click();
    });
    await waitFor(() => expect(pdfHits).toBeGreaterThan(1));
    expect(await screen.findByTestId('tearsheet-gamma-unavailable')).toBeInTheDocument();
  });
});
