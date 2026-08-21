// StatusFilterBar — the counts ARE the filter (F50.2).
//
// What matters here: each count is stated exactly once, the subset diagnostics attach to their
// superset status, and the control is a real toggle group for assistive tech (`aria-pressed`), not
// four unrelated buttons.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { PEQueueCounts } from '@/types';
import StatusFilterBar from './StatusFilterBar';

const COUNTS: PEQueueCounts = { pending: 12, running: 0, completed: 340, failed: 3 };

function renderBar(props: Partial<React.ComponentProps<typeof StatusFilterBar>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <StatusFilterBar counts={COUNTS} active="pending" onChange={onChange} {...props} />,
  );
  return { ...utils, onChange };
}

function button(status: string) {
  return screen.getByRole('button', { name: new RegExp(`^${status}\\b`, 'i') });
}

describe('StatusFilterBar', () => {
  it('renders one button per status, in lifecycle order', () => {
    // Lifecycle order, not failure-first: these buttons carry the counts now, and the counts were
    // already read in this order. Asserted on the rendered output rather than on an exported
    // constant, so it pins what an operator actually sees.
    renderBar();
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    expect(labels).toEqual(['Pending 12', 'Running 0', 'Completed 340', 'Failed 3']);
  });

  it('states each count exactly once', () => {
    renderBar();
    expect(screen.getAllByText(/^Pending 12$/)).toHaveLength(1);
    expect(screen.getAllByText(/^Failed 3$/)).toHaveLength(1);
  });

  it('marks the active status pressed and the others not', () => {
    renderBar({ active: 'failed' });
    expect(button('failed')).toHaveAttribute('aria-pressed', 'true');
    expect(button('pending')).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the chosen status', async () => {
    const user = userEvent.setup();
    const { onChange } = renderBar();
    await user.click(button('completed'));
    expect(onChange).toHaveBeenCalledWith('completed');
  });

  it('attaches the subset diagnostics to their superset status', () => {
    // `retrying` counts PENDING jobs that already burnt a retry; `permanentFailures` counts FAILED
    // jobs a retry cannot help. Standing alone as their own badges they were uninterpretable.
    renderBar({ retrying: 4, permanentFailures: 2 });
    expect(button('pending')).toHaveTextContent(/4 retrying/i);
    expect(button('failed')).toHaveTextContent(/2 permanent/i);
    expect(button('running')).not.toHaveTextContent(/retrying|permanent/i);
  });

  it('hides a zero subset rather than printing "0 retrying"', () => {
    renderBar({ retrying: 0, permanentFailures: 0 });
    expect(screen.queryByText(/retrying/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/permanent/i)).not.toBeInTheDocument();
  });

  it('mutes a zero count instead of colouring it', () => {
    // A red "Failed 0" on a healthy queue is noise; this control exists to make an unhealthy queue
    // jump out. `running` is 0 in the fixture, `pending` is 12.
    renderBar();
    expect(button('running').className).toContain('btn-outline-secondary');
    expect(button('pending').className).toContain('btn-outline-warning');
    expect(button('failed').className).toContain('btn-outline-danger');
  });

  it('still marks the active status when its count is zero', () => {
    // The muting must not swallow the selection.
    renderBar({ active: 'running' });
    expect(button('running').className).toContain('active');
    expect(button('running')).toHaveAttribute('aria-pressed', 'true');
  });

  it('names the group so two bars on one screen are distinguishable', () => {
    renderBar({ label: 'Filter companies jobs by status' });
    expect(screen.getByRole('group', { name: /filter companies jobs by status/i })).toBeVisible();
  });

  it('has no axe violations', async () => {
    // Canvas is not implemented in jsdom; axe's colour-contrast rule needs it.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderBar({ retrying: 4, permanentFailures: 2 });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
