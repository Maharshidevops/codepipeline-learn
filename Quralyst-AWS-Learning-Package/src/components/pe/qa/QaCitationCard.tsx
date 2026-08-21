// Citation card for Ask-the-Market (F39.2) — numbered chip + type icon + nested evidence.
// Visual parity with QURALYST-20 MarketQa CitationCard (indigo index + tinted type discs).
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { QaCitation, QaCitationType } from '@/types';

const CITATION_META: Record<QaCitationType, { icon: string; label: string }> = {
  firm: { icon: 'bi-building', label: 'Firm' },
  holding: { icon: 'bi-briefcase', label: 'Holding' },
  person: { icon: 'bi-person', label: 'Person' },
  event: { icon: 'bi-activity', label: 'Event' },
};

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function CitationAnchor({
  citation,
  className,
  children,
}: {
  citation: Pick<QaCitation, 'href'>;
  className?: string;
  children: ReactNode;
}) {
  if (isExternal(citation.href)) {
    return (
      <a href={citation.href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={citation.href} className={className}>
      {children}
    </Link>
  );
}

export function QaCitationCard({ citation, index }: { citation: QaCitation; index: number }) {
  const meta = CITATION_META[citation.type] ?? CITATION_META.firm;
  const external = isExternal(citation.href);
  const typeClass = `qa-citation__type qa-citation__type--${citation.type in CITATION_META ? citation.type : 'firm'}`;

  return (
    <div className="qa-citation" data-testid="qa-citation">
      <CitationAnchor citation={citation} className="qa-citation__link">
        <div className="qa-citation__meta">
          <span className="qa-citation__index" aria-label={`Citation ${index}`}>
            {index}
          </span>
          <span className={typeClass} title={meta.label}>
            <i className={`bi ${meta.icon}`} aria-hidden />
          </span>
        </div>
        <div className="qa-citation__body">
          <div className="qa-citation__title-row">
            <span className="qa-citation__label">{citation.label}</span>
            {external ? (
              <i className="bi bi-box-arrow-up-right qa-citation__external" aria-hidden />
            ) : (
              <i className="bi bi-chevron-right qa-citation__chevron" aria-hidden />
            )}
          </div>
          {citation.sublabel ? (
            <div className="qa-citation__sublabel">{citation.sublabel}</div>
          ) : null}
          {citation.detail ? <div className="qa-citation__detail">{citation.detail}</div> : null}
        </div>
      </CitationAnchor>
      {citation.evidence && citation.evidence.length > 0 ? (
        <div className="qa-citation__evidence">
          {citation.evidence.map((ev) => (
            <CitationAnchor
              key={`${ev.type}-${ev.id}`}
              citation={ev}
              className="qa-citation__evidence-link"
            >
              <span className="qa-citation__evidence-label">{ev.label}</span>
              {ev.detail ? <span className="qa-citation__evidence-detail">{ev.detail}</span> : null}
            </CitationAnchor>
          ))}
        </div>
      ) : null}
    </div>
  );
}
