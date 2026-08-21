// ReviewSummary — Step-3 read-only summary (Wizard.css). One card per section with a label/value
// list and an "Edit" link that jumps the wizard back to that section. The single Generate action
// lives in the WizardNavBar (no submit button here — it used to duplicate the navbar's).
import { type ReactNode } from 'react';

export interface ReviewRow {
  label: string;
  value: ReactNode;
}

export interface ReviewSection {
  title: string;
  icon?: string; // Bootstrap/FA icon class
  onEdit: () => void;
  rows: ReviewRow[];
}

export interface ReviewSummaryProps {
  sections: ReviewSection[];
}

export default function ReviewSummary({ sections }: ReviewSummaryProps) {
  return (
    <div className="review-summary">
      {sections.map((section, i) => (
        <div key={i} className="review-section">
          <div className="review-section-header">
            <h4 className="review-section-title">
              {section.icon && <i className={section.icon} aria-hidden="true" />}
              {section.title}
            </h4>
            <button type="button" className="review-edit-link" onClick={section.onEdit}>
              Edit
            </button>
          </div>
          {section.rows.map((row, j) => (
            <div key={j} className="review-row">
              <span className="review-row-label">{row.label}</span>
              <span className="review-row-value">{row.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
