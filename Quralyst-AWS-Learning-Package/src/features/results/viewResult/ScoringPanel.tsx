// ScoringPanel — the collapsible "How Scoring Works" panel. Copy is rendered VERBATIM from
// Backup/templates/quralyst_research/view_previous_result.html (lines 351-406). The legacy page
// animates max-height on a `.scoring-collapsible` element and rotates a chevron via `.rotated`;
// here we drive `is-open` + the explicit max-height (scrollHeight) the same way the template's
// inline script did, and toggle `aria-expanded` on the button.
import { useEffect, useRef, useState } from 'react';

export default function ScoringPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mirror the template script: closed => max-height 0; open => scrollHeight.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.maxHeight = open ? `${panel.scrollHeight}px` : '0px';
  }, [open]);

  return (
    <div className="criteria-card criteria-card--white">
      <button
        type="button"
        className="scoring-toggle-btn"
        id="scoring-toggle-btn"
        aria-expanded={open}
        aria-controls="scoring-details-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <h4>
          <i className="bi bi-calculator me-2" />
          How Scoring Works
        </h4>
        <i
          className={`bi bi-chevron-down scoring-toggle-icon${open ? ' rotated' : ''}`}
          id="scoring-toggle-icon"
        />
      </button>
      <div
        ref={panelRef}
        className={`applied-filters-section scoring-collapsible${open ? ' is-open' : ''}`}
        id="scoring-details-panel"
      >
        <p className="mb-2">
          Quralyst calculates each row using four visible score columns:{' '}
          <strong>Business Score</strong>, <strong>Geography Score</strong>,{' '}
          <strong>Size Scores</strong>, and the final <strong>Score</strong>.
        </p>
        <ul className="mb-2 ps-3">
          <li>
            <strong>Business Score (0-100):</strong> Measures how well the company matches your
            business query
          </li>
          <li>
            <strong>Geography Score (0-100):</strong> Measures location match against your selected
            city/state/country criteria.
          </li>
          <li>
            <strong>Size Scores (0-100):</strong> Uses employee and revenue criteria with your
            selected AND/OR logic.
          </li>
          <li>
            <strong>Final Score (0-100):</strong> Weighted blend of active criteria only.
          </li>
        </ul>
        <p className="mb-1">
          <strong>Final score weighting:</strong>
        </p>
        <ul className="mb-2 ps-3">
          <li>If all 3 criteria are active: Business 50%, Size 25%, Geography 25%.</li>
          <li>If 2 criteria are active: 50% / 50% split between those two active criteria.</li>
          <li>If only 1 criterion is active: Final Score mirrors that single score.</li>
        </ul>
        <p className="mb-1">
          <strong>Simple math formula:</strong>
        </p>
        <ul className="mb-2 ps-3">
          <li>
            <strong>Final Score</strong> = (Business Score x Business Weight) + (Size Score x Size
            Weight) + (Geography Score x Geography Weight)
          </li>
          <li>Only active criteria are used (inactive criteria weight is 0).</li>
        </ul>
        <p className="mb-1">
          <strong>Example (all 3 criteria active):</strong>
        </p>
        <ul className="mb-2 ps-3">
          <li>Business Score = 80, Size Scores = 60, Geography Score = 100</li>
          <li>Final Score = (80 x 0.50) + (60 x 0.25) + (100 x 0.25)</li>
          <li>
            Final Score = 40 + 15 + 25 = <strong>80</strong>
          </li>
        </ul>
        <p className="mb-1">
          <strong>Size Score math :</strong>
        </p>
        <ul className="mb-2 ps-3">
          <li>
            Size Score uses employee and revenue filters, then checks if each one passes your
            limits.
          </li>
          <li>
            If both fail, Size Score = <strong>0</strong>.
          </li>
          <li>
            With <strong>AND</strong> logic: one pass falls in <strong>25-50</strong>, both pass
            falls in <strong>50-100</strong>.
          </li>
          <li>
            With <strong>OR</strong> logic: one pass falls in <strong>50-75</strong>, both pass
            falls in <strong>75-100</strong>.
          </li>
          <li>
            Inside each band, values closer to your target range get a higher number (lower edge
            gives lower score, higher/progressing match gives higher score).
          </li>
        </ul>
        <p className="mb-1">
          <strong>Size Score example:</strong>
        </p>
        <ul className="mb-2 ps-3">
          <li>Filters: Employees 50-150 and Revenue 5-20 ($M), logic = AND.</li>
          <li>
            Company has 120 employees and 15 revenue: both pass, so score is in the 50-100 band.
          </li>
          <li>
            If progress inside that band is ~0.70, Size Score = 50 + (0.70 x 50) ={' '}
            <strong>85</strong>.
          </li>
        </ul>
        <p className="mb-0 text-muted">
          Note: Scores are shown on a 0-100 scale and are recalculated from the selected filters
          used for this result.
        </p>
      </div>
    </div>
  );
}
