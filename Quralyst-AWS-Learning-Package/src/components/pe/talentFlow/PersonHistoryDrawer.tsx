// Person career-history drawer (F33.2). Opened by clicking a person in the moves feed, or deep-linked
// via /pe/people/:id (the page mounts it when the route carries an :id). Backed by
// GET /api/pe/people/{id}/history: tenures in first-seen order (firm link, title, seen-at range) with
// move markers between them and a `linkedinAnchored` badge distinguishing verified identity from a
// name-matched fallback. A 404 (unknown id) or 400 (malformed id) → a "person not found" empty state.
// Built on the shared Modal primitive (the repo has no standalone drawer; Modal gives the focus trap +
// Esc-close a11y the drawer needs). Read-only. Types: `src/types/peTalentFlow.ts`.
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Modal, Spinner } from '@/components/ui';
import { peTalentFlowService } from '@/services/api';
import { peTalentFlowKeys } from '@/components/pe/talentFlow/peTalentFlowKeys';
import { fmtDate } from '@/components/pe/talentFlow/talentFlowUtils';
import { paths } from '@/routes/paths';
import type { ApiError } from '@/types';

function isNotFound(error: unknown): boolean {
  const status = (error as ApiError | null)?.status;
  return status === 404 || status === 400;
}

export default function PersonHistoryDrawer({
  personId,
  onClose,
}: {
  /** Anchor person id; null closes the drawer. */
  personId: string | null;
  onClose: () => void;
}) {
  const open = personId != null;
  const { data, isLoading, error } = useQuery({
    queryKey: peTalentFlowKeys.history(personId ?? ''),
    queryFn: () => peTalentFlowService.getPersonHistory(personId as string),
    enabled: open,
    retry: false,
    staleTime: 60_000,
  });

  const personName = data?.tenures[0]?.personName ?? 'Career history';

  return (
    <Modal open={open} onClose={onClose} title={personName} size="lg">
      {isLoading ? (
        <div className="text-center py-4">
          <Spinner />
        </div>
      ) : error && isNotFound(error) ? (
        <div className="text-center py-4 text-muted" data-testid="history-not-found">
          <div className="fw-medium mb-1">Person not found</div>
          <div className="small">
            This person no longer exists in the dataset, or the link is invalid.
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-danger" data-testid="history-error">
          Could not load this person&apos;s history.
        </div>
      ) : data ? (
        <div data-testid="history-content">
          <div className="mb-3">
            {data.linkedinAnchored ? (
              <Badge tone="success">
                <span data-testid="linkedin-anchored" data-anchored="true">
                  <i className="bi bi-linkedin" aria-hidden="true" /> LinkedIn-anchored
                </span>
              </Badge>
            ) : (
              <Badge tone="secondary">
                <span data-testid="linkedin-anchored" data-anchored="false">
                  Name-matched (unverified)
                </span>
              </Badge>
            )}
          </div>

          {data.tenures.length === 0 ? (
            <div className="text-muted small">No tenures recorded for this person.</div>
          ) : (
            <ol className="list-unstyled mb-0" data-testid="tenure-timeline">
              {data.tenures.map((t, i) => (
                <li key={`${t.firmId}-${i}`} className="mb-3">
                  <div className="card">
                    <div className="card-body py-2 px-3">
                      <div className="fw-medium">
                        <Link to={paths.pe.firm(t.firmId)}>{t.firmName ?? '—'}</Link>
                      </div>
                      {t.title && <div className="small">{t.title}</div>}
                      <div className="small text-muted">
                        {fmtDate(t.firstSeenAt)} – {fmtDate(t.lastSeenAt)}
                      </div>
                    </div>
                  </div>
                  {/* Move marker between consecutive tenures. */}
                  {i < data.moves.length && (
                    <div className="text-center text-muted small py-1" aria-hidden="true">
                      <i className="bi bi-arrow-down" /> moved
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
