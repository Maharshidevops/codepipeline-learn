// Knowledge Bank (Tier A / A1). Analysts store playbooks / scoring criteria / theses; the backend
// chunks + embeds them and injects the most relevant snippets into research scoring prompts.
// Layout mirrors the Replit reference: header actions, retrieval preview, entry cards, create/edit
// + insights modals.
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Checkbox, Modal, Spinner } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { knowledgeService } from '@/services/api';
import type {
  KnowledgeEntrySummary,
  KnowledgeEntryDetail,
  KnowledgeCategory,
  KnowledgeListType,
  KnowledgeSearchResult,
  EmbeddingStatus,
} from '@/services/api';
import { useToast } from '@/hooks/useToast';
import '@/styles/pages/knowledge-bank.css';

const CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: 'scoring_criteria', label: 'scoring criteria' },
  { value: 'buy_box', label: 'buy box' },
  { value: 'thesis', label: 'thesis' },
  { value: 'playbook', label: 'playbook' },
  { value: 'general', label: 'general' },
];

const LIST_TYPES: { value: KnowledgeListType; label: string }[] = [
  { value: 'target', label: 'Target' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'financial', label: 'Financial' },
];

const STATUS_BADGE: Record<EmbeddingStatus, { tone: BadgeTone; label: string; icon: string }> = {
  ready: { tone: 'success', label: 'Indexed', icon: 'bi-check-circle' },
  partial: { tone: 'warning', label: 'Partial', icon: 'bi-exclamation-triangle' },
  failed: { tone: 'danger', label: 'Not indexed', icon: 'bi-exclamation-triangle' },
  pending: { tone: 'secondary', label: 'Pending', icon: 'bi-hourglass-split' },
};

interface FormState {
  id: string;
  title: string;
  category: KnowledgeCategory;
  body: string;
  appliesTo: KnowledgeListType[];
  tags: string;
}

const EMPTY_FORM: FormState = {
  id: '',
  title: '',
  category: 'general',
  body: '',
  appliesTo: [],
  tags: '',
};

function StatusBadge({ status }: { status: EmbeddingStatus }) {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <Badge tone={badge.tone}>
      <i className={`bi ${badge.icon}`} aria-hidden />
      {badge.label}
    </Badge>
  );
}

