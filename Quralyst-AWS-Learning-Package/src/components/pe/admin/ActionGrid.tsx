// ActionGrid (F28.2) — one card per F28 hygiene/enrich trigger. Every action is bulk and/or
// destructive, so EACH opens a ConfirmDialog stating scope + irreversibility before firing.
// Triggers enqueue (202) and never run inline; on success we toast "job enqueued" and invalidate
// the queue. Ops that expose GET /{op}/status show a live Running/Idle badge + last-run time.
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Admin Ops (F28 admin-ops additions).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peAdminService } from '@/services/api';
import { Badge } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/lib/datetime';
import type { PEAdminTriggerOp } from '@/types';
import ConfirmDialog from './ConfirmDialog';
import { peAdminKeys } from './peAdminKeys';

interface TriggerDef {
  op: PEAdminTriggerOp;
  label: string;
  scope: string;
  /** Data-mutating in a way that can drop rows — gets a stronger irreversibility warning. */
  destructive: boolean;
  /** GET /{op}/status is available (post-import-cleanup, summarize-bios, re-scrape-people-detail,
   *  holdings/re-enrich-missing-descriptions). */
  hasStatus: boolean;
}

const TRIGGERS: TriggerDef[] = [
  {
    op: 'check-stale-holdings',
    label: 'Check stale holdings',
    scope: 'Scans live holdings and flags stale ones into the not-found removal-review queue.',
    destructive: false,
    hasStatus: false,
  },
  {
    op: 'clean-holdings',
    label: 'Clean holdings',
    scope: 'Runs the holdings hygiene pass — normalises and removes junk portfolio rows.',
    destructive: true,
    hasStatus: false,
  },
  {
    op: 'cleanup-people',
    label: 'Cleanup people',
    scope: 'Runs the people hygiene pass — normalises and removes junk person rows.',
    destructive: true,
    hasStatus: false,
  },
  {
    op: 'post-import-cleanup',
    label: 'Post-import cleanup',
    scope: 'Full post-import hygiene drain across firms, holdings and people.',
    destructive: false,
    hasStatus: true,
  },
  {
    op: 'enrich-descriptions',
    label: 'Enrich descriptions',
    scope: 'LLM-enriches holdings missing a description (spends LLM budget).',
    destructive: false,
    hasStatus: false,
  },
  {
    op: 'assign-sectors',
    label: 'Assign sectors',
    scope: 'Assigns a canonical sector to holdings missing one.',
    destructive: false,
    hasStatus: false,
  },
  {
    op: 'sanitize-holding-urls',
    label: 'Sanitize holding URLs',
    scope:
      'Repairs holding URLs stored with LLM decoration (Markdown links, angle brackets) back to a bare URL — such values fail DNS resolution and render as broken links.',
    destructive: false,
    hasStatus: false,
  },
  {
    op: 'tag-sectors',
    label: 'Tag sectors',
    scope: 'Re-tags holding sectors against the canonical sector taxonomy.',
    destructive: false,
    hasStatus: false,
  },
  {
    op: 'tag-statuses',
    label: 'Tag statuses',
    scope: 'Re-derives current/realized investment statuses across holdings.',
    destructive: false,
    hasStatus: false,
  },
  {
    op: 'enrich-investment-dates',
    label: 'Enrich investment dates',
    scope: 'Fills missing estimated investment dates from available signals.',
    destructive: false,
    hasStatus: false,
  },
  {
    op: 'recheck-investment-dates',
    label: 'Recheck investment dates',
    scope: 'Re-validates existing estimated investment dates and corrects outliers.',
    destructive: false,
    hasStatus: false,
  },
  {
    op: 'backfill-portfolio-from-bio',
    label: 'Backfill portfolio from bio',
    scope: 'Extracts portfolio companies mentioned in people bios and backfills holdings.',
    destructive: false,
    hasStatus: false,
  },
  {
    op: 'summarize-bios',
    label: 'Summarize bios',
    scope: 'LLM-summarises long people bios (spends LLM budget).',
    destructive: false,
    hasStatus: true,
  },
  {
    op: 're-scrape-people-detail',
    label: 'Re-scrape people detail',
    scope: 'Re-scrapes person detail pages to refresh contact and role data.',
    destructive: false,
    hasStatus: true,
  },
  {
    op: 'holdings/re-enrich-missing-descriptions',
    label: 'Re-enrich missing descriptions',
    scope: 'Re-runs description enrichment for holdings still missing a description.',
    destructive: false,
    hasStatus: true,
  },
  // CU.5 (checkup task 5): on-demand talent-move detection — previously scheduler/raw-API only.
  {
    op: 'run-talent-flow',
    label: 'Run talent flow',
    scope: 'Detects cross-firm professional moves now (also runs on the F33 cadence).',
    destructive: false,
    hasStatus: false,
  },
];

