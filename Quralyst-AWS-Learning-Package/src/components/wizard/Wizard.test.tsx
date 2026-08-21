// Wizard step-gating: advancing forward must pass onValidateStep; going back skips it.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Wizard, { type WizardStepDef } from './Wizard';

const STEPS: WizardStepDef[] = [
  { id: 'a', label: 'Attributes' },
  { id: 'b', label: 'Size & Geography' },
  { id: 'c', label: 'Review' },
];

function stepButtons() {
  // The stepper renders one <button> per step (in order).
  return screen.getAllByRole('button');
}

describe('Wizard', () => {
  it('blocks advancing forward when onValidateStep fails', async () => {
    const onStepChange = vi.fn();
    const onValidateStep = vi.fn().mockResolvedValue(false);
    const user = userEvent.setup();

    render(
      <Wizard steps={STEPS} current={1} onStepChange={onStepChange} onValidateStep={onValidateStep}>
        <div>body</div>
      </Wizard>,
    );

    // Click the forward (Review) step.
    await user.click(stepButtons()[2]);

    await waitFor(() => expect(onValidateStep).toHaveBeenCalledWith(1));
    expect(onStepChange).not.toHaveBeenCalled();
  });

  it('navigates back without validating', async () => {
    const onStepChange = vi.fn();
    const onValidateStep = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();

    render(
      <Wizard steps={STEPS} current={1} onStepChange={onStepChange} onValidateStep={onValidateStep}>
        <div>body</div>
      </Wizard>,
    );

    // Click the earlier (Attributes) step.
    await user.click(stepButtons()[0]);

    expect(onStepChange).toHaveBeenCalledWith(0);
    expect(onValidateStep).not.toHaveBeenCalled();
  });
});
