export function ScoreBar({ label, value }: { label: string; value?: number | null }) {
  if (value == null || Number.isNaN(value)) return null;
  const pct = Math.max(0, Math.min(100, value > 10 ? value : value * 10));
  return (
    <div className="d-flex align-items-center gap-2 mb-1">
      <span className="small text-muted flex-shrink-0" style={{ width: 80 }}>
        {label}
      </span>
      <div className="progress flex-grow-1" style={{ height: 6 }}>
        <div
          className="progress-bar"
          style={{ width: `${pct}%`, backgroundColor: '#282561' }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="small fw-semibold text-end tabular-nums" style={{ width: 32 }}>
        {value}
      </span>
    </div>
  );
}
