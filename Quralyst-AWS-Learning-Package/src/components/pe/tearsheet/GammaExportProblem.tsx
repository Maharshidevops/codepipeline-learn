// Shared "the polished export isn't available" UI for the tearsheet surfaces.
// Both variants show the backend's own message (e.g. the expired Gamma link) and offer the cheap
// fix — a Gamma-only re-render — rather than leaving the user with a failed download.
import { Button, Spinner } from '@/components/ui';
import type { GammaExportProblem } from '@/components/pe/tearsheet/openGammaPdf';

export interface GammaExportProblemProps {
  problem: GammaExportProblem;
  onRetry: () => void;
  /** Gamma-only re-render; omitted when the caller can't start one. */
  onRegenerate?: () => void;
  regenerating?: boolean;
}

function RegenerateLabel({ regenerating }: { regenerating: boolean }) {
  return (
    <>
      {regenerating ? (
        <Spinner size="sm" />
      ) : (
        <i className="bi bi-arrow-clockwise me-1" aria-hidden />
      )}
      <span className={regenerating ? 'ms-1' : undefined}>
        {regenerating ? 'Regenerating…' : 'Regenerate PDF'}
      </span>
    </>
  );
}

/** Fills the viewer area where the PDF would have rendered (dark chrome). */
export function GammaExportProblemPanel({
  problem,
  onRetry,
  onRegenerate,
  regenerating = false,
  onViewData,
}: GammaExportProblemProps & { onViewData?: () => void }) {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 px-3 text-center"
      style={{ color: '#e2e8f0', minHeight: 0 }}
      data-testid="tearsheet-gamma-unavailable"
      role="alert"
    >
      <i className="bi bi-file-earmark-x fs-1" style={{ color: '#f8b4b4' }} aria-hidden />
      <div>
        <h2 className="h5 mb-2">{problem.title}</h2>
        <p className="mb-0" style={{ color: '#94a3b8', maxWidth: 460 }}>
          {problem.message}
        </p>
      </div>
      <div className="d-flex gap-2 flex-wrap justify-content-center">
        {onRegenerate && problem.canRegenerate ? (
          <button
            type="button"
            className="btn btn-light btn-sm"
            onClick={onRegenerate}
            disabled={regenerating}
            data-testid="tearsheet-gamma-regenerate-pdf"
          >
            <RegenerateLabel regenerating={regenerating} />
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-outline-light btn-sm"
          onClick={onRetry}
          disabled={regenerating}
          data-testid="tearsheet-gamma-retry"
        >
          Try again
        </button>
        {onViewData ? (
          <button type="button" className="btn btn-outline-light btn-sm" onClick={onViewData}>
            View data version
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Compact banner for light-chrome cards that only offer downloads. `.alert` is a flex row with a
 * generated icon, so everything sits in a single child; the backend message carries the whole
 * explanation, which is why the panel's headline isn't repeated here.
 */
export function GammaExportProblemAlert({
  problem,
  onRetry,
  onRegenerate,
  regenerating = false,
}: GammaExportProblemProps) {
  return (
    <div
      className="alert alert-warning py-2 small text-start"
      data-testid="tearsheet-gamma-unavailable"
      role="alert"
    >
      <div>
        {problem.message}
        <div className="d-flex gap-2 flex-wrap mt-2">
          {onRegenerate && problem.canRegenerate ? (
            <Button
              variant="popup-primary"
              size="sm"
              onClick={onRegenerate}
              loading={regenerating}
              data-testid="tearsheet-gamma-regenerate-pdf"
            >
              {regenerating ? 'Regenerating…' : 'Regenerate PDF'}
            </Button>
          ) : null}
          <Button
            variant="popup-secondary"
            size="sm"
            onClick={onRetry}
            disabled={regenerating}
            data-testid="tearsheet-gamma-retry"
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
