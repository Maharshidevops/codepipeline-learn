// DedupPanel (F28.2) — firm de-duplication by host key. Preview groups (GET /dedup-firms) →
// operator picks ONE survivor per collision group → typed confirm dialog → merge
// (POST /dedup-firms) → result summary (re-pointed counts, correction recorded). Near-miss NAME
// clusters are shown read-only (informational; never auto-merged / selectable).
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Admin Ops (F28 admin-ops additions).
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peAdminService } from '@/services/api';
import { Badge, Spinner } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import type { PEDedupGroup, PEDedupResult } from '@/types';
import ConfirmDialog from './ConfirmDialog';
import { peAdminKeys } from './peAdminKeys';

function GroupCard({
  group,
  onMerged,
}: {
  group: PEDedupGroup;
  onMerged: (result: PEDedupResult) => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [survivorId, setSurvivorId] = useState(group.firms[0]?.id ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loserIds = useMemo(
    () => group.firms.filter((f) => f.id !== survivorId).map((f) => f.id),
    [group.firms, survivorId],
  );

  const merge = useMutation({
    mutationFn: () => peAdminService.mergeDedup({ survivorId, loserIds }),
    onSuccess: (result) => {
      setConfirmOpen(false);
      onMerged(result);
      toast.success(`Merged ${result.mergedLoserIds.length} firm(s) into the survivor.`);
      void queryClient.invalidateQueries({ queryKey: peAdminKeys.dedup });
      void queryClient.invalidateQueries({ queryKey: peAdminKeys.queue });
      void queryClient.invalidateQueries({ queryKey: peAdminKeys.portfolioQuality });
    },
    onError: () => toast.error('Merge failed.'),
  });

  const radioName = `dedup-survivor-${group.hostKey}`;

  return (
    <div className="card p-3 mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <h3 className="h6 mb-0">
          Host key: <code>{group.hostKey}</code>
        </h3>
        <button
          type="button"
          className="pea-admin-btn"
          onClick={() => setConfirmOpen(true)}
          disabled={!survivorId || loserIds.length === 0}
        >
          Merge {loserIds.length} into survivor
        </button>
      </div>

      <fieldset className="mb-0">
        <legend className="visually-hidden">Choose the survivor firm for {group.hostKey}</legend>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Survivor</th>
                <th scope="col">Firm</th>
                <th scope="col">Status</th>
                <th scope="col">Holdings</th>
                <th scope="col">People</th>
              </tr>
            </thead>
            <tbody>
              {group.firms.map((firm) => (
                <tr key={firm.id}>
                  <td>
                    <input
                      type="radio"
                      name={radioName}
                      value={firm.id}
                      checked={survivorId === firm.id}
                      onChange={() => setSurvivorId(firm.id)}
                      aria-label={`Keep ${firm.name} as the survivor`}
                    />
                  </td>
                  <td>
                    <div>{firm.name}</div>
                    <div className="text-muted small">{firm.websiteUrl ?? '—'}</div>
                  </td>
                  <td>{firm.status}</td>
                  <td>{firm.holdingsCount}</td>
                  <td>{firm.peopleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => merge.mutate()}
        title="Merge duplicate firms?"
        confirmLabel="Merge firms"
        danger
        pending={merge.isPending}
        typedConfirm={group.hostKey}
        typedConfirmLabel={`Type the host key “${group.hostKey}” to confirm`}
      >
        <p className="mb-2">
          All holdings, people, scrape jobs and review items on {loserIds.length} losing firm(s)
          will be re-pointed to the survivor, and the losers deleted. An F27 correction is recorded.
        </p>
        <p className="mb-0 small">This cannot be undone.</p>
      </ConfirmDialog>
    </div>
  );
}

function ResultSummary({ result }: { result: PEDedupResult }) {
  return (
    <div className="card p-3 mb-3" role="status">
      <h3 className="h6 mb-2">
        Merged <code>{result.hostKey}</code>
      </h3>
      <div className="d-flex gap-2 flex-wrap">
        <Badge tone="success">Losers merged {result.mergedLoserIds.length}</Badge>
        <Badge tone="info">Holdings moved {result.holdingsMoved}</Badge>
        <Badge tone="info">People moved {result.peopleMoved}</Badge>
        <Badge tone="info">Jobs moved {result.jobsMoved}</Badge>
        <Badge tone="info">Review items moved {result.reviewItemsMoved}</Badge>
        <Badge tone="secondary">Corrections recorded {result.correctionsRecorded}</Badge>
      </div>
      <p className="text-muted small mb-0 mt-2">
        Survivor now has {result.holdingsCount} holdings and {result.peopleCount} people.
      </p>
    </div>
  );
}

export default function DedupPanel() {
  const { data, isPending } = useQuery({
    queryKey: peAdminKeys.dedup,
    queryFn: () => peAdminService.getDedupPreview(),
  });
  // Merge results keyed by hostKey — a merged group is replaced by its summary.
  const [results, setResults] = useState<Record<string, PEDedupResult>>({});

  return (
    <section className="mb-4" aria-labelledby="pe-admin-dedup-heading">
      <h2 id="pe-admin-dedup-heading" className="h5 mb-3">
        Firm de-duplication
      </h2>

      {isPending || !data ? (
        <Spinner />
      ) : (
        <>
          <p className="text-muted small">
            {data.groupCount} collision group(s) by host key · {data.nearMissCount} near-miss name
            cluster(s).
          </p>

          {data.groups.length === 0 && Object.keys(results).length === 0 && (
            <p className="text-muted">No host-key collisions to resolve.</p>
          )}

          {data.groups.map((group) =>
            results[group.hostKey] ? (
              <ResultSummary key={group.hostKey} result={results[group.hostKey]} />
            ) : (
              <GroupCard
                key={group.hostKey}
                group={group}
                onMerged={(result) => setResults((prev) => ({ ...prev, [group.hostKey]: result }))}
              />
            ),
          )}

          {data.nearMissNames.length > 0 && (
            <div className="card p-3">
              <h3 className="h6 mb-2">Near-miss name matches (informational)</h3>
              <p className="text-muted small">
                These are fuzzy name matches, not host-key collisions. They are shown for awareness
                only and cannot be auto-merged here.
              </p>
              <ul className="list-group">
                {data.nearMissNames.map((nm, i) => (
                  <li key={i} className="list-group-item">
                    <div className="d-flex justify-content-between">
                      <span>{nm.firms.map((f) => f.name).join(' ↔ ')}</span>
                      <Badge tone="secondary">score {nm.score.toFixed(2)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
