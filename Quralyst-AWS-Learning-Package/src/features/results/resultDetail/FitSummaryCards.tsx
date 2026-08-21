import type { FitBucket, FitFilter } from './types';
import { FIT_META } from './fitUtils';

export default function FitSummaryCards({
  counts,
  filter,
  onFilter,
}: {
  counts: Record<FitBucket, number>;
  filter: FitFilter;
  onFilter: (f: FitFilter) => void;
}) {
  const cards: { key: FitFilter; label: string; count: number; className: string }[] = [
    { key: 'fit', label: FIT_META.fit.label, count: counts.fit, className: FIT_META.fit.className },
    {
      key: 'partial',
      label: FIT_META.partial.label,
      count: counts.partial,
      className: FIT_META.partial.className,
    },
    { key: 'no', label: FIT_META.no.label, count: counts.no, className: FIT_META.no.className },
  ];

  return (
    <div className="rd-fit-cards mb-0">
      {cards.map((c) => {
        const active = filter === c.key;
        return (
          <button
            key={c.key}
            type="button"
            className={`rd-fit-card d-flex flex-column justify-content-between ${active ? 'is-active' : ''}`}
            onClick={() => onFilter(active ? 'all' : c.key)}
            aria-pressed={active}
          >
            <div className={`rd-fit-badge rd-fit-badge--${c.key} align-self-start mb-2`}>
              {c.label}
            </div>
            <div className="rd-fit-card__count">{c.count}</div>
          </button>
        );
      })}
    </div>
  );
}
