// PE People batch-op modal (F25.3): a started op (202) binds the shared SSE seam via a stubbed
// progressService.openStream — we drive progress→done and cancel deterministically — plus the two
// pre-flight error branches the contract defines: 409 (already running) and 400 (missing BYOK key,
// surfaced from the dry-run preview). Axe audit on the confirm step.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { handlers } from '@/test/mocks/handlers';
import { endpoints } from '@/services/endpoints';
import { progressService } from '@/services/api';
import type { ProgressEventName, ProgressUpdateEvent } from '@/types';
import PeopleBatchModal from './PeopleBatchModal';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

// A controllable ProgressSource: capture listeners so the test can fire events on demand.
function makeFakeSource() {
  const listeners: Partial<Record<ProgressEventName, ((d: ProgressUpdateEvent) => void)[]>> = {};
  return {
    start: vi.fn(),
    stop: vi.fn(),
    on(ev: ProgressEventName, cb: (d: ProgressUpdateEvent) => void) {
      (listeners[ev] ??= []).push(cb);
    },
    fire(ev: ProgressEventName, d: Partial<ProgressUpdateEvent>) {
      act(() => {
        (listeners[ev] ?? []).forEach((cb) => cb(d as ProgressUpdateEvent));
      });
    },
  };
}

describe('PeopleBatchModal', () => {
  it('starts the op (202), binds SSE progress, and reports completion', async () => {
    const fake = makeFakeSource();
    const openSpy = vi
      .spyOn(progressService, 'openStream')
      .mockReturnValue(fake as unknown as ReturnType<typeof progressService.openStream>);
    const onDone = vi.fn();
    const user = userEvent.setup();

    render(<PeopleBatchModal op="tag" onClose={vi.fn()} onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: /start tagging/i }));

    // The 202 handler resolves → openStream is bound with the returned processId/processType.
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        expect.objectContaining({ processId: 'proc-tag-1', processType: 'pe_people_tag' }),
      ),
    );
    expect(fake.start).toHaveBeenCalled();

    // Drive the stream: progress then completion.
    fake.fire('progress', { overall_percentage: 50, activity_message: 'Halfway' });
    expect(screen.getByText('Halfway')).toBeInTheDocument();

    fake.fire('complete', { activity_message: 'Tagged 12 people.' });
    expect(await screen.findByText('Tagged 12 people.')).toBeInTheDocument();
    expect(onDone).toHaveBeenCalled();
  });

  it('cancels a running op (closes the stream client-side)', async () => {
    const fake = makeFakeSource();
    vi.spyOn(progressService, 'openStream').mockReturnValue(
      fake as unknown as ReturnType<typeof progressService.openStream>,
    );
    const user = userEvent.setup();

    render(<PeopleBatchModal op="tag" onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /start tagging/i }));
    await waitFor(() => expect(fake.start).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(fake.stop).toHaveBeenCalled();
    expect(await screen.findByText(/cancelled/i)).toBeInTheDocument();
  });

  it('surfaces a 409 already-running error without opening a stream', async () => {
    server.use(
      http.post(endpoints.pe.peopleTag, () =>
        Response.json(
          { success: false, statusCode: 409, data: null, message: 'Already running.', meta: null },
          { status: 409 },
        ),
      ),
    );
    const openSpy = vi.spyOn(progressService, 'openStream');
    const user = userEvent.setup();

    render(<PeopleBatchModal op="tag" onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /start tagging/i }));

    expect(await screen.findByText(/already running/i)).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('surfaces a 400 missing-key error from the find-emails preview', async () => {
    server.use(
      http.post(endpoints.pe.peopleFindEmails, () =>
        Response.json(
          {
            success: false,
            statusCode: 400,
            data: null,
            message: 'Apollo API key required.',
            meta: null,
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();

    render(<PeopleBatchModal op="findEmails" onClose={vi.fn()} onDone={vi.fn()} />);
    // Provider ops preview first; the 400 comes back on that dry-run request.
    await user.click(screen.getByRole('button', { name: /preview/i }));
    expect(await screen.findByText(/apollo api key required/i)).toBeInTheDocument();
  });

  it('has no axe violations on the confirm step', async () => {
    const { container } = render(<PeopleBatchModal op="tag" onClose={vi.fn()} onDone={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
