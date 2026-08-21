// BD Scoring pages (F36.3) — templates, scored companies, CSV import, JSON editor.
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, BaseTable } from '@/components/ui';
import ScoringDrawer from '@/components/bd-scoring/ScoringDrawer';
import { bdScoringService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/lib/authErrors';
import { computeScore, type TemplateConfig } from '@/features/bd-scoring/scoringEngine';
import type { BdScoredCompany } from '@/types';
import { bdScoringKeys } from './bdScoringKeys';

type Tab = 'companies' | 'templates' | 'editor';

const FALLBACK_TIER_OPTIONS = [
  { key: 'tier1', label: 'Tier 1' },
  { key: 'tier2', label: 'Tier 2' },
  { key: 'tier3', label: 'Tier 3' },
  { key: 'tier4', label: 'Tier 4' },
];

export default function BdScoringPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('companies');
  const [templateId, setTemplateId] = useState('');
  const [tier, setTier] = useState('');
  const [search, setSearch] = useState('');
  const [listContext, setListContext] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<BdScoredCompany | null>(null);

  const [editorId, setEditorId] = useState('');
  const [editorJson, setEditorJson] = useState('{\n  "modules": []\n}');
  const [editorName, setEditorName] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [sampleFv, setSampleFv] = useState('{}');

  const [genBrief, setGenBrief] = useState('');
  const [genAudience, setGenAudience] = useState('');
  const [genDirection, setGenDirection] = useState('');

  const templatesQ = useQuery({
    queryKey: bdScoringKeys.templates(),
    queryFn: () => bdScoringService.listTemplates(),
  });
  const templates = templatesQ.data?.templates ?? [];

  const activeTemplateId = templateId || templates[0]?.id || '';
  const activeTemplate = templates.find((t) => t.id === activeTemplateId);

  const tierOptions = useMemo(() => {
    const fromTpl = (activeTemplate?.config?.tier_thresholds || [])
      .map((t) => ({
        key: String(t.key || '').trim(),
        label: String(t.label || t.key || '').trim(),
      }))
      .filter((t) => t.key);
    return fromTpl.length ? fromTpl : FALLBACK_TIER_OPTIONS;
  }, [activeTemplate]);

  const companiesQ = useQuery({
    queryKey: bdScoringKeys.companies(activeTemplateId, { tier, search, listContext }),
    queryFn: () =>
      bdScoringService.listCompanies({
        templateId: activeTemplateId,
        tier: tier || undefined,
        search: search || undefined,
        listContext: listContext || undefined,
      }),
    enabled: Boolean(activeTemplateId),
  });

  const contextsQ = useQuery({
    queryKey: bdScoringKeys.contexts(activeTemplateId),
    queryFn: () => bdScoringService.listContexts(activeTemplateId),
    enabled: Boolean(activeTemplateId),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => bdScoringService.deleteCompany(id),
    onSuccess: () => {
      toast.success('Deleted.');
      void qc.invalidateQueries({ queryKey: bdScoringKeys.all });
    },
    onError: (e: unknown) => toast.error(isApiError(e) ? e.message : 'Delete failed.'),
  });

  const importMut = useMutation({
    mutationFn: (file: File) => bdScoringService.importCsv(activeTemplateId, file),
    onSuccess: (res) => {
      toast.success(`Import: created ${res.created}, skipped ${res.skipped}`);
      if (res.errors?.length) toast.error(res.errors.join(' · '));
      void qc.invalidateQueries({ queryKey: bdScoringKeys.all });
    },
    onError: (e: unknown) => toast.error(isApiError(e) ? e.message : 'Import failed.'),
  });

  const saveTemplateMut = useMutation({
    mutationFn: async () => {
      let config: TemplateConfig;
      try {
        config = JSON.parse(editorJson) as TemplateConfig;
      } catch {
        throw Object.assign(new Error('Invalid JSON'), { status: 400, message: 'Invalid JSON' });
      }
      if (editorId) {
        return bdScoringService.updateTemplate(editorId, { name: editorName || undefined, config });
      }
      return bdScoringService.createTemplate({ name: editorName || 'Custom template', config });
    },
    onSuccess: (res) => {
      setEditorError(null);
      toast.success(res.template.isSystem ? 'Saved' : `Saved ${res.template.name}`);
      setEditorId(res.template.id);
      void qc.invalidateQueries({ queryKey: bdScoringKeys.templates() });
    },
    onError: (e: unknown) => {
      const msg = isApiError(e) ? e.message : 'Save failed.';
      setEditorError(msg);
      toast.error(msg);
    },
  });

  const generateMut = useMutation({
    mutationFn: () =>
      bdScoringService.generateTemplate({
        description: genBrief,
        targetUserType: genAudience || undefined,
        scoringDirection: genDirection || undefined,
      }),
    onSuccess: (res) => {
      const d = res.draft;
      setEditorId('');
      setEditorName(d.name || 'AI Generated Template');
      setEditorJson(JSON.stringify(d.config ?? {}, null, 2));
      setEditorError(null);
      setTab('editor');
      toast.success(
        d.provider
          ? `Draft ready (via ${d.provider}). Review and save.`
          : 'Draft ready. Review and save.',
      );
    },
    onError: (e: unknown) => toast.error(isApiError(e) ? e.message : 'Generate failed.'),
  });

  const editorPreview = useMemo(() => {
    try {
      const config = JSON.parse(editorJson) as TemplateConfig;
      const fv = JSON.parse(sampleFv) as Record<string, unknown>;
      return computeScore(config, fv as never);
    } catch {
      return null;
    }
  }, [editorJson, sampleFv]);

  const openEditor = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditorId(t.id);
    setEditorName(t.name);
    setEditorJson(JSON.stringify(t.config, null, 2));
    setEditorError(null);
    setTab('editor');
  };

  return (
    <div className="container" data-testid="bd-scoring-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h1 className="mb-1">BD Scoring</h1>
          <p className="text-muted mb-0">
            Template-driven company scoring with live preview that matches the server.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2" role="tablist" aria-label="BD scoring sections">
          {(
            [
              ['companies', 'Companies'],
              ['templates', 'Templates'],
              ['editor', 'Template editor'],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              variant={tab === id ? 'standard' : 'popup-secondary'}
              onClick={() => setTab(id)}
              data-testid={`bd-tab-${id}`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {tab === 'templates' ? (
        <section data-testid="bd-templates">
          <div className="border rounded p-3 mb-4" data-testid="bd-generate-panel">
            <h2 className="h6 mb-2">Generate template with AI</h2>
            <p className="text-muted small mb-3">
              Describe your scoring needs. We draft a template with Claude, then OpenAI, then
              Gemini. Review the JSON before saving.
            </p>
            <div className="mb-2">
              <label className="form-label" htmlFor="bd-gen-brief">
                What should this template score?
              </label>
              <textarea
                id="bd-gen-brief"
                className="form-control"
                rows={4}
                value={genBrief}
                onChange={(e) => setGenBrief(e.target.value)}
                placeholder="e.g. Sell-side scoring for specialty trade contractors: prioritize revenue $3–20M, family ownership, US Midwest HQ, and deal-readiness signals…"
                data-testid="bd-gen-brief"
              />
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-end mb-2">
              <div>
                <label className="form-label" htmlFor="bd-gen-audience">
                  Audience
                </label>
                <select
                  id="bd-gen-audience"
                  className="form-select form-select-sm"
                  value={genAudience}
                  onChange={(e) => setGenAudience(e.target.value)}
                  data-testid="bd-gen-audience"
                >
                  <option value="">Any</option>
                  <option value="ibanking">Investment banking</option>
                  <option value="pe">Private equity</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="bd-gen-direction">
                  Direction
                </label>
                <select
                  id="bd-gen-direction"
                  className="form-select form-select-sm"
                  value={genDirection}
                  onChange={(e) => setGenDirection(e.target.value)}
                  data-testid="bd-gen-direction"
                >
                  <option value="">Any</option>
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                </select>
              </div>
              <Button
                type="button"
                variant="standard"
                className="btn-sm"
                loading={generateMut.isPending}
                disabled={genBrief.trim().length < 20}
                onClick={() => generateMut.mutate()}
                data-testid="bd-gen-submit"
              >
                Generate draft
              </Button>
            </div>
          </div>

          <BaseTable
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (t) => (
                  <>
                    {t.name} {t.isDefault ? <Badge tone="info">Default</Badge> : null}
                  </>
                ),
              },
              { key: 'targetUserType', header: 'Audience', render: (t) => t.targetUserType },
              { key: 'scoringDirection', header: 'Direction', render: (t) => t.scoringDirection },
              {
                key: 'source',
                header: 'Source',
                render: (t) => (t.isSystem ? <Badge tone="secondary">System</Badge> : 'Org'),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (t) => (
                  <>
                    <Button
                      type="button"
                      variant="standard"
                      className="btn-sm me-1"
                      onClick={() => {
                        setTemplateId(t.id);
                        setTab('companies');
                      }}
                    >
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="clear-all-text"
                      className="btn-sm"
                      onClick={() => openEditor(t.id)}
                    >
                      Edit JSON
                    </Button>
                  </>
                ),
              },
            ]}
            rows={templates}
            getRowKey={(t) => t.id}
          />
        </section>
      ) : null}

      {tab === 'companies' ? (
        <section data-testid="bd-companies">
          <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
            <div>
              <label className="form-label" htmlFor="bd-list-template">
                Template
              </label>
              <select
                id="bd-list-template"
                className="form-select form-select-sm"
                value={activeTemplateId}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  setTier('');
                }}
                data-testid="bd-list-template"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="bd-tier">
                Tier
              </label>
              <select
                id="bd-tier"
                className="form-select form-select-sm"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                data-testid="bd-tier"
              >
                <option value="">All</option>
                {tierOptions.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
                <option value="disqualified">Disqualified</option>
                <option value="unscored">Unscored</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="bd-search">
                Search
              </label>
              <input
                id="bd-search"
                className="form-control form-control-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="bd-lc">
                List context
              </label>
              <select
                id="bd-lc"
                className="form-select form-select-sm"
                value={listContext}
                onChange={(e) => setListContext(e.target.value)}
              >
                <option value="">All</option>
                {(contextsQ.data?.contexts || []).map((c) => (
                  <option key={c.listContext} value={c.listContext}>
                    {c.listContext} ({c.count})
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="standard"
              className="btn-sm"
              onClick={() => {
                setEditCompany(null);
                setDrawerOpen(true);
              }}
              data-testid="bd-add-company"
            >
              Score company
            </Button>
            <Button
              type="button"
              variant="standard"
              className="btn-sm"
              onClick={() => fileRef.current?.click()}
              data-testid="bd-import-csv"
            >
              Import CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="d-none"
              aria-label="Import scored companies CSV"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importMut.mutate(f);
                e.target.value = '';
              }}
            />
          </div>

          {drawerOpen ? (
            <div className="mb-4">
              <ScoringDrawer
                templates={templates}
                initialTemplateId={activeTemplateId}
                company={editCompany}
                onClose={() => {
                  setDrawerOpen(false);
                  setEditCompany(null);
                }}
              />
            </div>
          ) : null}

          <BaseTable<BdScoredCompany>
            rowTestId={(c) => `bd-company-${c.id}`}
            columns={[
              { key: 'companyName', header: 'Company', render: (c) => c.companyName || '—' },
              { key: 'scoreTotal', header: 'Score', render: (c) => c.scoreTotal },
              {
                key: 'tier',
                header: 'Tier',
                render: (c) => <Badge tone={c.isDisqualified ? 'danger' : 'info'}>{c.tier}</Badge>,
              },
              { key: 'listContext', header: 'Context', render: (c) => c.listContext || '—' },
              {
                key: 'actions',
                header: 'Actions',
                render: (c) => (
                  <>
                    <Button
                      type="button"
                      variant="clear-all-text"
                      className="btn-sm me-1"
                      onClick={() => {
                        setEditCompany(c);
                        setDrawerOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="clear-all-text"
                      className="btn-sm"
                      onClick={() => {
                        if (window.confirm(`Delete ${c.companyName}?`)) deleteMut.mutate(c.id);
                      }}
                    >
                      Delete
                    </Button>
                  </>
                ),
              },
            ]}
            rows={companiesQ.data?.companies || []}
            getRowKey={(c) => c.id}
            loading={companiesQ.isLoading}
            emptyMessage="No scored companies yet."
          />
        </section>
      ) : null}

      {tab === 'editor' ? (
        <section data-testid="bd-template-editor">
          <p className="text-muted">
            JSON-driven template editor. Editing a system template clones it into your org.
          </p>
          <div className="mb-2">
            <label className="form-label" htmlFor="bd-editor-name">
              Name
            </label>
            <input
              id="bd-editor-name"
              className="form-control"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
            />
          </div>
          <div className="mb-2">
            <label className="form-label" htmlFor="bd-editor-json">
              Config JSON
            </label>
            <textarea
              id="bd-editor-json"
              className="form-control font-monospace"
              rows={16}
              value={editorJson}
              onChange={(e) => setEditorJson(e.target.value)}
              data-testid="bd-editor-json"
            />
          </div>
          <div className="mb-2">
            <label className="form-label" htmlFor="bd-sample-fv">
              Sample field values (JSON) for live preview
            </label>
            <textarea
              id="bd-sample-fv"
              className="form-control font-monospace"
              rows={4}
              value={sampleFv}
              onChange={(e) => setSampleFv(e.target.value)}
            />
          </div>
          {editorPreview ? (
            <div className="mb-2" data-testid="bd-editor-preview">
              Preview score {editorPreview.score_total} · tier {editorPreview.tier}
            </div>
          ) : (
            <div className="text-muted mb-2">Fix JSON to preview.</div>
          )}
          {editorError ? (
            <div className="alert alert-danger py-2" role="alert" data-testid="bd-editor-error">
              {editorError}
            </div>
          ) : null}
          <Button
            type="button"
            variant="standard"
            loading={saveTemplateMut.isPending}
            onClick={() => saveTemplateMut.mutate()}
            data-testid="bd-editor-save"
          >
            Save template
          </Button>
        </section>
      ) : null}
    </div>
  );
}
