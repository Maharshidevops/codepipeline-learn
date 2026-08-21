// Single Activity feed row — port of Replit Changes.tsx ChangeItem.
// Company name is plain text; firm link + relative time below; chevron → firm when holdingId exists.
import { Link } from 'react-router-dom';
import { paths } from '@/routes/paths';
import type { PEChangeRow } from '@/types';
import { ChangeTypeBadge } from './ChangeBadges';
import { CHANGE_META, formatAbsoluteDetectedAt, formatRelativeDetectedAt } from './changeMeta';

export function ChangeItem({ change }: { change: PEChangeRow }) {
  const meta = CHANGE_META[change.changeType];
  const firmHref = paths.pe.firm(change.firmId);

  return (
    <div className="pea-item group" data-testid="change-row" data-type={change.changeType}>
      <div className={`pea-item__icon pea-item__icon--${meta.tone}`} aria-hidden="true">
        <i className={`bi ${meta.icon}`} />
      </div>

      <div className="pea-item__body">
        <div className="pea-item__title-row">
          <span className="pea-item__company">{change.companyName}</span>
          <ChangeTypeBadge changeType={change.changeType} />
        </div>

        <p className="pea-item__desc">{meta.description(change)}</p>

        <div className="pea-item__meta">
          <Link to={firmHref} className="pea-item__firm">
            <i className="bi bi-building" aria-hidden="true" />
            {change.firmName}
          </Link>
          <span className="pea-item__time" title={formatAbsoluteDetectedAt(change.detectedAt)}>
            {formatRelativeDetectedAt(change.detectedAt)}
          </span>
        </div>
      </div>

      {change.holdingId && (
        <Link to={firmHref} className="pea-item__chevron" aria-label={`Open ${change.companyName}`}>
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
