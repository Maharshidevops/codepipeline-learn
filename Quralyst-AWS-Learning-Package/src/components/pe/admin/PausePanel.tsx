// PausePanel (F28.2) — the scraper pause toggle, bound to GET/POST /api/pe/admin/scraper-pause.
// Shows dbPaused vs envOverride: when the env override wins the toggle is read-only with an
// explanation (the DB toggle cannot change the effective state). Contract: backend
// REF-API-CONTRACT.md §PE Dataset — Admin Ops.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peAdminService } from '@/services/api';
import { Badge, Spinner, Toggle } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { peAdminKeys } from './peAdminKeys';

export default function PausePanel() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: pause, isPending } = useQuery({
    queryKey: peAdminKeys.pause,
    queryFn: () => peAdminService.getPause(),
  });

  const setPause = useMutation({
    mutationFn: (paused: boolean) => peAdminService.setPause(paused),
    onSuccess: (next) => {
      queryClient.setQueryData(peAdminKeys.pause, next);
      void queryClient.invalidateQueries({ queryKey: peAdminKeys.queue });
      toast.success(next.dbPaused ? 'Scraper paused.' : 'Scraper resumed.');
    },
    onError: () => toast.error('Could not update the pause state.'),
  });

  return (
    <section className="card p-3 mb-4" aria-labelledby="pe-admin-pause-heading">
      <h2 id="pe-admin-pause-heading" className="h5 mb-3">
        Scraper pause
      </h2>

      {isPending || !pause ? (
        <Spinner />
      ) : (
        <>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            {/* F52.2 — "Not paused", never "Running". This endpoint only knows the PAUSE FLAG; it has
                no idea whether a worker process exists. Labelling !paused as "Running" rendered a
                green badge for a scraper that was never deployed, which is exactly what the
                2026-07-31 tester hit. Liveness lives in the Queues panel (workerLiveness.anyAlive). */}
            <Toggle
              id="pe-admin-pause-toggle"
              label={pause.paused ? 'Scraper paused' : 'Scraper not paused'}
              checked={pause.dbPaused}
              disabled={pause.envOverride || setPause.isPending}
              onChange={(e) => setPause.mutate(e.target.checked)}
            />
            <Badge tone={pause.paused ? 'warning' : 'secondary'}>
              {pause.paused ? 'Paused' : 'Not paused'}
            </Badge>
          </div>

          <p className="text-muted small mb-0 mt-2">
            Effective state = env override OR the DB toggle. DB toggle:{' '}
            <strong>{pause.dbPaused ? 'paused' : 'not paused'}</strong>. Whether a worker is
            actually alive is a separate question — see worker liveness in the Queues panel.
          </p>

          {pause.envOverride && (
            <p className="text-warning small mb-0 mt-1" role="note">
              An environment override is forcing the scraper paused. The DB toggle is read-only
              until the <code>SCRAPER_PAUSED</code> env override is cleared on the server.
            </p>
          )}
        </>
      )}
    </section>
  );
}