function TriggerCard({ def }: { def: TriggerDef }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const status = useQuery({
    queryKey: [...peAdminKeys.all, 'trigger-status', def.op],
    queryFn: () => peAdminService.getTriggerStatus(def.op),
    enabled: def.hasStatus,
  });

  const run = useMutation({
    mutationFn: () => peAdminService.runTrigger(def.op),
    onSuccess: (res) => {
      setConfirmOpen(false);
      toast.success(
        res.jobId
          ? `${def.label}: job enqueued (${res.jobId}). Track it in the scrape queue below.`
          : `${def.label}: enqueued. Track it in the scrape queue below.`,
      );
      void queryClient.invalidateQueries({ queryKey: peAdminKeys.queue });
      if (def.hasStatus) void status.refetch();
    },
    onError: () => toast.error(`Could not enqueue ${def.label}.`),
  });

  return (
    <div className="col-12 col-md-6 col-xl-4">
      <div className="card pea-action-card h-100 d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <h3 className="pea-action-card__title mb-0">{def.label}</h3>
          {def.hasStatus && status.data && (
            <Badge tone={status.data.isRunning ? 'info' : 'secondary'}>
              {status.data.isRunning ? 'Running' : 'Idle'}
            </Badge>
          )}
        </div>
        <p className="pea-action-card__desc">{def.scope}</p>
        {def.hasStatus && status.data?.lastRun && (
          <p className="text-muted small mb-3">Last run: {formatDateTime(status.data.lastRun)}</p>
        )}
        <div>
          <button
            type="button"
            className={`pea-admin-btn${def.destructive ? ' pea-admin-btn--danger' : ''}`}
            onClick={() => setConfirmOpen(true)}
            disabled={run.isPending}
          >
            <i
              className={`bi ${def.destructive ? 'bi-exclamation-triangle' : 'bi-play-fill'}`}
              aria-hidden="true"
            />
            {run.isPending ? 'Enqueuing…' : 'Run'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => run.mutate()}
        title={`Run “${def.label}”?`}
        confirmLabel="Enqueue job"
        danger={def.destructive}
        pending={run.isPending}
      >
        <p className="mb-2">{def.scope}</p>
        <p className="mb-0 small">
          This enqueues a bulk background job over the whole dataset.{' '}
          {def.destructive
            ? 'It can permanently remove rows and cannot be undone.'
            : 'It runs off-request; watch progress in the scrape queue.'}
        </p>
      </ConfirmDialog>
    </div>
  );
}

export default function ActionGrid() {
  return (
    <section className="mb-4" aria-labelledby="pe-admin-actions-heading">
      <h2 id="pe-admin-actions-heading" className="h5 mb-3">
        Hygiene &amp; enrichment actions
      </h2>
      <div className="row g-3">
        {TRIGGERS.map((def) => (
          <TriggerCard key={def.op} def={def} />
        ))}
      </div>
    </section>
  );
}
