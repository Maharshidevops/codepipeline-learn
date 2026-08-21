// FaqPage axe audit (Phase 35 a11y automation): the accordion (role="button" + tabIndex +
// aria-expanded question rows) and the section nav must produce zero axe-core violations,
// both in the default state and with an item toggled closed.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import FaqPage from './FaqPage';

describe('FaqPage a11y', () => {
  it('has no axe violations in the default accordion state', async () => {
    const { container } = render(<FaqPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations after toggling the open item', async () => {
    const user = userEvent.setup();
    const { container } = render(<FaqPage />);

    // First question is open by default; close it so every item is collapsed.
    const questions = screen.getAllByRole('button', { expanded: true });
    await user.click(questions[0]);

    expect(await axe(container)).toHaveNoViolations();
  });
});
