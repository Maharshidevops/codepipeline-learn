// StatusFilterBar — the queue status counts ARE the status filter.
//
// Before this, every queue view stated the four counts twice: once as read-only badges
// ("Pending 12  Running 0  Completed 1  Failed 0") and again, immediately below, as a separate row
// of filter buttons ("failed | pending | running | completed"). One control now does both jobs.
//
// Two deliberate choices:
//   * lifecycle order (pending → running → completed → failed), not failure-first. The counts are
//     what an operator scans, and they were already displayed in this order — the filter row's old
//     failure-first order only made sense when it carried no numbers.
//   * the diagnostic numbers are folded into the status they belong to rather than trailing as
//     extra badges: `retrying` is a SUBSET of pending (pending jobs that already burnt a retry)
//     and `permanentFailures` a subset of failed, so neither means anything standing alone.
import type { PEQueueCounts, PEScrapeJobStatus } from '@/types';

/** Lifecycle order — see the header note on why this is not failure-first. Deliberately not
 *  exported: nothing else needs it, and a second export here would cost the file fast refresh. */
const STATUS_ORDER: PEScrapeJobStatus[] = ['pending', 'running', 'completed', 'failed'];

const LABEL: Record<PEScrapeJobStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

const TONE: Record<PEScrapeJobStatus, string> = {
  pending: 'warning',
  running: 'info',
  completed: 'success',
  failed: 'danger',
};

export interface StatusFilterBarProps {
  /** All-status counts. Must NOT be scoped to `active` — every button reports its own total. */
  counts: PEQueueCounts;
  active: PEScrapeJobStatus;
  onChange: (status: PEScrapeJobStatus) => void;
  /** Pending jobs that have already spent a retry. Subset of `counts.pending`. */
  retrying?: number;
  /** Failures a retry cannot help. Subset of `counts.failed`. */
  permanentFailures?: number;
  /** Accessible name for the group — distinguishes the per-queue bar from the fleet-wide one. */
  label?: string;
}

export default function StatusFilterBar({
  counts,
  active,
  onChange,
  retrying = 0,
  permanentFailures = 0,
  label = 'Filter jobs by status',
}: StatusFilterBarProps) {
  const subsetNote = (status: PEScrapeJobStatus): string | null => {
    if (status === 'pending' && retrying > 0) return `${retrying} retrying`;
    if (status === 'failed' && permanentFailures > 0) return `${permanentFailures} permanent`;
    return null;
  };

  return (
    <div className="status-filter-bar" role="group" aria-label={label}>
      {STATUS_ORDER.map((status) => {
        const count = counts[status];
        const note = subsetNote(status);
        const isSelected = status === active;
        const tone = count === 0 ? 'secondary' : TONE[status];
        return (
          <button
            key={status}
            type="button"
            className={`btn btn-sm btn-outline-${tone} status-filter-btn status-filter-btn--${status}${
              isSelected ? ' active is-active' : ''
            }`}
            aria-pressed={isSelected}
            onClick={() => onChange(status)}
          >
            {LABEL[status]} {count}
            {note && <span className="status-filter-btn__note"> · {note}</span>}
          </button>
        );
      })}
    </div>
  );
}
