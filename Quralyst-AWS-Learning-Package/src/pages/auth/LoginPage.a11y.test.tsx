// LoginPage axe audit (Phase 35 a11y automation): render the full login surface (auth shell +
// form + Google button) and assert zero axe-core violations.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import LoginPage from './LoginPage';

describe('LoginPage a11y', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
