// Wizard — renders the numbered stepper (Wizard.css) + the current step's body. Step navigation is
// validated via onValidateStep (returns false to block advancing). Consumed by all 3 process pages
// in Phase 7; the body content for the active step is passed as children.
import { Fragment, type ReactNode } from 'react';
import { withViewTransition } from '@/lib/viewTransition';
import './Wizard.css';

export interface WizardStepDef {
  id: string;
  label: string;
}

export interface WizardProps {
  steps: WizardStepDef[];
  current: number; // 0-based active step index
  onStepChange: (index: number) => void;
  onValidateStep: (index: number) => Promise<boolean>;
  children: ReactNode; // active step body
}

export default function Wizard({
  steps,
  current,
  onStepChange,
  onValidateStep,
  children,
}: WizardProps) {
  // Clicking a completed step jumps back; advancing forward must pass validation of the current step.
  // Step swaps animate via the View Transitions API where supported (Phase 36) — pure enhancement.
  const goto = async (target: number) => {
    if (target === current) return;
    if (target < current) {
      withViewTransition(() => onStepChange(target));
      return;
    }
    const ok = await onValidateStep(current);
    if (ok) withViewTransition(() => onStepChange(target));
  };

  return (
    <div>
      {/* Stepper sits in its own white container (Phase: wizard polish) so the wizard chrome matches
          the white step cards below it. */}
      <div className="wizard-stepper-card">
        <div className="wizard-stepper">
          {steps.map((step, i) => (
            <Fragment key={step.id}>
              <button
                type="button"
                className={`wizard-step-node btn-unstyled${i === current ? ' active' : ''}${
                  i < current ? ' done' : ''
                }`}
                onClick={() => void goto(i)}
                aria-current={i === current ? 'step' : undefined}
              >
                <span className="wizard-step-circle">
                  {i < current ? <i className="bi bi-check-lg" aria-hidden="true" /> : i + 1}
                </span>
                <span className="wizard-step-num">Step {i + 1}</span>
                <span className="wizard-step-label">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <span className={`wizard-step-connector${i < current ? ' done' : ''}`} />
              )}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="wizard-body">{children}</div>
    </div>
  );
}
