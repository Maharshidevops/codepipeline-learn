// DryRunPreviewModal (F27.3) — the dry-run-before-enable gate for a learned rule (parent §3.1).
// On open it runs POST /corrections/apply {dryRun:true} to show the blast radius (per-mechanism
// fix counts + sample rows) BEFORE the operator confirms; confirm then enables the rule via
// POST /rules/{id}/enable {confirm:true}. STAFF-ONLY — the parent only renders this for staff, and
// the backend 403s a real enable from a non-staff granted user regardless.
import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { peReviewService } from '@/services/api';
import { Badge, Button, Modal, Spinner } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import type { PECorrectionRule } from '@/types';

export interface DryRunPreviewModalProps {
  rule: PECorrectionRule | null;
  open: boolean;
  onClose: () => void;
  onEnabled: () => void;
}

export default function DryRunPreviewModal({
  rule,
  open,
  onClose,
  onEnabled,
}: DryRunPreviewModalProps) {
  const toast = useToast();

  // Preview only fetches while the modal is open for a rule (dry-run writes nothing).
  const preview = useQuery({
    queryKey: ['pe', 'corrections', 'dry-run', rule?.id ?? null],
    queryFn: () => peReviewService.applyCorrections(true),
    enabled: open && rule !== null,
    staleTime: 0,
    gcTime: 0,
  });

  const enable = useMutation({
    mutationFn: () => peReviewService.enableRule(rule!.id, true),
    onSuccess: () => {
      toast.success('Rule enabled.');
      onEnabled();
    },
    onError: () => toast.error('Could not enable the rule.'),
  });

  const counts = preview.data?.counts;
  const ruleSamples = preview.data?.samples.rules ?? [];
  const totalFixes = useMemo(
    () => (counts ? Object.values(counts).reduce((n, v) => n + v, 0) : 0),
    [counts],
  );

  return (
    <Modal open={open} onClose={onClose} title="Preview correction impact" size="lg">
      <div className="pecorr-modal">
        {rule && (
          <p className="mb-3">
            Enabling <strong>{rule.description ?? rule.kind}</strong> will let it auto-fix matching
            records on every corrections sweep. Review the dry-run impact below first.
          </p>
        )}

        {preview.isPending ? (
          <Spinner />
        ) : preview.isError || !counts ? (
          <p className="text-muted">Could not compute the dry-run preview.</p>
        ) : (
          <>
            <div className="d-flex gap-2 flex-wrap mb-3">
              <Badge tone={totalFixes > 0 ? 'info' : 'secondary'}>
                Total affected {totalFixes}
              </Badge>
              <Badge tone="secondary">Rule fixes {counts.ruleFixes}</Badge>
              <Badge tone="secondary">Corrections {counts.correctionsApplied}</Badge>
              <Badge tone="secondary">Renamed {counts.renamed}</Badge>
            </div>

            <h3 className="h6 mb-2">Sample rule hits</h3>
            {ruleSamples.length === 0 ? (
              <p className="text-muted small">No sample rows — no records currently match.</p>
            ) : (
              <div className="pecorr-table-wrap mb-2">
                <table className="pecorr-table">
                  <thead>
                    <tr>
                      <th scope="col">Rule</th>
                      <th scope="col">Field / pattern</th>
                      <th scope="col" className="pecorr-th--num">
                        Fixed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ruleSamples.map((s) => (
                      <tr key={s.ruleId}>
                        <td>
                          <code>{s.ruleId}</code>
                        </td>
                        <td>{s.field ?? s.pattern ?? '—'}</td>
                        <td className="pecorr-td--num">{s.fixed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="d-flex gap-2 justify-content-end mt-3">
          <Button variant="popup-secondary" onClick={onClose} disabled={enable.isPending}>
            Cancel
          </Button>
          <Button
            variant="popup-primary"
            onClick={() => enable.mutate()}
            disabled={enable.isPending || preview.isPending || preview.isError}
            loading={enable.isPending}
          >
            Enable rule
          </Button>
        </div>
      </div>
    </Modal>
  );
}
