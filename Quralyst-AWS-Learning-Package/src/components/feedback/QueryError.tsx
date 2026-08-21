// QueryError (Phase 14) — the one shared inline error+retry block for data-fetching pages. Pages
// previously branched only on loading + empty, so a fetch failure was indistinguishable from a
// genuinely empty result ("No Data Available"). This renders a distinct error state with an optional
// Retry. Self-styled (co-located query-error.css) — mirrors `.no-data-placeholder` from
// view-result.css — so it looks the same on any page regardless of which stylesheet that page
// imports.
import './query-error.css';

interface QueryErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function QueryError({
  title = 'Something went wrong',
  message = "We couldn't load this data. Please try again.",
  onRetry,
}: QueryErrorProps) {
  return (
    <div role="alert" className="query-error">
      <i className="bi bi-exclamation-triangle query-error-icon" />
      <h5 className="mt-3 query-error-title">{title}</h5>
      <p className="query-error-message">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-standard" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1" />
          Retry
        </button>
      )}
    </div>
  );
}
