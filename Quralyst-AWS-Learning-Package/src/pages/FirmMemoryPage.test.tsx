// FirmMemoryPage (Tier A / A4) — full add → list → edit → delete cycle against MSW, proving the
// firmMemoryService contract and the page wiring end-to-end.
//
// Reference-parity shape (2026-07-29): one Team notes field, no Recompute action, and the captured
// signals shown read-only in an expandable sub-row.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { resetFirmMemoryStore, seedFirmWithSignals } from '@/test/mocks/handlers/firmMemory';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import FirmMemoryPage from './FirmMemoryPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetFirmMemoryStore();
});
afterAll(() => server.close());

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <FirmMemoryPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('FirmMemoryPage', () => {
  it('adds firm notes and shows them in the saved list', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/no firm notes yet/i);

    await user.type(screen.getByLabelText(/firm name/i), 'Vista Equity Partners');
    await user.type(screen.getByLabelText(/team notes/i), 'Buys vertical SaaS. No hardware.');
    await user.click(screen.getByRole('button', { name: /save notes/i }));

    const table = await screen.findByRole('table');
    expect(await within(table).findByText('Vista Equity Partners')).toBeInTheDocument();
    expect(within(table).getByText(/Buys vertical SaaS\. No hardware\./)).toBeInTheDocument();
  });

  it('normalizes the website so dataset matching is reliable', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/firm name/i), 'Vista Equity Partners');
    await user.type(screen.getByLabelText(/website/i), 'https://www.VistaEquityPartners.com/');
    await user.click(screen.getByRole('button', { name: /save notes/i }));

    const table = await screen.findByRole('table');
    expect(await within(table).findByText('vistaequitypartners.com')).toBeInTheDocument();
  });

  it('edits existing notes without clearing the firm', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/firm name/i), 'Thoma Bravo');
    await user.type(screen.getByLabelText(/team notes/i), 'Software buyouts.');
    await user.click(screen.getByRole('button', { name: /save notes/i }));

    const table = await screen.findByRole('table');
    await within(table).findByText('Thoma Bravo');

    await user.click(within(table).getByRole('button', { name: /^edit$/i }));
    // The firm name keys the record, so it is locked while editing.
    expect(screen.getByLabelText(/firm name/i)).toBeDisabled();

    const notes = screen.getByLabelText(/team notes/i);
    await user.clear(notes);
    await user.type(notes, 'Now also buys infrastructure software.');
    await user.click(screen.getByRole('button', { name: /update notes/i }));

    expect(await within(table).findByText(/infrastructure software/i)).toBeInTheDocument();
  });

  it('deletes firm notes', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/firm name/i), 'Thoma Bravo');
    await user.type(screen.getByLabelText(/team notes/i), 'Software buyouts.');
    await user.click(screen.getByRole('button', { name: /save notes/i }));

    const table = await screen.findByRole('table');
    expect(await within(table).findByText('Thoma Bravo')).toBeInTheDocument();

    await user.click(within(table).getByRole('button', { name: /delete/i }));

    await screen.findByText(/no firm notes yet/i);
  });

  // ── captured signals (read-only) ──
  it('shows the signals the system captured, grouped by kind', async () => {
    const user = userEvent.setup();
    seedFirmWithSignals('Vista Equity Partners');
    renderPage();

    const table = await screen.findByRole('table');
    expect(await within(table).findByText('Vista Equity Partners')).toBeInTheDocument();
    // Summary badge counts across all four lists (1 + 1 + 1 + 0).
    expect(within(table).getByText(/3 signals/i)).toBeInTheDocument();
    // Collapsed by default — the entries can be long.
    expect(within(table).queryByText(/Promoted No Fit/i)).not.toBeInTheDocument();

    await user.click(within(table).getByRole('button', { name: /signals/i }));

    expect(
      await within(table).findByText(/Promoted No Fit -> Fit for target: Acme HVAC/i),
    ).toBeInTheDocument();
    expect(within(table).getByText(/Fit corrections/i)).toBeInTheDocument();
    expect(within(table).getByText(/Deal outcomes/i)).toBeInTheDocument();
    expect(within(table).getByText(/Outreach history/i)).toBeInTheDocument();
    // An empty list renders no heading at all rather than an empty section.
    expect(within(table).queryByText(/Analyst commentary/i)).not.toBeInTheDocument();
  });

  it('disables the signals button when nothing has been observed', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/firm name/i), 'Unknown Capital');
    await user.click(screen.getByRole('button', { name: /save notes/i }));

    const table = await screen.findByRole('table');
    await within(table).findByText('Unknown Capital');
    expect(within(table).getByText(/none yet/i)).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: /signals/i })).toBeDisabled();
  });
});
