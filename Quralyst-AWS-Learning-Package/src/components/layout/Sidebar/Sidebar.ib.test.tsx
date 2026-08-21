// Sidebar — PE / IB / Research vertical switcher (Replit-style). IB destinations are shown when the
// IB vertical is active; pe:dataset still gates the live PE/IB pages via RoleRoute.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/authStore';
import { VERTICAL_STORAGE_KEY } from './sidebarNav';
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

function renderSidebar(initialEntry = '/process-preference') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Sidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  try {
    localStorage.removeItem(VERTICAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
});

afterEach(() => useAuthStore.setState({ currentUser: null, isAuthenticated: false }));

describe('Sidebar — Replit vertical switcher', () => {
  it('shows PE / IB / Research tabs for an authenticated user', () => {
    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    renderSidebar();
    expect(screen.getByRole('tab', { name: /PE/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /IB/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Research/i })).toBeInTheDocument();
  });

  it('shows Research Home nav when Research vertical is active', () => {
    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    localStorage.setItem(VERTICAL_STORAGE_KEY, 'research');
    renderSidebar('/process-preference');
    expect(screen.getByLabelText('Research Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous Results')).toBeInTheDocument();
    expect(screen.getByLabelText('Knowledge Bank')).toBeInTheDocument();
  });

  it('shows Banks / Transactions / Professionals when switching to IB', () => {
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    localStorage.setItem(VERTICAL_STORAGE_KEY, 'ib');
    renderSidebar('/ib');
    expect(screen.getByLabelText('Banks')).toBeInTheDocument();
    expect(screen.getByLabelText('Transactions')).toBeInTheDocument();
    expect(screen.getByLabelText('Professionals')).toBeInTheDocument();
    expect(screen.getByLabelText('IB Screener')).toBeInTheDocument();
  });

  it('shows PE Firms / Holdings / People / Screener when PE vertical is active for regular users', () => {
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    localStorage.setItem(VERTICAL_STORAGE_KEY, 'pe');
    renderSidebar('/pe/firms');
    expect(screen.getByLabelText('Firms')).toBeInTheDocument();
    expect(screen.getByLabelText('Holdings')).toBeInTheDocument();
    expect(screen.getByLabelText('People')).toBeInTheDocument();
    expect(screen.getByLabelText('Screener')).toBeInTheDocument();
  });

  it('shows all PE items for staff when PE vertical is active', () => {
    useAuthStore.setState({
      currentUser: {
        ...base,
        isAdmin: true,
        permissions: { 'pe:dataset': true, 'pe:admin': true },
      },
      isAuthenticated: true,
    });
    localStorage.setItem(VERTICAL_STORAGE_KEY, 'pe');
    renderSidebar('/pe/firms');
    expect(screen.getByLabelText('Firms')).toBeInTheDocument();
    expect(screen.getByLabelText('Holdings')).toBeInTheDocument();
    expect(screen.getByLabelText('Exit Watch')).toBeInTheDocument();
    expect(screen.getByLabelText('Ask the Market')).toBeInTheDocument();
    expect(screen.getByLabelText('Market Map')).toBeInTheDocument();
    expect(screen.getByLabelText('Digest')).toBeInTheDocument();
  });

  it('switches vertical on tab click', () => {
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    localStorage.setItem(VERTICAL_STORAGE_KEY, 'research');
    renderSidebar('/process-preference');
    fireEvent.click(screen.getByRole('tab', { name: /^PE$/i }));
    expect(localStorage.getItem(VERTICAL_STORAGE_KEY)).toBe('pe');
  });

  it('keeps IB nav when viewing shared Activity (/pe/changes) from IB', () => {
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    localStorage.setItem(VERTICAL_STORAGE_KEY, 'ib');
    renderSidebar('/pe/changes');
    expect(screen.getByRole('tab', { name: /^IB$/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Banks')).toBeInTheDocument();
    expect(screen.getByLabelText('Professionals')).toBeInTheDocument();
    expect(screen.queryByLabelText('Firms')).not.toBeInTheDocument();
  });

  it('keeps PE nav when viewing Activity (/pe/changes) from PE', () => {
    useAuthStore.setState({
      currentUser: { ...base, permissions: { 'pe:dataset': true } },
      isAuthenticated: true,
    });
    localStorage.setItem(VERTICAL_STORAGE_KEY, 'pe');
    renderSidebar('/pe/changes');
    expect(screen.getByRole('tab', { name: /^PE$/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Firms')).toBeInTheDocument();
    expect(screen.queryByLabelText('Banks')).not.toBeInTheDocument();
  });

  it('shows Settings after Deals linking to API keys', () => {
    useAuthStore.setState({
      currentUser: {
        ...base,
        email: 'jane@quralyst.ai',
        profile: { firstName: 'Jane', lastName: 'Doe' },
        orgRole: 'admin',
      },
      isAuthenticated: true,
    });
    renderSidebar();

    const deals = screen.getByLabelText('Deals');
    const settings = screen.getByLabelText('Settings');
    expect(settings).toHaveAttribute('href', '/settings/api-keys');
    expect(settings).toHaveAccessibleName('Settings');
    expect(within(settings).getByText('Settings')).toBeInTheDocument();
    expect(within(settings).queryByText('jane@quralyst.ai')).not.toBeInTheDocument();
    expect(within(settings).queryByText('Jane Doe')).not.toBeInTheDocument();

    expect(deals.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('closes the mobile menu when the backdrop is clicked', () => {
    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    renderSidebar();
    fireEvent.click(screen.getByLabelText('Open navigation'));
    expect(document.getElementById('sidebarMenu')).toHaveClass('show');
    fireEvent.click(document.getElementById('sidebarOverlay')!);
    expect(document.getElementById('sidebarMenu')).not.toHaveClass('show');
  });

  it('toggles the mobile menu via the hamburger button', () => {
    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    renderSidebar();
    const openBtn = screen.getByLabelText('Open navigation');
    fireEvent.click(openBtn);
    expect(document.getElementById('sidebarMenu')).toHaveClass('show');
    fireEvent.click(screen.getByLabelText('Close navigation'));
    expect(document.getElementById('sidebarMenu')).not.toHaveClass('show');
  });

  it('closes the mobile menu on Escape', () => {
    useAuthStore.setState({ currentUser: { ...base }, isAuthenticated: true });
    renderSidebar();
    fireEvent.click(screen.getByLabelText('Open navigation'));
    expect(document.getElementById('sidebarMenu')).toHaveClass('show');
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.getElementById('sidebarMenu')).not.toHaveClass('show');
  });
});
