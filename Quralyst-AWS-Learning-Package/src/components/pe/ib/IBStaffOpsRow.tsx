// Staff-only ops row for the IB directory (F34.4). Renders the three targeted re-queues plus the two
// PII/coverage ops (infer-emails, scan-contact-pages). These are `require_staff` server-side; the page
// mounts this ONLY when can('pe:admin') (the app's staff signal — legacy fallback = user.isAdmin), so
// a granted-but-non-staff pe:dataset user never sees it. Each button fires its enqueue mutation and
// surfaces the returned `message`. Read the returned counts to keep the operator informed.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { ibService } from '@/services/api';
import type { ApiError } from '@/types';

type OpResult = { message: string; tone: 'ok' | 'error' } | null;

export default function IBStaffOpsRow({ onChanged }: { onChanged: () => void }) {
  const [feedback, setFeedback] = useState<OpResult>(null);

  function run<T extends { message: string }>(fn: () => Promise<T>) {
    return () =>
      mutation.mutate(fn, {
        onSuccess: (data) => {
          setFeedback({ message: data.message, tone: 'ok' });
          onChanged();
        },
        onError: (e) =>
          setFeedback({
            message: (e as unknown as ApiError)?.message ?? 'Operation failed',
            tone: 'error',
          }),
      });
  }

  const mutation = useMutation({
    mutationFn: (fn: () => Promise<{ message: string }>) => fn(),
  });

  return (
    <div className="card mb-4 border-warning-subtle" data-testid="ib-staff-ops">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-2">
          <i className="bi bi-shield-lock text-warning" aria-hidden="true" />
          <h2 className="h6 mb-0">Operator tools</h2>
          <span className="badge bg-warning-subtle text-dark border">Staff only</span>
        </div>
        <p className="text-muted small mb-3">
          Targeted re-queues and PII operations. These spend credits / enqueue work across the whole
          dataset — use deliberately.
        </p>
        <div className="d-flex flex-wrap gap-2">
          <Button
            variant="popup-secondary"
            onClick={run(() => ibService.rescrapePeople())}
            loading={mutation.isPending}
            data-testid="op-rescrape-people"
          >
            Re-scrape people (0 people)
          </Button>
          <Button
            variant="popup-secondary"
            onClick={run(() => ibService.rescrapeTransactions())}
            loading={mutation.isPending}
            data-testid="op-rescrape-transactions"
          >
            Re-scrape deals (0 deals)
          </Button>
          <Button
            variant="popup-secondary"
            onClick={run(() => ibService.rescrapeZeroCoverage())}
            loading={mutation.isPending}
            data-testid="op-rescrape-zero"
          >
            Re-scrape empty
          </Button>
          <Button
            variant="popup-secondary"
            onClick={run(() => ibService.inferEmails())}
            loading={mutation.isPending}
            data-testid="op-infer-emails"
          >
            Infer emails
          </Button>
          <Button
            variant="popup-secondary"
            onClick={run(() => ibService.scanContactPages())}
            loading={mutation.isPending}
            data-testid="op-scan-contact-pages"
          >
            Scan contact pages
          </Button>
        </div>
        {feedback && (
          <div
            className={`small mt-2 ${feedback.tone === 'error' ? 'text-danger' : 'text-success'}`}
            role="status"
            data-testid="op-feedback"
          >
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}
