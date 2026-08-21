// Single digest event row (F37.2) — headline, why-it-matters, tags, importance, deep links.
// Visual parity with QURALYST-20 Digest EventRow (rank chip / category disc + hover chevron).
import { Link } from 'react-router-dom';
import { paths } from '@/routes/paths';
import type { DigestEvent } from '@/types';
import {
  CategoryIcon,
  ImportanceBadge,
  formatRelativeOccurredAt,
} from '@/components/pe/digest/digestMeta';

export function DigestEventRow({ event, rank }: { event: DigestEvent; rank?: number }) {
  const firmHref = event.firmId ? paths.pe.firm(String(event.firmId)) : null;
  const holdingHref =
    event.firmId && event.holdingId
      ? `${paths.pe.firm(String(event.firmId))}?holding=${encodeURIComponent(String(event.holdingId))}`
      : null;

  return (
    <div
      className="digest-event-row"
      data-testid="digest-event"
      data-category={event.category}
      data-id={event.id}
    >
      {rank !== undefined ? (
        <div className="digest-rank" aria-label={`Rank ${rank}`}>
          {rank}
        </div>
      ) : (
        <CategoryIcon category={event.category} />
      )}

      <div className="digest-event-row__body">
        <div className="digest-event-headline-row">
          <span className="digest-event-headline">{event.headline}</span>
          <ImportanceBadge importance={event.importance} />
        </div>
        <p className="digest-event-why">{event.whyItMatters}</p>
        <div className="digest-event-meta">
          {firmHref ? (
            <Link to={firmHref}>
              <i className="bi bi-building" aria-hidden="true" />
              {event.firmName ?? 'Firm'}
            </Link>
          ) : null}
          {holdingHref ? (
            <Link to={holdingHref} data-testid="digest-holding-link">
              <i className="bi bi-briefcase" aria-hidden="true" />
              View holding
            </Link>
          ) : null}
          {event.tags.map((tag) => (
            <span key={tag} className="digest-tag" data-testid="digest-tag" data-tag={tag}>
              {tag}
            </span>
          ))}
          <span className="digest-event-time" title={event.occurredAt ?? undefined}>
            {formatRelativeOccurredAt(event.occurredAt)}
          </span>
        </div>
      </div>

      {firmHref ? (
        <Link
          to={firmHref}
          className="digest-event-row__chevron"
          aria-label={`Open ${event.firmName ?? 'firm'}`}
          tabIndex={-1}
        >
          <i className="bi bi-chevron-right" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
