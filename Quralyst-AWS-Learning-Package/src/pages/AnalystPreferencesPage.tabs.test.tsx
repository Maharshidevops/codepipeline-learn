// Analyst Preferences — two-tab structure. The Firm Memory tab (org thesis + per-firm notes) is
// admin-only: org owners/admins get a tab switcher; everyone else sees just the personal view.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { handlers } from '@/test/mocks/handlers';
import { ok, err } from '@/test/mocks/envelope';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import AnalystPreferencesPage from './AnalystPreferencesPage';

const ORG_MEMORY = {
  explicit_thesis: 'We buy B2B services businesses',
  liked_sectors: [],
  excluded_sectors: [],
  liked_deal_types: [],
  excluded_deal_types: [],
  geo_focus: [],
  size_notes: '',
  hard_exclusion_notes: '',
  auto_signals: {},
  auto_signals_updated_at: null,
  updated_at: null,
};

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderPage = () =>
  render(
    <ToastProvider>
      <MemoryRouter>
        <AnalystPreferencesPage />
      </MemoryRouter>
    </ToastProvider>,
  );

describe('Analyst Preferences — tabs', () => {
  it('admin sees the Firm Memory tab and can switch to the firm thesis', async () => {
    server.use(http.get('/api/org-memory', () => ok({ orgMemory: ORG_MEMORY, canEdit: true })));
    const user = userEvent.setup();
    renderPage();

    // Default tab is personal.
    expect(await screen.findByText('My Explicit Preferences')).toBeInTheDocument();
    const firmTab = screen.getByRole('tab', { name: 'Firm Memory' });
    expect(firmTab).toBeInTheDocument();

    await user.click(firmTab);
    expect(await screen.findByText('Firm Investment Thesis')).toBeInTheDocument();
  });

  it('non-admin (no org) sees no tab switcher — personal view only', async () => {
    server.use(http.get('/api/org-memory', () => err(403, 'No organization.')));
    renderPage();

    expect(await screen.findByText('My Explicit Preferences')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Firm Memory' })).not.toBeInTheDocument();
    expect(screen.queryByText('Firm Investment Thesis')).not.toBeInTheDocument();
  });
});
