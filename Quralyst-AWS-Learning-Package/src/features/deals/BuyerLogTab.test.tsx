// BuyerLogTab — editable tier / buyer type / pass reason + @mentions in comments.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { resetDealCompanies } from '@/test/mocks/handlers/deals';
import { ok } from '@/test/mocks/envelope';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { dealsService, type Deal } from '@/services/api';
import BuyerLogTab from './BuyerLogTab';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetDealCompanies();
});
afterAll(() => server.close());

const DEAL: Deal = {
  id: 'deal_1',
  name: 'Project Falcon',
  dealType: 'sell_side',
  description: '',
  status: 'active',
  leadUserId: 'u1',
  yourRole: 'lead',
  stages: [
    { stageId: 'stg_0', name: 'Sourcing', order: 0, isTerminal: false, color: '#6366f1' },
    { stageId: 'stg_pass', name: 'Passed', order: 1, isTerminal: true, color: '#dc2626' },
  ],
  members: [
    { userId: 'u1', name: 'R', email: '', role: 'lead' },
    { userId: 'u2', name: 'Karan Parmar', email: 'karan@quralyst.ai', role: 'member' },
  ],
  createdAt: null,
  updatedAt: null,
};

function renderTab() {
  render(
    <ToastProvider>
      <BuyerLogTab deal={DEAL} />
    </ToastProvider>,
  );
}

describe('BuyerLogTab', () => {
  it('edits tier and buyer type inline', async () => {
    const user = userEvent.setup();
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch('/api/v1/deals/:id/companies/:rid', async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return ok({
          company: {
            id: 'rec_1',
            dealId: 'deal_1',
            companyName: 'AECOM',
            website: 'https://aecom.com',
            stageId: 'stg_0',
            tier: patched.tier ?? 1,
            buyerType: patched.buyerType ?? 'strategic',
            outreachStatus: '',
            passReason: '',
            predictedFit: '',
            sourceResultId: '',
            contacts: [],
            notes: '',
            ownerUserId: 'u1',
            ownerName: 'R',
          },
        });
      }),
    );

    await dealsService.addCompany('deal_1', {
      companyName: 'AECOM',
      website: 'https://aecom.com',
      buyerType: 'strategic',
    });
    renderTab();

    expect(await screen.findByText('AECOM')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^tier$/i), '2');
    await waitFor(() => expect(patched?.tier).toBe(2));

    await user.selectOptions(screen.getByLabelText(/^buyer type$/i), 'financial_sponsor');
    await waitFor(() => expect(patched?.buyerType).toBe('financial_sponsor'));
  });

  it('offers pass-reason presets and saves a selection', async () => {
    const user = userEvent.setup();
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch('/api/v1/deals/:id/companies/:rid', async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return ok({ company: { id: 'x', ...(patched as object) } });
      }),
    );

    await dealsService.addCompany('deal_1', { companyName: 'Accenture', buyerType: 'strategic' });
    renderTab();

    await screen.findByText('Accenture');
    await user.selectOptions(screen.getByLabelText(/pass reason preset/i), 'Went dark.');
    await waitFor(() => expect(patched?.passReason).toBe('Went dark.'));
  });

  it('supports @-mention autocomplete in comments', async () => {
    const user = userEvent.setup();
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch('/api/v1/deals/:id/companies/:rid', async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return ok({ company: { id: 'x', notes: patched.notes } });
      }),
    );

    await dealsService.addCompany('deal_1', { companyName: 'Arcadis', buyerType: 'strategic' });
    renderTab();

    const comments = await screen.findByLabelText(/^comments$/i);
    await user.click(comments);
    await user.type(comments, 'please review @Kar');
    await user.click(await screen.findByRole('button', { name: /karan parmar/i }));
    expect((comments as HTMLTextAreaElement).value).toContain('@Karan Parmar');
    await user.tab();
    await waitFor(() => expect(String(patched?.notes || '')).toContain('@Karan Parmar'));
  });
});
