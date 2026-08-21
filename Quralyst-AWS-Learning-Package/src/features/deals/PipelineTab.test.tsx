// PipelineTab (F18) — table stage moves + right-side company detail drawer.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from '@/test/mocks/handlers';
import { resetDealCompanies } from '@/test/mocks/handlers/deals';
import { ok } from '@/test/mocks/envelope';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { dealsService, type Deal } from '@/services/api';
import PipelineTab from './PipelineTab';

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
    { stageId: 'stg_0', name: 'Sourcing', order: 0, isTerminal: false, color: '' },
    { stageId: 'stg_won', name: 'Closed – Won', order: 1, isTerminal: true, color: '' },
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
      <PipelineTab deal={DEAL} />
    </ToastProvider>,
  );
}

async function seedCompany(name: string) {
  await dealsService.addCompany('deal_1', { companyName: name });
}

describe('PipelineTab', () => {
  it('lists companies in the pipeline table', async () => {
    await seedCompany('Acme HVAC');
    renderTab();

    expect(await screen.findByRole('button', { name: 'Acme HVAC' })).toBeInTheDocument();
    expect(screen.getByLabelText(/stage for acme hvac/i)).toBeInTheDocument();
  });

  it('moves a company through a stage via the table stage pill', async () => {
    const user = userEvent.setup();
    await seedCompany('Acme HVAC');
    renderTab();

    expect(await screen.findByRole('button', { name: 'Acme HVAC' })).toBeInTheDocument();
    const stageSelect = screen.getByLabelText(/stage for acme hvac/i);
    await user.selectOptions(stageSelect, 'stg_won');
    await waitFor(() => expect((stageSelect as HTMLSelectElement).value).toBe('stg_won'));
  });

  it('opens a right-side detail drawer with Contacts / Activity / Comments tabs', async () => {
    const user = userEvent.setup();
    await seedCompany('Beta Cooling');
    renderTab();

    await user.click(await screen.findByRole('button', { name: 'Beta Cooling' }));
    const region = await screen.findByRole('region', { name: /details for beta cooling/i });
    expect(within(region).getByRole('tab', { name: /^contacts$/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(region).getByRole('button', { name: /add contact/i })).toBeInTheDocument();

    await user.click(within(region).getByRole('tab', { name: /^comments/i }));
    await user.type(screen.getByLabelText(/add a comment/i), 'Reached out today');
    await user.click(screen.getByRole('button', { name: /post comment/i }));
    expect(await within(region).findByText(/reached out today/i)).toBeInTheDocument();
  });

  it('adds a contact from the Contacts tab', async () => {
    const user = userEvent.setup();
    await seedCompany('Delta Labs');
    renderTab();

    await user.click(await screen.findByRole('button', { name: 'Delta Labs' }));
    const region = await screen.findByRole('region', { name: /details for delta labs/i });
    await user.click(within(region).getByRole('button', { name: /add contact/i }));
    await user.type(screen.getByLabelText(/contact name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/contact email/i), 'jane@delta.com');
    await user.click(within(region).getByRole('button', { name: /^add$/i }));
    expect(await within(region).findByText('Jane Doe')).toBeInTheDocument();
    expect(within(region).getByText('jane@delta.com')).toBeInTheDocument();
    const outreach = within(region).getByLabelText(/outreach status for jane doe/i);
    expect((outreach as HTMLSelectElement).value).toBe('not_contacted');
    await user.selectOptions(outreach, 'contacted');
    await waitFor(() => expect((outreach as HTMLSelectElement).value).toBe('contacted'));
  });

  it('picks an @-mention and sends the mentioned member id', async () => {
    const user = userEvent.setup();
    let sentMentions: string[] | undefined;
    server.use(
      http.post('/api/v1/deals/:id/companies/:rid/comments', async ({ request }) => {
        const body = (await request.json()) as { text?: string; mentions?: string[] };
        sentMentions = body.mentions;
        return ok({
          comment: {
            id: 'cmt_x',
            recordId: 'rec',
            authorUserId: 'u1',
            authorName: 'R',
            text: body.text,
            mentions: body.mentions ?? [],
            createdAt: null,
          },
        });
      }),
    );

    await seedCompany('Gamma HVAC');
    renderTab();
    await user.click(await screen.findByRole('button', { name: 'Gamma HVAC' }));
    const region = await screen.findByRole('region', { name: /details for gamma hvac/i });
    await user.click(within(region).getByRole('tab', { name: /^comments/i }));

    const commentBox = screen.getByLabelText(/add a comment/i);
    await user.type(commentBox, 'please review @Kar');
    await user.click(await screen.findByRole('button', { name: /karan parmar/i }));
    expect((commentBox as HTMLInputElement).value).toContain('@Karan Parmar');

    await user.click(screen.getByRole('button', { name: /post comment/i }));
    await waitFor(() => expect(sentMentions).toEqual(['u2']));
  });
});
