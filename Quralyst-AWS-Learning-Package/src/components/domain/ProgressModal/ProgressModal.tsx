// ProgressModal — app-wide progress overlay (#progress-alert), verbatim port of the markup in
// quralyst_research.html + progress-modal.css. Pure renderer of progressStore: cycling heading /
// image / summary (whitelisted copy, fade transitions), linear bar + percentage, file stats, and
// Minimize / Stop actions. Stream lifecycle lives in useProgressStream's controller.
import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '@/store/progressStore';
import { minimizeProgress, stopProgress } from '@/hooks/useProgressStream';
import './progress-modal.css';

// Whitelisted cycling copy — never exposes raw stage keys (the STRICT_PROGRESS_COPY_CONFIG idea).
const CYCLING_COPY: { heading: string; summary: string }[] = [
  {
    heading: 'Good things take a second.',
    summary:
      'Quralyst pulls together complete, context-rich buyer and target lists so you get more time ' +
      'for the work that actually moves deals forward.',
  },
  {
    heading: 'Casting a wide net.',
    summary:
      'We search multiple data sources in parallel to surface companies that match your exact ' +
      'criteria — not just the obvious ones.',
  },
  {
    heading: 'Quality over quantity.',
    summary:
      'Every candidate is scored against your business, size and geography filters so your final ' +
      'list is ranked by genuine fit.',
  },
  {
    heading: 'Almost there.',
    summary:
      'Enriching each company with contacts, news and ownership details to make your outreach ' +
      'effortless.',
  },
];

const IMAGE_COUNT = 4;
const CYCLE_MS = 4000;
const FADE_MS = 400;

export default function ProgressModal() {
  const { processId, status, minimized, finished, overallPercentage, summary, fileStatsText } =
    useProgressStore();

  const [copyIndex, setCopyIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = processId !== null && status !== 'idle' && !minimized;

  // Cycle heading/summary + image with a fade-out → swap → fade-in, like the legacy manager.
  useEffect(() => {
    if (!open || finished) return;
    const interval = window.setInterval(() => {
      setFading(true);
      fadeTimer.current = setTimeout(() => {
        setCopyIndex((i) => (i + 1) % CYCLING_COPY.length);
        setImageIndex((i) => (i + 1) % IMAGE_COUNT);
        setFading(false);
      }, FADE_MS);
    }, CYCLE_MS);
    return () => {
      window.clearInterval(interval);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [open, finished]);

  if (!open) return null;

  const pct = Math.round(overallPercentage);
  const copy = CYCLING_COPY[copyIndex];
  const fadeClass = fading ? 'cycling-fade-out' : 'cycling-fade-in';

  return (
    <div
      id="progress-alert"
      className={`progress-modal${finished ? ' completed' : ''}`}
      role="alert"
    >
      <div className="progress-modal-content">
        <div className="progress-heading-container">
          <h3 id="progress-cycling-heading" className={`progress-cycling-heading ${fadeClass}`}>
            {finished ? 'All done!' : copy.heading}
          </h3>
        </div>

        <div className="progress-image-container">
          <img
            id="progress-cycling-image"
            className={`progress-cycling-image ${fadeClass}`}
            src={`/images/progress_modal/${imageIndex + 1}.png`}
            alt="Processing illustration"
          />
        </div>

        <div className="progress-summary-container">
          <p id="progress-cycling-summary" className={`progress-cycling-summary ${fadeClass}`}>
            {finished ? 'Your list is ready. Taking you to your results…' : copy.summary}
          </p>
        </div>

        <div className="progress-linear-section">
          <div className="progress-percentage-label">
            <span id="progress-percentage" className="percentage-text">
              {pct}%
            </span>
          </div>
          <div className="progress-bar-container">
            <div
              id="progress-bar-fill"
              className="progress-bar-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="progress-log-section">
          <div id="progress-log-subtitle" className="progress-log-subtitle" aria-live="polite">
            {summary}
          </div>
        </div>

        <div id="file-stats-section" className="file-stats-section d-none">
          <span
            id="file-stats-text"
            className="file-stats-text"
            style={{ display: fileStatsText ? 'inline' : 'none' }}
          >
            {fileStatsText}
          </span>
        </div>

        <div className="progress-actions">
          <button
            id="minimize-processing-btn"
            className="btn btn-standard btn-minimize-processing"
            type="button"
            title="Minimize to sidebar"
            onClick={minimizeProgress}
          >
            <i className="bi bi-dash-square me-1" aria-hidden="true" />
            Minimize
          </button>
          {!finished && (
            <button
              id="stop-processing-btn"
              className="btn btn-standard btn-stop-processing"
              type="button"
              title="Stop Processing"
              onClick={stopProgress}
            >
              <i className="bi bi-stop-circle me-1" aria-hidden="true" />
              Stop Processing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