export default function KnowledgeBankPage() {
  const toast = useToast();
  const [entries, setEntries] = useState<KnowledgeEntrySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [searchQ, setSearchQ] = useState('');
  const [searchType, setSearchType] = useState<KnowledgeListType | ''>('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [chunksOpen, setChunksOpen] = useState(false);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksEntry, setChunksEntry] = useState<KnowledgeEntryDetail | null>(null);
  const [chunkFilter, setChunkFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    return knowledgeService
      .list()
      .then(setEntries)
      .catch((e) =>
        toast.error((e as { message?: string })?.message ?? 'Failed to load knowledge entries.'),
      )
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    knowledgeService
      .list()
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch((e) => {
        if (active)
          toast.error((e as { message?: string })?.message ?? 'Failed to load knowledge entries.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditorOpen(true);
  };

  const openEdit = async (entry: KnowledgeEntrySummary) => {
    try {
      const detail = await knowledgeService.get(entry.id);
      setForm({
        id: detail.id,
        title: detail.title,
        category: (detail.category as KnowledgeCategory) || 'general',
        body: detail.body || '',
        appliesTo: (detail.applies_to as KnowledgeListType[]) || [],
        tags: (detail.tags || []).join(', '),
      });
      setEditorOpen(true);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not load entry.');
    }
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setForm({ ...EMPTY_FORM });
  };

  const toggleType = (lt: KnowledgeListType) =>
    setForm((f) => ({
      ...f,
      appliesTo: f.appliesTo.includes(lt)
        ? f.appliesTo.filter((x) => x !== lt)
        : [...f.appliesTo, lt],
    }));

  const handleSave = async () => {
    const title = form.title.trim();
    const body = form.body.trim();
    if (!title || !body) {
      toast.error('Title and content are required.');
      return;
    }
    const payload = {
      title,
      body: form.body,
      category: form.category,
      applies_to: form.appliesTo,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    setSaving(true);
    try {
      const saved = form.id
        ? await knowledgeService.update(form.id, payload)
        : await knowledgeService.create(payload);
      toast.success(form.id ? 'Saved.' : 'Created.');
      if (saved.embedding_status === 'failed') {
        toast.error(
          saved.embedding_error ?? 'Embedding failed — this entry will not guide scoring.',
        );
      }
      closeEditor();
      await load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: KnowledgeEntrySummary) => {
    if (!window.confirm(`Delete “${entry.title}”?`)) return;
    try {
      await knowledgeService.remove(entry.id);
      toast.success('Deleted.');
      await load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Delete failed.');
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const created = await knowledgeService.upload(file, { title: file.name });
      toast.success(`${file.name} added to the knowledge bank.`);
      if (created.embedding_status === 'failed') {
        toast.error(created.embedding_error ?? 'Embedding failed for the uploaded document.');
      }
      await load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const openChunks = async (entry: KnowledgeEntrySummary) => {
    setChunksEntry(null);
    setChunkFilter('');
    setChunksOpen(true);
    setChunksLoading(true);
    try {
      const detail = await knowledgeService.get(entry.id);
      setChunksEntry(detail);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not load insights.');
      setChunksOpen(false);
    } finally {
      setChunksLoading(false);
    }
  };

  const runSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const r = await knowledgeService.search(searchQ.trim(), {
        listType: searchType || undefined,
        topK: 5,
      });
      setSearchResults(r.results);
      if (r.warning) toast.error(r.warning);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const chunks = chunksEntry?.chunks ?? [];
  const chunkQ = chunkFilter.trim().toLowerCase();
  const filteredChunks = chunkQ
    ? chunks.filter((c) => c.text.toLowerCase().includes(chunkQ))
    : chunks;

  return (
    <div className="kb-page" data-testid="knowledge-bank-page">
      <div className="kb-page__header">
        <div>
          <h1 className="kb-page__title">
            <i className="bi bi-book kb-page__title-icon" aria-hidden />
            Knowledge Bank
          </h1>
          <p className="kb-page__desc">
            Analyst-authored notes and playbooks (scoring criteria, buy-box logic, investment
            theses). Relevant snippets are retrieved and injected into the scoring and rationale for
            target, strategic and financial buyer lists.
          </p>
        </div>
        <div className="kb-page__actions">
          <label className="btn btn-outline-secondary rounded-pill mb-0">
            {uploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden />
                Uploading…
              </>
            ) : (
              <>
                <i className="bi bi-upload me-2" aria-hidden />
                Upload file
              </>
            )}
            <input
              type="file"
              accept=".txt,.md,.csv,.pdf,.json,.jsonl,.ndjson"
              hidden
              disabled={uploading}
              data-testid="input-upload-knowledge"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = '';
                void handleUpload(file);
              }}
            />
          </label>
          <Button className="rounded-pill" onClick={openCreate} data-testid="button-new-knowledge">
            <i className="bi bi-plus-lg me-2" aria-hidden />
            New note
          </Button>
        </div>
      </div>

      <div className="criteria-card criteria-card--white mb-0">
        <h3 className="api-keys-title mb-1">
          <i className="bi bi-search me-2" aria-hidden />
          Test retrieval
        </h3>
        <p className="text-muted small mb-3">
          Preview which guidance the scoring engine would pull for a given mandate.
        </p>
        <div className="kb-retrieval__controls">
          <input
            className="form-control"
            placeholder="e.g. vertical SaaS, $5M EBITDA, founder-owned"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runSearch();
            }}
            data-testid="input-search-knowledge"
          />
          <select
            className="form-select"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as KnowledgeListType | '')}
            aria-label="List type filter"
          >
            <option value="">All list types</option>
            {LIST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Button
            className="rounded-pill"
            onClick={() => void runSearch()}
            disabled={searching || !searchQ.trim()}
            loading={searching}
          >
            Search
          </Button>
        </div>
        {searchResults !== null && (
          <div className="mt-3">
            {searchResults.length === 0 ? (
              <p className="text-muted small mb-0">No matching guidance found.</p>
            ) : (
              searchResults.map((r) => (
                <div key={`${r.entry_id}-${r.score}`} className="kb-search-hit">
                  <div className="kb-search-hit__row">
                    <span className="fw-semibold">{r.title}</span>
                    <Badge tone="secondary">{(r.score * 100).toFixed(0)}% match</Badge>
                  </div>
                  <p className="kb-search-hit__snippet">{r.snippet}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="org-tab-loading criteria-card criteria-card--white mb-0">
          <Spinner />
        </div>
      ) : entries.length === 0 ? (
        <div className="criteria-card criteria-card--white mb-0">
          <div className="kb-empty">
            No knowledge entries yet. Create a note or upload a playbook to get started.
          </div>
        </div>
      ) : (
        <div className="kb-entries">
          {entries.map((entry) => {
            const applies =
              entry.applies_to?.length > 0
                ? entry.applies_to
                : (['target', 'strategic', 'financial'] as KnowledgeListType[]);
            return (
              <div
                key={entry.id}
                className="criteria-card criteria-card--white kb-entry"
                data-testid={`knowledge-entry-${entry.id}`}
              >
                <div className="kb-entry__body">
                  <div className="min-w-0">
                    <div className="kb-entry__meta">
                      <span className="kb-entry__title">{entry.title}</span>
                      <Badge tone="info">{entry.category.replace(/_/g, ' ')}</Badge>
                      <StatusBadge status={entry.embedding_status} />
                    </div>
                    <div className="kb-entry__lists">
                      {applies.map((t) => (
                        <Badge key={t} tone="secondary">
                          {t}
                        </Badge>
                      ))}
                      {(!entry.applies_to || entry.applies_to.length === 0) && (
                        <span className="kb-entry__all-lists">(all lists)</span>
                      )}
                    </div>
                    {entry.body_preview && (
                      <p className="kb-entry__preview">{entry.body_preview}</p>
                    )}
                    {entry.embedding_status === 'failed' && entry.embedding_error && (
                      <p className="kb-entry__error">{entry.embedding_error}</p>
                    )}
                  </div>
                  <div className="kb-entry__actions">
                    <button
                      type="button"
                      className="btn btn-link btn-sm"
                      onClick={() => void openChunks(entry)}
                      disabled={!entry.chunk_count}
                      data-testid={`button-chunks-${entry.id}`}
                    >
                      <i className="bi bi-layers me-1" aria-hidden />
                      {entry.chunk_count} {entry.chunk_count === 1 ? 'insight' : 'insights'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm"
                      onClick={() => void openEdit(entry)}
                      aria-label={`Edit ${entry.title}`}
                      data-testid={`button-edit-${entry.id}`}
                    >
                      <i className="bi bi-pencil" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm kb-entry__delete"
                      onClick={() => void handleDelete(entry)}
                      aria-label={`Delete ${entry.title}`}
                      data-testid={`button-delete-${entry.id}`}
                    >
                      <i className="bi bi-trash" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={closeEditor}
        title={form.id ? 'Edit note' : 'New note'}
        size="lg"
      >
        <p className="kb-modal-desc">
          Notes are chunked and embedded for semantic retrieval during scoring.
        </p>
        <div className="mb-3">
          <label className="form-label" htmlFor="kb-title">
            Title
          </label>
          <input
            id="kb-title"
            className="form-control"
            value={form.title}
            maxLength={300}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            data-testid="input-knowledge-title"
          />
        </div>
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="kb-category">
              Category
            </label>
            <select
              id="kb-category"
              className="form-select"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as KnowledgeCategory }))
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="kb-tags">
              Tags (comma-separated)
            </label>
            <input
              id="kb-tags"
              className="form-control"
              value={form.tags}
              placeholder="saas, founder-owned"
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </div>
        </div>
        <div className="mb-3">
          <span className="form-label d-block mb-1">Applies to</span>
          <div className="d-flex flex-wrap gap-3">
            {LIST_TYPES.map((t) => (
              <Checkbox
                key={t.value}
                id={`kb-applies-${t.value}`}
                label={t.label}
                checked={form.appliesTo.includes(t.value)}
                onChange={() => toggleType(t.value)}
              />
            ))}
          </div>
          <p className="text-muted small mt-1 mb-0">
            Leave all unchecked to apply to every list type.
          </p>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="kb-body">
            Content
          </label>
          <textarea
            id="kb-body"
            className="form-control"
            rows={10}
            value={form.body}
            placeholder="Scoring criteria, buy-box logic, investment thesis…"
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            data-testid="input-knowledge-body"
          />
        </div>
        <div className="d-flex justify-content-end gap-2">
          <Button variant="popup-secondary" onClick={closeEditor} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="popup-primary"
            onClick={() => void handleSave()}
            loading={saving}
            data-testid="button-save-knowledge"
          >
            {form.id ? 'Save changes' : 'Create'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={chunksOpen}
        onClose={() => setChunksOpen(false)}
        title={chunksEntry?.title || 'Insights'}
        size="lg"
      >
        <p className="kb-modal-desc">
          Each insight is an individually embedded, retrievable unit. These are the exact snippets
          the scoring engine can pull into a buyer list.
        </p>
        {chunksLoading ? (
          <div className="org-tab-loading py-5">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="kb-chunks-filter">
              <input
                className="form-control"
                placeholder="Filter insights…"
                value={chunkFilter}
                onChange={(e) => setChunkFilter(e.target.value)}
                data-testid="input-filter-chunks"
              />
              <span className="kb-chunks-count">
                {filteredChunks.length} of {chunks.length}
              </span>
            </div>
            <div className="kb-chunks-scroll">
              {chunks.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">
                  This entry has no indexed insights yet.
                </p>
              ) : filteredChunks.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">
                  No insights match “{chunkFilter}”.
                </p>
              ) : (
                filteredChunks.map((c) => (
                  <div key={c.index} className="kb-chunk" data-testid={`chunk-${c.index}`}>
                    <div className="kb-chunk__head">
                      <Badge tone="info">Insight {c.index + 1}</Badge>
                      {!c.embedded && (
                        <Badge tone="warning">
                          <i className="bi bi-exclamation-triangle" aria-hidden />
                          Not indexed
                        </Badge>
                      )}
                    </div>
                    <p className="kb-chunk__text">{c.text}</p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
