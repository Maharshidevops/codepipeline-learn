// RoleRoute gating for /pe/action-queue (F64 unit 6): the queue view moved to its own page, and
// the gate MUST NOT have widened on the way. It exposes cross-firm operational data and carries
// destructive requeue / purge / pause controls, so it stays staff-only — a pe:dataset grant-holder
// gets Forbidden exactly as they do for /pe/admin.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoleRoute from './RoleRoute';
import { paths } from './paths';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

const base: User = {
  id: 'u1',
  email: 'a@b.c',
  profile: {},
  orgRole: 'member',
  isAdmin: false,
  isAuthenticated: true,
  hasPassword: true,
};

function renderGate() {
  return render(
    <MemoryRouter initialEntries={[paths.pe.actionQueue]}>
      <Routes>
        {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role attribute. */}
        <Route element={<RoleRoute role="pe_admin" />}>
          <Route path={paths.pe.actionQueue} element={<div>ACTION QUEUE OUTLET</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => useAuthStore.setState({ currentUser: null, isAuthenticated: false }));

describe('RoleRoute for /pe/action-queue', () => {
  it('renders for staff', () => {
    useAuthStore.setState({ currentUser: { ...base, isAdmin: true }, isAuthenticated: true });
    renderGate();
    expect(screen.getByText('ACTION QUEUE OUTLET')).toBeInTheDocument();
  });

  it('renders for an explicit pe:admin map entry', () => {
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:admin': true } },
      isAuthenticated: true,
    });
    renderGate();
    expect(screen.getByText('ACTION QUEUE OUTLET')).toBeInTheDocument();
  });

  it('shows Forbidden for a pe:dataset grant-holder who is NOT staff', () => {
    // The whole point of pinning this: moving a panel to its own route is exactly the kind of
    // change that quietly relaxes a gate.
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderGate();
    expect(screen.queryByText('ACTION QUEUE OUTLET')).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });
});
