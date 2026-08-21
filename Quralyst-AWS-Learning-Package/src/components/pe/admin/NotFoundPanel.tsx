// NotFoundPanel (F28.2) — the removal-review queues. Two tables (holdings, people) from
// GET /api/pe/admin/not-found/{holdings|people}. Per-row actions, each behind a ConfirmDialog:
//   • Delete — accept removal (hard-delete the target).
//   • Exit   — mark the holding realized, no delete (HOLDINGS ONLY).
//   • Keep   — dismiss the flag, no data change.
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Admin Ops (F28 admin-ops additions).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peAdminService } from '@/services/api';
import { Badge, Spinner } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import type { PENotFoundItem, PENotFoundKind } from '@/types';
import ConfirmDialog from './ConfirmDialog';
import { peAdminKeys } from './peAdminKeys';

type NotFoundAction = 'delete' | 'exit' | 'keep';

const ACTION_COPY: Record<NotFoundAction, { title: string; body: string; confirm: string }> = {
  delete: {
    title: 'Accept removal?',
    body: 'This permanently deletes the flagged record. This cannot be undone.',
    confirm: 'Delete record',
  },
  exit: {
    title: 'Mark as realized (exit)?',
    body: 'This marks the holding as a realized investment. The row is kept, not deleted.',
    confirm: 'Mark exited',
  },
  keep: {
    title: 'Keep record?',
    body: 'This dismisses the removal flag with no data change.',
    confirm: 'Keep record',
  },
};

function itemLabel(item: PENotFoundItem): string {
  return item.companyName ?? item.name ?? item.firmName ?? item.targetId ?? item.id;
}

function NotFoundTable({ kind }: { kind: PENotFoundKind }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ item: PENotFoundItem; action: NotFoundAction } | null>(
    null,
  );

  const { data, isPending } = useQuery({
    queryKey: peAdminKeys.notFound(kind),
    queryFn: () => peAdminService.getNotFound(kind),
  });

  const act = useMutation({
    mutationFn: async ({ item, action }: { item: PENotFoundItem; action: NotFoundAction }) => {
      if (action === 'delete') return peAdminService.deleteNotFound(item.id);
      if (action === 'exit') return peAdminService.exitNotFound(item.id);
      return peAdminService.keepNotFound(item.id);
    },
    onSuccess: (_res, { action }) => {
      setPending(null);
      toast.success(
        `Record ${action === 'keep' ? 'kept' : action === 'exit' ? 'exited' : 'deleted'}.`,
      );
      void queryClient.invalidateQueries({ queryKey: peAdminKeys.notFound(kind) });
      if (action !== 'keep') void queryClient.invalidateQueries({ queryKey: peAdminKeys.queue });
    },
    onError: () => toast.error('Action failed.'),
  });

  const heading = kind === 'holdings' ? 'Holdings removal review' : 'People removal review';

  return (
    <div className="mb-3">
      <h3 className="h6 mb-2">{heading}</h3>
      {isPending || !data ? (
        <Spinner />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Record</th>
                <th scope="col">Firm</th>
                <th scope="col">Reason</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div>{itemLabel(item)}</div>
                    {item.detail && <div className="text-muted small">{item.detail}</div>}
                  </td>
                  <td>{item.firmName ?? '—'}</td>
                  <td>
                    <Badge tone="warning">{item.reason}</Badge>
                  </td>
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="pea-admin-btn pea-admin-btn--danger"
                        onClick={() => setPending({ item, action: 'delete' })}
                      >
                        Delete
                      </button>
                      {kind === 'holdings' && (
                        <button
                          type="button"
                          className="pea-admin-btn"
                          onClick={() => setPending({ item, action: 'exit' })}
                        >
                          Exit
                        </button>
                      )}
                      <button
                        type="button"
                        className="pea-admin-btn"
                        onClick={() => setPending({ item, action: 'keep' })}
                      >
                        Keep
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    Nothing pending review.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => pending && act.mutate(pending)}
        title={pending ? ACTION_COPY[pending.action].title : ''}
        confirmLabel={pending ? ACTION_COPY[pending.action].confirm : 'Confirm'}
        danger={pending?.action === 'delete'}
        pending={act.isPending}
      >
        {pending && (
          <>
            <p className="mb-2">
              <strong>{itemLabel(pending.item)}</strong>
              {pending.item.firmName ? ` · ${pending.item.firmName}` : ''}
            </p>
            <p className="mb-0 small">{ACTION_COPY[pending.action].body}</p>
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}

export default function NotFoundPanel() {
  return (
    <section className="card p-3 mb-4" aria-labelledby="pe-admin-notfound-heading">
      <h2 id="pe-admin-notfound-heading" className="h5 mb-3">
        Removal-review queues
      </h2>
      <NotFoundTable kind="holdings" />
      <NotFoundTable kind="people" />
    </section>
  );
}
