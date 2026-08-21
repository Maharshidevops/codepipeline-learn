// ColumnMappingDialog (F9) — loads the preview, lets the analyst override a mapping, confirms.
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { researchService } from '@/services/api';
import ColumnMappingDialog from './ColumnMappingDialog';
import type { ColumnOverrides, HeaderOverrides } from '@/services/api';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

type ConfirmArg = { columnOverrides: ColumnOverrides; headerOverrides: HeaderOverrides };

function renderDialog(onConfirm: (r: ConfirmArg) => void) {
  const file = new File(['Company,Rev\nAcme,5'], 'targets.csv', { type: 'text/csv' });
  return render(
    <ToastProvider>
      <ColumnMappingDialog files={[file]} onConfirm={onConfirm} onCancel={() => {}} />
    </ToastProvider>,
  );
}

describe('ColumnMappingDialog', () => {
  it('shows the preview and confirms with an analyst override + header row', async () => {
    const user = userEvent.setup();
    let confirmed: ConfirmArg | null = null;
    vi.spyOn(researchService, 'previewMapping').mockResolvedValue([
      {
        filename: 'targets.csv',
        header_row: 0,
        row_count: 3,
        raw_sample: [
          ['Company', 'Rev'],
          ['Acme', '5'],
          ['Beta', '9'],
        ],
        columns: [
          { source: 'Company', target: 'Company Name', confidence: 'suggested' },
          { source: 'Rev', target: '', confidence: 'unmapped' },
        ],
        blocked_outputs: ['Score', 'Fit/No Fit'],
        mappable_fields: ['Company Name', 'Website', 'Revenue', 'Number of Employees'],
        needs_confirmation: true,
        headerless: false,
      },
    ]);
    renderDialog((r) => {
      confirmed = r;
    });

    // Preview loaded → shows the source columns.
    const dialog = await screen.findByRole('dialog', { name: /confirm column mapping/i });
    expect(await within(dialog).findByText('Company')).toBeInTheDocument();
    expect(within(dialog).getByText('Rev')).toBeInTheDocument();

    // A header-row picker is present (F9.5).
    expect(within(dialog).getByLabelText(/header row for targets.csv/i)).toBeInTheDocument();

    // Override the unmapped "Rev" column → Revenue, then confirm.
    await user.selectOptions(within(dialog).getByLabelText(/map rev/i), 'Revenue');
    await user.click(within(dialog).getByRole('button', { name: /confirm & generate/i }));

    await waitFor(() => expect(confirmed).not.toBeNull());
    expect(confirmed!.columnOverrides).toEqual({ 'targets.csv': { Rev: 'Revenue' } });
    expect(confirmed!.headerOverrides).toEqual({ 'targets.csv': 0 }); // detected header seeded
  });
});
