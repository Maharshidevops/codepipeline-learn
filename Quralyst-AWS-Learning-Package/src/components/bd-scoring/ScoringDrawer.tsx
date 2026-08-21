// Live-preview BD scoring drawer (F36.3). Config-driven form + client engine score.
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button } from '@/components/ui';
import { bdScoringService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/lib/authErrors';
import {
  computeScore,
  estimateRevenue,
  formatMoney,
  type FieldValues,
  type TemplateConfig,
} from '@/features/bd-scoring/scoringEngine';
import { bdScoringKeys } from '@/pages/bd-scoring/bdScoringKeys';
import type { BdScoredCompany, BdScoringTemplate } from '@/types';

interface ScoringDrawerProps {
  templates: BdScoringTemplate[];
  initialTemplateId?: string;
  company?: BdScoredCompany | null;
  onClose: () => void;
  onSaved?: (company: BdScoredCompany) => void;
}

export default function ScoringDrawer({
  templates,
  initialTemplateId,
  company,
  onClose,
  onSaved,
}: ScoringDrawerProps) {
  const toast = useToast();
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState(
    company?.templateId || initialTemplateId || templates[0]?.id || '',
  );
  const [companyName, setCompanyName] = useState(company?.companyName || '');
  const [notes, setNotes] = useState(company?.notes || '');
  const [industryKey, setIndustryKey] = useState(company?.industryKey || '');
  const [listContext, setListContext] = useState(company?.listContext || '');
  const [fieldValues, setFieldValues] = useState<FieldValues>(() => ({
    ...(company?.fieldValues || {}),
  }));

  const template = templates.find((t) => t.id === templateId) || null;
  const config = useMemo(() => (template?.config || {}) as TemplateConfig, [template?.config]);

  const benchmarks = useQuery({
    queryKey: bdScoringKeys.benchmarks(),
    queryFn: () => bdScoringService.listBenchmarks(),
  });

  const preview = useMemo(() => computeScore(config, fieldValues), [config, fieldValues]);

  const emp = typeof fieldValues.employee_count === 'number' ? fieldValues.employee_count : null;
  const bench = (benchmarks.data?.benchmarks || []).find((b) => b.industryKey === industryKey);
  const revEst = estimateRevenue(
    bench
      ? {
          revenue_per_employee_low: bench.revenuePerEmployeeLow,
          revenue_per_employee_mid: bench.revenuePerEmployeeMid,
          revenue_per_employee_high: bench.revenuePerEmployeeHigh,
        }
      : null,
    emp,
  );

  const setField = (id: string, value: string | number | boolean | null) => {
    setFieldValues((prev) => {
      const next = { ...prev };
      if (value === null || value === '') delete next[id];
      else next[id] = value;
      return next;
    });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (company?.id) {
        return bdScoringService.updateCompany(company.id, {
          companyName,
          notes,
          industryKey: industryKey || null,
          listContext: listContext || null,
          fieldValues,
        });
      }
      return bdScoringService.createCompany({
        templateId,
        companyName,
        notes,
        industryKey: industryKey || null,
        listContext: listContext || null,
        fieldValues,
      });
    },
    onSuccess: (res) => {
      const saved = res.company;
      if (saved.scoreTotal !== preview.score_total || saved.tier !== preview.tier) {
        toast.error('Saved score differed from preview — please refresh.');
      } else {
        toast.success('Company score saved.');
      }
      void qc.invalidateQueries({ queryKey: bdScoringKeys.all });
      onSaved?.(saved);
      onClose();
    },
    onError: (e: unknown) => {
      toast.error(isApiError(e) ? e.message : 'Unable to save.');
    },
  });

  return (
    <div
      className="border rounded p-3"
      data-testid="bd-scoring-drawer"
      role="dialog"
      aria-label="Score company"
    >
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="h5 mb-1">{company ? 'Edit scored company' : 'Score company'}</h2>
          <p className="text-muted small mb-0">Live preview uses the same engine as the server.</p>
        </div>
        <Button type="button" variant="clear-all-text" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="bd-template">
            Template
          </label>
          <select
            id="bd-template"
            className="form-select"
            value={templateId}
            disabled={Boolean(company)}
            onChange={(e) => setTemplateId(e.target.value)}
            data-testid="bd-template-select"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="bd-company-name">
            Company name
          </label>
          <input
            id="bd-company-name"
            className="form-control"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3 p-3 border rounded" data-testid="bd-live-score">
        <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
          <strong>Live score: {preview.score_total}</strong>
          <Badge
            tone={
              preview.is_disqualified
                ? 'danger'
                : preview.tier === 'unscored'
                  ? 'secondary'
                  : 'info'
            }
          >
            {preview.tier}
          </Badge>
          {preview.bonus_score > 0 ? (
            <span className="small text-muted">Bonus {preview.bonus_score}</span>
          ) : null}
        </div>
        {Object.entries(preview.module_scores).map(([mid, sc]) => (
          <div key={mid} className="small text-muted">
            {mid}: {sc}
          </div>
        ))}
        {revEst ? (
          <div className="small mt-2" data-testid="bd-revenue-estimate">
            Advisory revenue est. (benchmark × employees): {formatMoney(revEst.mid)} mid (
            {formatMoney(revEst.low)}–{formatMoney(revEst.high)})
          </div>
        ) : null}
      </div>

      {(config.modules || []).map((mod) => (
        <section key={mod.id} className="mb-3">
          <h3 className="h6">{mod.name}</h3>
          {(mod.criteria || []).map((crit) => (
            <div key={crit.id} className="mb-2">
              <label className="form-label" htmlFor={`crit-${crit.id}`}>
                {crit.label || crit.id}
              </label>
              {crit.type === 'single_select' ? (
                <select
                  id={`crit-${crit.id}`}
                  className="form-select form-select-sm"
                  value={String(fieldValues[crit.id] ?? '')}
                  onChange={(e) => setField(crit.id, e.target.value || null)}
                >
                  <option value="">—</option>
                  {(crit.options || []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label || o.value}
                    </option>
                  ))}
                </select>
              ) : crit.type === 'integer' ? (
                <input
                  id={`crit-${crit.id}`}
                  type="number"
                  className="form-control form-control-sm"
                  value={fieldValues[crit.id] == null ? '' : String(fieldValues[crit.id])}
                  onChange={(e) =>
                    setField(crit.id, e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              ) : (
                <div className="form-text">Computed from other fields</div>
              )}
            </div>
          ))}
        </section>
      ))}

      {(config.bonus_rules || [])
        .filter((r) => r.type === 'manual')
        .map((rule) => (
          <div className="form-check mb-2" key={rule.id}>
            <input
              className="form-check-input"
              type="checkbox"
              id={`bonus-${rule.id}`}
              checked={Boolean(fieldValues[rule.id])}
              onChange={(e) => setField(rule.id, e.target.checked ? true : null)}
            />
            <label className="form-check-label" htmlFor={`bonus-${rule.id}`}>
              {rule.label || rule.id} (+{rule.score})
            </label>
          </div>
        ))}

      {(config.disqualifiers || []).map((dq) => (
        <div className="form-check mb-2" key={dq.id}>
          <input
            className="form-check-input"
            type="checkbox"
            id={`dq-${dq.id}`}
            checked={Boolean(fieldValues[dq.id])}
            onChange={(e) => setField(dq.id, e.target.checked ? true : null)}
            data-testid={`dq-${dq.id}`}
          />
          <label className="form-check-label" htmlFor={`dq-${dq.id}`}>
            {dq.label || dq.id}
          </label>
        </div>
      ))}

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <label className="form-label" htmlFor="bd-industry">
            Industry (advisory)
          </label>
          <select
            id="bd-industry"
            className="form-select form-select-sm"
            value={industryKey}
            onChange={(e) => setIndustryKey(e.target.value)}
          >
            <option value="">—</option>
            {(benchmarks.data?.benchmarks || []).map((b) => (
              <option key={b.industryKey} value={b.industryKey}>
                {b.industryLabel}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="bd-context">
            List context
          </label>
          <input
            id="bd-context"
            className="form-control form-control-sm"
            value={listContext}
            onChange={(e) => setListContext(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="bd-notes">
            Notes
          </label>
          <input
            id="bd-notes"
            className="form-control form-control-sm"
            value={notes || ''}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="d-flex gap-2">
        <Button
          type="button"
          variant="standard"
          loading={saveMut.isPending}
          onClick={() => saveMut.mutate()}
          data-testid="bd-save-company"
        >
          Save
        </Button>
        <Button type="button" variant="clear-all-text" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
