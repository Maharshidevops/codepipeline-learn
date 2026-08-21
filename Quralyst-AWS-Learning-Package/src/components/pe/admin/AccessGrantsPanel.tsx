// AccessGrantsPanel (CU.5, checkup task 4) — see and manage who holds an explicit
// pe_dataset grant. Staff-only by the /pe/admin route (backend 403s non-staff too).
// GET lists granted users; POST {userId, granted} grants or revokes. Revoking asks for
// confirmation; granting takes a user id (the admin console has no user picker — ids
// come from the org admin screens).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peAdminService } from '@/services/api';
import { Spinner, TextInput } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import type { PEAccessGrant } from '@/types';
import ConfirmDialog from './ConfirmDialog';
import { peAdminKeys } from './peAdminKeys';

export default function AccessGrantsPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [toRevoke, setToRevoke] = useState<PEAccessGrant | null>(null);

  const grants = useQuery({
    queryKey: peAdminKeys.accessGrants,
    queryFn: () => peAdminService.listAccessGrants(),
  });

  const setGrant = useMutation({
    mutationFn: ({ id, granted }: { id: string; granted: boolean }) =>
      peAdminService.setAccessGrant(id, granted),
    onSuccess: (r) => {
      toast.success(
        r.granted ? `PE dataset access granted to ${r.email}.` : `Access revoked from ${r.email}.`,
      );
      setUserId('');
      setToRevoke(null);
      void queryClient.invalidateQueries({ queryKey: peAdminKeys.accessGrants });
    },
    onError: () => toast.error('Could not update the grant (unknown user id?).'),
  });

  return (
    <section
      className="mb-4"
      aria-labelledby="pe-access-grants-heading"
      data-testid="access-grants"
    >
      <h2 id="pe-access-grants-heading" className="h5">
        Dataset access grants
      </h2>
      <p className="text-muted small">
        Users below hold an explicit <code>pe_dataset</code> grant. Staff always have access and are
        not listed.
      </p>

      <div className="d-flex gap-2 align-items-end mb-3" style={{ maxWidth: 480 }}>
        <div className="flex-grow-1">
          <TextInput
            id="pe-grant-user-id"
            label="User id to grant"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          className="pea-admin-btn"
          disabled={!userId.trim() || setGrant.isPending}
          onClick={() => setGrant.mutate({ id: userId.trim(), granted: true })}
          data-testid="pe-grant-submit"
        >
          {setGrant.isPending && toRevoke === null ? 'Granting…' : 'Grant access'}
        </button>
      </div>

      {grants.isPending ? (
        <Spinner />
      ) : (
        <table className="table align-middle" data-testid="access-grants-table">
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">User id</th>
              <th scope="col" className="text-end">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(grants.data ?? []).map((g) => (
              <tr key={g.userId}>
                <td>{g.email}</td>
                <td className="text-muted small">{g.userId}</td>
                <td className="text-end">
                  <button
                    type="button"
                    className="pea-admin-btn pea-admin-btn--danger"
                    onClick={() => setToRevoke(g)}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {grants.data && grants.data.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-muted">
                  No explicit grants — only staff can see the PE dataset right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={toRevoke !== null}
        onClose={() => setToRevoke(null)}
        onConfirm={() => toRevoke && setGrant.mutate({ id: toRevoke.userId, granted: false })}
        title="Revoke dataset access"
        confirmLabel="Revoke access"
        danger
        pending={setGrant.isPending}
      >
        <p>
          Revoke PE dataset access from <strong>{toRevoke?.email}</strong>? They lose the PE/IB
          screens immediately (staff access is unaffected).
        </p>
      </ConfirmDialog>
    </section>
  );
}
