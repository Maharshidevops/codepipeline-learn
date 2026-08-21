// Comparable past deal note (Tier A / A5). A subtle blue info box that surfaces, on a result row's
// detail panel, a genuinely-comparable settled deal from this org's outcome history — e.g. "Same
// sector (IT Services) as Acme Corp, which you closed/won." The backend only attaches a match when
// there is real sector/keyword overlap (it never fabricates), so rendering is a plain presence check:
// nothing shows when there is no comparable.
import type { ComparableDeal } from './types';

export default function ComparableDealNote({ comparable }: { comparable?: ComparableDeal | null }) {
  if (!comparable?.why) return null;
  return (
    <div className="mb-4">
      <div
        className="d-flex align-items-start gap-2 p-3 rounded-3 small"
        style={{
          background: 'rgba(13,110,253,0.08)',
          border: '1px solid rgba(13,110,253,0.25)',
          color: '#0a58ca',
        }}
        role="note"
      >
        <i className="bi bi-clock-history mt-1" aria-hidden="true" />
        <div>
          <strong>Comparable past deal:</strong> {comparable.why}
        </div>
      </div>
    </div>
  );
}
