// CorrectionsPanel (F27.3) — QURALYST-20 Corrections.tsx layout + FE staff controls
// (dry-run enable preview, disable, confirm-apply). Contract: REF-API-CONTRACT.md §PE Dataset — Corrections.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peReviewService } from '@/services/api';
import { Badge, Button, Spinner } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import type { PECorrection, PECorrectionRule } from '@/types';
import ConfirmDialog from '@/components/pe/admin/ConfirmDialog';
import { formatRelativeDetectedAt } from '@/components/pe/changes/changeMeta';
import { peCorrectionsKeys } from './peReviewKeys';
import DryRunPreviewModal from './DryRunPreviewModal';
import { displayValue } from './reviewDiff';
import '@/styles/pages/pe-corrections.css';

function safeHost(url: string): string {
  if (!url) return '—';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function CorrectionRow({ c }: { c: PECorrection }) {
  const isDelete = c.action === 'delete';
  const subject = c.label || c.companyName || '—';
  return (
    <tr>
      <td>
        <Badge tone={isDelete ? 'danger' : 'secondary'} className="pecorr-type-badge">
          <i className={`bi ${isDelete ? 'bi-trash' : 'bi-pencil'}`} aria-hidden="true" />
          {c.scope === 'firm' ? 'Firm' : 'Holding'} {isDelete ? 'delete' : 'edit'}
        </Badge>
      </td>
      <td className="pecorr-subject" title={subject}>
        {subject}
      </td>
      <td className="pecorr-td--firm">{safeHost(c.firmDomain)}</td>
      <td>{c.field || <span className="pecorr-muted">—</span>}</td>
      <td>
        {isDelete ? (
          <span className="pecorr-muted">—</span>
        ) : (
          <span className="pecorr-change">
            <span className="pecorr-change__before">{fmtValue(c.before)}</span>
            <span className="pecorr-change__arrow" aria-hidden="true">
              →
            </span>
            <span className="pecorr-change__after">{fmtValue(c.after)}</span>
          </span>
        )}
      </td>
      <td className="pecorr-td--when">{c.at ? formatRelativeDetectedAt(c.at) : '—'}</td>
    </tr>
  );
}

function RulesTable({
  rules,
  canManage,
  onPreview,
  onDisable,
  disablingId,
}: {
  rules: PECorrectionRule[];
  canManage: boolean;
  onPreview: (rule: PECorrectionRule) => void;
  onDisable: (rule: PECorrectionRule) => void;
  disablingId: string | null;
}) {
  if (rules.length === 0) {
    return (
      <p className="pecorr-empty mb-0">
        No rules learned yet. Edit or delete a holding/firm and a rule will appear here.
      </p>
    );
  }

  return (
    <div className="pecorr-table-wrap">
      <table className="pecorr-table">
        <thead>
          <tr>
            <th scope="col">Kind</th>
            <th scope="col">Field</th>
            <th scope="col">Description</th>
            <th scope="col" className="pecorr-th--num">
              Corrected
            </th>
            <th scope="col">State</th>
            {canManage ? (
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr
              key={rule.id}
              className={rule.enabled ? undefined : 'pecorr-row--disabled text-muted'}
            >
              <td>
                <Badge tone={rule.kind === 'pattern' ? 'info' : 'secondary'}>{rule.kind}</Badge>
              </td>
              <td>
                <span style={{ fontWeight: 500 }}>{rule.field ?? rule.patternId ?? '—'}</span>
              </td>
              <td className="pecorr-td--desc">
                {rule.description ??
                  (rule.before || rule.after
                    ? `${displayValue(rule.before)} → ${displayValue(rule.after)}`
                    : '—')}
              </td>
              <td className="pecorr-td--num">{rule.correctedCount.toLocaleString()}</td>
              <td>
                <Badge tone={rule.enabled ? 'success' : 'secondary'}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </td>
              {canManage ? (
                <td>
                  <div className="pecorr-actions">
                    {rule.enabled ? (
                      <Button
                        variant="popup-secondary"
                        onClick={() => onDisable(rule)}
                        loading={disablingId === rule.id}
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button variant="popup-primary" onClick={() => onPreview(rule)}>
                        Preview &amp; enable
                      </Button>
                    )}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ corrections }: { corrections: PECorrection[] }) {
  if (corrections.length === 0) {
    return <p className="pecorr-empty mb-0">No corrections recorded yet.</p>;
  }

  return (
    <div className="pecorr-table-wrap">
      <table className="pecorr-table">
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Subject</th>
            <th scope="col">Firm</th>
            <th scope="col">Field</th>
            <th scope="col">Change</th>
            <th scope="col" className="pecorr-th--when">
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {corrections.map((c) => (
            <CorrectionRow key={c.id} c={c} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingBlock({ rows }: { rows: number }) {
  return (
    <div className="pecorr-loading" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="pecorr-skel" />
      ))}
      <span className="visually-hidden">
        <Spinner />
      </span>
    </div>
  );
}

export default function CorrectionsPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('pe:admin');

  const { data, isPending } = useQuery({
    queryKey: peCorrectionsKeys.store,
    queryFn: () => peReviewService.getCorrections(),
  });

  const [previewRule, setPreviewRule] = useState<PECorrectionRule | null>(null);
  const [disableRule, setDisableRule] = useState<PECorrectionRule | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  const invalidateStore = () =>
    void queryClient.invalidateQueries({ queryKey: peCorrectionsKeys.store });

  const disable = useMutation({
    mutationFn: (id: string) => peReviewService.disableRule(id),
    onSuccess: () => {
      setDisableRule(null);
      toast.success('Rule disabled.');
      invalidateStore();
    },
    onError: () => toast.error('Could not disable the rule.'),
  });

  const apply = useMutation({
    mutationFn: () => peReviewService.applyCorrections(false),
    onSuccess: (summary) => {
      setApplyOpen(false);
      const total = Object.values(summary.counts).reduce((n, v) => n + v, 0);
      toast.success(
        total > 0
          ? `Corrections applied — ${total} record${total === 1 ? '' : 's'} updated across the dataset.`
          : 'Everything was already consistent — no changes needed.',
      );
      invalidateStore();
    },
    onError: () => toast.error('Apply corrections failed.'),
  });

  const rules = data?.rules ?? [];
  const corrections = data?.corrections ?? [];

  return (
    <div className="pecorr-page" data-testid="pe-corrections-page">
      <header className="pecorr-header">
        <div className="pecorr-header__text">
          <div className="pecorr-crumb">
            <span>Private Equity</span>
            <i className="bi bi-chevron-right" aria-hidden="true" />
            <span className="pecorr-crumb__current">Corrections</span>
          </div>
          <h1 className="pecorr-title">Corrections</h1>
          <p className="pecorr-subtitle">
            Every manual edit and deletion is remembered and turned into reusable auto-fix rules.
            These are enforced on every scrape and import — run a sweep below to apply them across
            all existing data.
          </p>
        </div>
        {canManage ? (
          <Button
            variant="standard"
            className="pecorr-apply-btn"
            onClick={() => setApplyOpen(true)}
          >
            <i className="bi bi-magic" aria-hidden="true" />
            Apply to all data
          </Button>
        ) : null}
      </header>

      <section className="pecorr-card" aria-labelledby="pe-corrections-rules-heading">
        <div className="pecorr-card__head">
          <i className="bi bi-stars pecorr-card__title-icon" aria-hidden="true" />
          <h2 id="pe-corrections-rules-heading" className="pecorr-card__title">
            Active auto-fix rules
          </h2>
          <span className="pecorr-count">{rules.length}</span>
        </div>
        <div className="pecorr-card__body">
          {isPending || !data ? (
            <LoadingBlock rows={3} />
          ) : (
            <RulesTable
              rules={rules}
              canManage={canManage}
              onPreview={setPreviewRule}
              onDisable={setDisableRule}
              disablingId={disable.isPending ? (disableRule?.id ?? null) : null}
            />
          )}
        </div>
      </section>

      <section className="pecorr-card" aria-labelledby="pe-corrections-recent-heading">
        <div className="pecorr-card__head">
          <h2 id="pe-corrections-recent-heading" className="pecorr-card__title">
            Correction history
          </h2>
          <span className="pecorr-count">{data?.totalCorrections ?? 0}</span>
        </div>
        <div className="pecorr-card__body">
          {isPending || !data ? (
            <LoadingBlock rows={5} />
          ) : (
            <HistoryTable corrections={corrections} />
          )}
        </div>
      </section>

      {apply.data && apply.data.status === 'ok' ? (
        <section className="pecorr-card pecorr-last-apply" role="status">
          <h3 className="pecorr-last-apply__title">Last apply — per-mechanism fixes</h3>
          <div className="pecorr-last-apply__chips">
            {Object.entries(apply.data.counts).map(([key, value]) => (
              <Badge key={key} tone={value > 0 ? 'info' : 'secondary'}>
                {key} {value}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      <DryRunPreviewModal
        rule={previewRule}
        open={previewRule !== null}
        onClose={() => setPreviewRule(null)}
        onEnabled={() => {
          setPreviewRule(null);
          invalidateStore();
        }}
      />

      <ConfirmDialog
        open={disableRule !== null}
        onClose={() => setDisableRule(null)}
        onConfirm={() => disableRule && disable.mutate(disableRule.id)}
        title="Disable this rule?"
        confirmLabel="Disable rule"
        pending={disable.isPending}
      >
        <p className="mb-0">
          The rule stops auto-fixing on future sweeps. Records it already changed are unaffected.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onConfirm={() => apply.mutate()}
        title="Apply corrections across the dataset?"
        confirmLabel="Apply corrections"
        danger
        pending={apply.isPending}
      >
        <p className="mb-2">
          This replays overrides + corrections and sweeps every enabled rule across the whole
          dataset — including holding/firm deletes and roster replacement.
        </p>
        <p className="mb-0 small">This is a large, partly-irreversible operation.</p>
      </ConfirmDialog>
    </div>
  );
}
