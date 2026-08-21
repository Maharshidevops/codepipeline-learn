// GlobalProgressTracker — the minimized progress chip in the sidebar (#sidebar-minimized-tracker
// from base.html, styled by sidebar.css incl. [data-finished="true"] + pulse). Reads progressStore;
// shown only while a process is active/finished. onMaximize re-opens the full ProgressModal (Phase 7).
import { useProgressStore } from '@/store/progressStore';

export interface GlobalProgressTrackerProps {
  onMaximize: () => void;
}

export default function GlobalProgressTracker({ onMaximize }: GlobalProgressTrackerProps) {
  const { processId, status, finished, overallPercentage, heading, currentStage } =
    useProgressStore();

  const active = processId !== null && status !== 'idle';
  const statusText = finished ? 'Completed' : heading || currentStage || 'Processing';
  const pct = Math.round(overallPercentage);

  return (
    <div
      id="sidebar-minimized-tracker"
      className={`sidebar-minimized-tracker${active ? '' : ' d-none'}`}
      data-finished={finished ? 'true' : 'false'}
    >
      <button
        className="minimized-tracker-maximize-btn"
        title="Maximize"
        type="button"
        onClick={onMaximize}
      >
        <i className="bi bi-arrows-fullscreen" aria-hidden="true" />
      </button>
      <div className="minimized-tracker-header">
        <h6 className="minimized-tracker-title">
          <span className="minimized-tracker-pulse" />
          <span id="minimized-tracker-status-text">{statusText}</span>
        </h6>
      </div>
      <span id="minimized-tracker-percentage" className="minimized-tracker-percentage">
        {pct}%
      </span>
      <div className="minimized-progress-bar-container">
        <div
          id="minimized-progress-bar-fill"
          className="minimized-progress-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
