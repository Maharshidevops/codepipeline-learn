// WizardNavBar — sticky bottom bar (Wizard.css): navy "Step X of N" pill + step label on the left;
// back arrow (steps 2+) + Save Draft + forward button on the right.
export interface WizardNavBarProps {
  stepIndex: number; // 0-based
  stepCount: number;
  label: string;
  onBack?: () => void; // omit/undefined on the first step
  onSaveDraft: () => void;
  onNext: () => void;
  nextLabel: string; // 'Next →' / 'Continue To review →' / 'Generate List →'
  nextDisabled?: boolean; // gate the forward button (e.g. while API keys are being verified)
  nextNote?: string; // small hint shown beside a disabled forward button
}

export default function WizardNavBar({
  stepIndex,
  stepCount,
  label,
  onBack,
  onSaveDraft,
  onNext,
  nextLabel,
  nextDisabled = false,
  nextNote,
}: WizardNavBarProps) {
  return (
    <div className="wizard-navbar">
      <div className="wizard-navbar-left">
        <span className="wizard-step-pill">
          Step {stepIndex + 1} of {stepCount}
        </span>
        <span className="wizard-step-pill-label">{label}</span>
      </div>
      <div className="wizard-navbar-right">
        {nextDisabled && nextNote && <span className="text-muted small me-2">{nextNote}</span>}
        {onBack && (
          <button type="button" className="wizard-back-btn" aria-label="Back" onClick={onBack}>
            ←
          </button>
        )}
        <button type="button" className="wizard-save-draft" onClick={onSaveDraft}>
          Save Draft
        </button>
        <button type="button" className="btn btn-standard" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
