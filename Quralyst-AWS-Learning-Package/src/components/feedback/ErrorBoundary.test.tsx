// ErrorBoundary: a throwing child renders the fallback (not a crash); reset() re-renders children.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders the default fallback when a child throws', () => {
    // Silence the expected React error log for this assertion.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('recovers via the custom fallback reset()', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Child throws on first render; flipping the flag (then reset) lets the subtree render cleanly.
    let shouldStopThrowing = false;
    function Flaky() {
      if (!shouldStopThrowing) throw new Error('boom');
      return <div>recovered</div>;
    }

    render(
      <ErrorBoundary fallback={(reset) => <button onClick={reset}>retry</button>}>
        <Flaky />
      </ErrorBoundary>,
    );

    expect(screen.getByText('retry')).toBeInTheDocument();
    shouldStopThrowing = true;
    await userEvent.click(screen.getByText('retry'));
    expect(screen.getByText('recovered')).toBeInTheDocument();
    spy.mockRestore();
  });
});
