// RoleRoute pe_dataset gating (F23.5 §4.1 / F23.4 DoD): staff and grant-holders see the
// PE outlet; a plain user gets ForbiddenPage. Exercises the real can('pe:dataset') wiring.
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
    <MemoryRouter initialEntries={['/pe/firms']}>
      <Routes>
        {/* eslint-disable-next-line jsx-a11y/aria-role -- `role` here is RoleRoute's authorization-flag prop, not the ARIA role attribute (same suppression as routes/router.tsx). */}
        <Route element={<RoleRoute role="pe_dataset" />}>
          <Route path="/pe/firms" element={<div>PE FIRMS OUTLET</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => useAuthStore.setState({ currentUser: null, isAuthenticated: false }));

describe('RoleRoute role="pe_dataset"', () => {
  it('renders the outlet for a user with the pe:dataset grant', () => {
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderGate();
    expect(screen.getByText('PE FIRMS OUTLET')).toBeInTheDocument();
  });

  it('renders the outlet for staff (legacy fallback, no map)', () => {
    useAuthStore.setState({ currentUser: { ...base, isAdmin: true }, isAuthenticated: true });
    renderGate();
    expect(screen.getByText('PE FIRMS OUTLET')).toBeInTheDocument();
  });

  it('shows Forbidden for a plain user without the grant', () => {
    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    renderGate();
    expect(screen.queryByText('PE FIRMS OUTLET')).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });

  it('gates the holdings route the same way (F24.3)', () => {
    const renderHoldingsGate = () =>
      render(
        <MemoryRouter initialEntries={['/pe/holdings']}>
          <Routes>
            {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role. */}
            <Route element={<RoleRoute role="pe_dataset" />}>
              <Route path="/pe/holdings" element={<div>PE HOLDINGS OUTLET</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    const { unmount } = renderHoldingsGate();
    expect(screen.queryByText('PE HOLDINGS OUTLET')).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderHoldingsGate();
    expect(screen.getByText('PE HOLDINGS OUTLET')).toBeInTheDocument();
  });

  it('gates the screener route the same way (F29.2)', () => {
    const renderScreenerGate = () =>
      render(
        <MemoryRouter initialEntries={['/pe/screener']}>
          <Routes>
            {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role. */}
            <Route element={<RoleRoute role="pe_dataset" />}>
              <Route path="/pe/screener" element={<div>PE SCREENER OUTLET</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    const { unmount } = renderScreenerGate();
    expect(screen.queryByText('PE SCREENER OUTLET')).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderScreenerGate();
    expect(screen.getByText('PE SCREENER OUTLET')).toBeInTheDocument();
  });

  it('gates the exit-watch route the same way (F30.2)', () => {
    const renderExitWatchGate = () =>
      render(
        <MemoryRouter initialEntries={['/pe/exit-watch']}>
          <Routes>
            {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role. */}
            <Route element={<RoleRoute role="pe_dataset" />}>
              <Route path="/pe/exit-watch" element={<div>PE EXIT WATCH OUTLET</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    const { unmount } = renderExitWatchGate();
    expect(screen.queryByText('PE EXIT WATCH OUTLET')).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderExitWatchGate();
    expect(screen.getByText('PE EXIT WATCH OUTLET')).toBeInTheDocument();
  });

  it('gates the changes route the same way (F31.2)', () => {
    const renderChangesGate = () =>
      render(
        <MemoryRouter initialEntries={['/pe/changes']}>
          <Routes>
            {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role. */}
            <Route element={<RoleRoute role="pe_dataset" />}>
              <Route path="/pe/changes" element={<div>PE CHANGES OUTLET</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    const { unmount } = renderChangesGate();
    expect(screen.queryByText('PE CHANGES OUTLET')).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderChangesGate();
    expect(screen.getByText('PE CHANGES OUTLET')).toBeInTheDocument();
  });

  it('gates the analysis route the same way (F32.2)', () => {
    const renderAnalysisGate = () =>
      render(
        <MemoryRouter initialEntries={['/pe/analysis']}>
          <Routes>
            {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role. */}
            <Route element={<RoleRoute role="pe_dataset" />}>
              <Route path="/pe/analysis" element={<div>PE ANALYSIS OUTLET</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    const { unmount } = renderAnalysisGate();
    expect(screen.queryByText('PE ANALYSIS OUTLET')).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderAnalysisGate();
    expect(screen.getByText('PE ANALYSIS OUTLET')).toBeInTheDocument();
  });

  it('gates the talent-flow route the same way (F33.2)', () => {
    const renderTalentFlowGate = () =>
      render(
        <MemoryRouter initialEntries={['/pe/talent-flow']}>
          <Routes>
            {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role. */}
            <Route element={<RoleRoute role="pe_dataset" />}>
              <Route path="/pe/talent-flow" element={<div>PE TALENT FLOW OUTLET</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    const { unmount } = renderTalentFlowGate();
    expect(screen.queryByText('PE TALENT FLOW OUTLET')).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderTalentFlowGate();
    expect(screen.getByText('PE TALENT FLOW OUTLET')).toBeInTheDocument();
  });

  it('gates the IB directory route the same way (F34.4 — same pe:dataset grant)', () => {
    const renderIbGate = () =>
      render(
        <MemoryRouter initialEntries={['/ib']}>
          <Routes>
            {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role. */}
            <Route element={<RoleRoute role="pe_dataset" />}>
              <Route path="/ib" element={<div>IB BANKS OUTLET</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    const { unmount } = renderIbGate();
    expect(screen.queryByText('IB BANKS OUTLET')).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderIbGate();
    expect(screen.getByText('IB BANKS OUTLET')).toBeInTheDocument();
  });

  it('gates the people route the same way (F25.3)', () => {
    const renderPeopleGate = () =>
      render(
        <MemoryRouter initialEntries={['/pe/people']}>
          <Routes>
            {/* eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization-flag prop, not the ARIA role. */}
            <Route element={<RoleRoute role="pe_dataset" />}>
              <Route path="/pe/people" element={<div>PE PEOPLE OUTLET</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    const { unmount } = renderPeopleGate();
    expect(screen.queryByText('PE PEOPLE OUTLET')).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    renderPeopleGate();
    expect(screen.getByText('PE PEOPLE OUTLET')).toBeInTheDocument();
  });
});
