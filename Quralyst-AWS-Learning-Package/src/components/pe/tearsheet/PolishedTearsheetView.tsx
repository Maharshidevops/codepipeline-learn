// Primary polished tearsheet view — native PDF viewer over the Gamma export proxy.
// The PDF is fetched (not linked) so an expired or missing export renders as an explained
// error with a one-click re-render instead of a viewer full of the JSON error envelope.
import { Spinner } from '@/components/ui';
import { CostTooltip } from '@/components/pe/tearsheet/CostTooltip';
import { GammaExportProblemPanel } from '@/components/pe/tearsheet/GammaExportProblem';
import { useGammaExport } from '@/components/pe/tearsheet/useGammaExport';
import { useGammaRerun } from '@/components/pe/tearsheet/useGammaRerun';
import type { Tearsheet } from '@/types';

export function PolishedTearsheetView({
  data,
  onViewData,
  onRegenerate,
  regenerating = false,
  fullscreen = false,
}: {
  data: Tearsheet;
  onViewData: () => void;
  onRegenerate?: () => void | Promise<void>;
  regenerating?: boolean;
  /** Full browser tab (no app sidebar) — use 100dvh and no inset chrome. */
  fullscreen?: boolean;
}) {
  const {
    pdfUrl,
    loading,
    pdfAvailable,
    pptxAvailable,
    problem,
    pending,
    openInNewTab,
    download,
    retry: retryExport,
  } = useGammaExport(data.id, data.companyName, { load: true });
  const { regeneratePdf, regenerating: regeneratingPdf } = useGammaRerun(data.id, retryExport);

  return (
    <div
      className="tearsheet-gamma d-flex flex-column"
      data-testid="tearsheet-gamma-view"
      data-fullscreen={fullscreen ? 'true' : undefined}
      style={{
        height: fullscreen
          ? '100dvh'
          : 'calc(100dvh - var(--chrome-pad-top, 1.5rem) - var(--chrome-pad-bottom, 1.5rem))',
        maxHeight: fullscreen
          ? '100dvh'
          : 'calc(100dvh - var(--chrome-pad-top, 1.5rem) - var(--chrome-pad-bottom, 1.5rem))',
        overflow: 'hidden',
        background: '#0f172a',
        borderRadius: fullscreen ? 0 : 12,
        border: fullscreen ? 'none' : '1px solid #1e293b',
      }}
    >
      <header
        className="d-flex align-items-center justify-content-between gap-3 px-3 py-2 flex-shrink-0"
        style={{
          background: 'rgba(15, 23, 42, 0.96)',
          borderBottom: '1px solid #1e293b',
          minHeight: 56,
        }}
      >
        <div className="text-truncate" style={{ minWidth: 0 }}>
          <span className="fw-semibold" style={{ color: '#f8fafc', fontSize: 15 }}>
            {data.companyName}
          </span>
          <span className="ms-2" style={{ color: '#94a3b8', fontSize: 13 }}>
            Tearsheet
          </span>
          <span
            className="ms-2 align-middle"
            data-testid="tearsheet-gamma-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              borderRadius: 999,
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#e2e8f0',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '2px 8px',
            }}
          >
            <i className="bi bi-stars" aria-hidden />
            Polished
          </span>
        </div>
        <div className="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
          {data.cost ? <CostTooltip cost={data.cost} /> : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-light"
            onClick={onViewData}
            data-testid="tearsheet-data-version"
            title="View the research data deck"
          >
            <i className="bi bi-grid-3x3-gap me-1" aria-hidden />
            Data version
          </button>
          {data.gammaUrl ? (
            <a
              href={data.gammaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-light"
              data-testid="tearsheet-open-gamma"
            >
              <i className="bi bi-box-arrow-up-right me-1" aria-hidden />
              Open in Gamma
            </a>
          ) : null}
          {!fullscreen ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={openInNewTab}
              disabled={!!pending || !pdfAvailable}
              data-testid="tearsheet-open-pdf-tab"
              title="Open polished PDF in a new tab"
            >
              <i className="bi bi-box-arrow-up-right me-1" aria-hidden />
              New tab
            </button>
          ) : null}
          {onRegenerate ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              disabled={regenerating}
              onClick={() => {
                const ok = window.confirm(
                  `Regenerate the tearsheet for ${data.companyName}? This re-runs research and may incur API costs.`,
                );
                if (!ok) return;
                void onRegenerate();
              }}
              data-testid="tearsheet-gamma-regenerate"
            >
              <i
                className={`bi bi-arrow-clockwise me-1${regenerating ? ' spin' : ''}`}
                aria-hidden
              />
              {regenerating ? 'Starting…' : 'Regenerate'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-light"
            onClick={() => download('pdf')}
            disabled={!pdfAvailable || !!pending}
            data-testid="tearsheet-download-gamma-pdf"
          >
            <i className="bi bi-file-earmark-pdf me-1" aria-hidden />
            Download PDF
          </button>
          {pptxAvailable ? (
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={() => download('pptx')}
              disabled={!!pending}
              data-testid="tearsheet-download-gamma-pptx"
            >
              {pending === 'pptx' ? (
                <Spinner size="sm" />
              ) : (
                <i className="bi bi-file-earmark-slides me-1" aria-hidden />
              )}
              <span className={pending === 'pptx' ? 'ms-1' : undefined}>Download PPTX</span>
            </button>
          ) : null}
        </div>
      </header>

      {problem ? (
        <div className="flex-grow-1" style={{ minHeight: 0 }}>
          <GammaExportProblemPanel
            problem={problem}
            onRetry={retryExport}
            onRegenerate={regeneratePdf}
            regenerating={regeneratingPdf}
            onViewData={onViewData}
          />
        </div>
      ) : loading ? (
        <div
          className="d-flex flex-grow-1 flex-column align-items-center justify-content-center gap-3"
          style={{ minHeight: 0, color: '#94a3b8' }}
          data-testid="tearsheet-gamma-loading"
        >
          <Spinner />
          <p className="mb-0">Loading polished PDF…</p>
        </div>
      ) : pdfUrl ? (
        <object
          title={`${data.companyName} polished tearsheet`}
          data={pdfUrl}
          type="application/pdf"
          className="flex-grow-1 border-0 w-100"
          style={{ minHeight: 0, background: '#0f172a' }}
          data-testid="tearsheet-gamma-pdf"
        >
          <div
            className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 px-3 text-center"
            style={{ color: '#e2e8f0' }}
          >
            <p className="mb-0">Your browser couldn&apos;t display the PDF inline.</p>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={openInNewTab}
                disabled={!pdfAvailable || !!pending}
              >
                Open PDF
              </button>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={() => download('pdf')}
                disabled={!pdfAvailable || !!pending}
              >
                Download PDF
              </button>
            </div>
          </div>
        </object>
      ) : (
        <div className="flex-grow-1" style={{ minHeight: 0 }} />
      )}
    </div>
  );
}
