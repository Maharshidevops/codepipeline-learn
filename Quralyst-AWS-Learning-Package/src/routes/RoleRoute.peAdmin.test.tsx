// RoleRoute pe_admin gating (F28.2 DoD): the /pe/admin operator console is STAFF-ONLY — it must
// NOT open for a mere pe:dataset grant-holder, only for staff (isAdmin / an explicit pe:admin map
// entry). Exercises the real can('pe:admin') wiring.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoleRoute from './RoleRoute';
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
    <MemoryRouter initialEntries={['/pe/admin']}>
      <Routes>
        {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role attribute. */}
        <Route element={<RoleRoute role="pe_admin" />}>
          <Route path="/pe/admin" element={<div>PE ADMIN OUTLET</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => useAuthStore.setState({ currentUser: null, isAuthenticated: false }));

describe('RoleRoute role="pe_admin"', () => {
  it('renders the outlet for staff (legacy fallback, no map)', () => {
    useAuthStore.setState({ currentUser: { ...base, isAdmin: true }, isAuthenticated: true });
    renderGate();
    expect(screen.getByText('PE ADMIN OUTLET')).toBeInTheDocument();
  });

  it('renders the outlet for an explicit pe:admin map entry', () => {
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:admin': true } },
      isAuthenticated: true,
    });
    renderGate();
    expect(screen.getByText('PE ADMIN OUTLET')).toBeInTheDocument();
  });

  it('shows Forbidden for a pe:dataset grant-holder who is NOT staff', () => {
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderGate();
    expect(screen.queryByText('PE ADMIN OUTLET')).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });

  it('shows Forbidden for a plain user', () => {
    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    renderGate();
    expect(screen.queryByText('PE ADMIN OUTLET')).not.toBeInTheDocument();
  });
});
