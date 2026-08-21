// Import companies from a saved research list into the deal pipeline (QURALYST-20 parity).
import { useEffect, useMemo, useState } from 'react';
import { Modal, Spinner } from '@/components/ui';
import { dealsService, resultsService, type Deal, type DealStage } from '@/services/api';
import { companyNameOf } from '@/features/results/resultDetail/fitBucket';
import { useToast } from '@/hooks/useToast';
import type { ResultSummary, ResultTab } from '@/types';
import '@/styles/pages/deals.css';

type ListKind = 'target' | 'strategic' | 'financial';

const KIND_TABS: { key: ListKind; label: string; tab: ResultTab }[] = [
  { key: 'target', label: 'Target lists', tab: 'target-list' },
  { key: 'strategic', label: 'Strategic buyers', tab: 'strategic-buyer' },
  { key: 'financial', label: 'Financial buyers', tab: 'fv-results' },
];

function normalizeFirmKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Result rows use display headers ("Company Name", "Website") — not camelCase keys. */
function rowWebsite(row: Record<string, string>): string {
  return String(
    row.Website ||
      row.website ||
      row.Domain ||
      row.domain ||
      row.URL ||
      row.url ||
      row['Company Website'] ||
      '',
  ).trim();
}

function rowPredictedFit(row: Record<string, string>): string {
  return String(
    row['Fit/No Fit'] ||
      row['Fit Verdict'] ||
      row['Predicted Fit'] ||
      row.predictedFit ||
      row.predicted_fit ||
      row.Fit ||
      '',
  ).trim();
}

function listId(r: ResultSummary, kind: ListKind): string {
  if (kind === 'financial') return r.resultId || r.processId || '';
  return r.processId || r.resultId || '';
}

interface ListCompany {
  name: string;
  website: string;
  predictedFit: string;
  firmKey: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  deal: Deal;
  onImported: () => void;
}

export default function ImportFromListDialog({ open, onClose, deal, onImported }: Props) {
  const toast = useToast();
  const [kind, setKind] = useState<ListKind>('target');
  const [lists, setLists] = useState<ResultSummary[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [companies, setCompanies] = useState<ListCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [stageId, setStageId] = useState('');
  const [busy, setBusy] = useState(false);

  const stages: DealStage[] = useMemo(
    () => [...deal.stages].sort((a, b) => a.order - b.order),
    [deal.stages],
  );

  // Reset picker state only when the dialog opens (not on every stages identity change).
  useEffect(() => {
    if (!open) return;
    setKind('target');
    setSelectedListId('');
    setCompanies([]);
    setSelected(new Set());
    setSearch('');
    setLoadError('');
    setStageId(stages[0]?.stageId ?? '');
    void dealsService
      .listCompanies(deal.id)
      .then((rows) => {
        setExistingKeys(new Set(rows.map((r) => normalizeFirmKey(r.companyName))));
      })
      .catch(() => setExistingKeys(new Set()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal.id]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setListsLoading(true);
    setSelectedListId('');
    setCompanies([]);
    setSelected(new Set());
    setLoadError('');
    const tab = KIND_TABS.find((k) => k.key === kind)!.tab;
    resultsService
      // "all" users — same default as Previous Results; "me" often returns empty for org-shared runs.
      .list(tab, { page: 1, timeRange: 'all', sortBy: 'newest', userFilter: 'all' })
      .then((res) => {
        if (active) setLists(res.results ?? []);
      })
      .catch(() => {
        if (active) {
          setLists([]);
          toast.error('Could not load research lists.');
        }
      })
      .finally(() => {
        if (active) setListsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind]);

  useEffect(() => {
    if (!open || !selectedListId) {
      setCompanies([]);
      setLoadError('');
      return;
    }
    let active = true;
    setCompaniesLoading(true);
    setLoadError('');
    resultsService
      .get(selectedListId)
      .then((detail) => {
        if (!active) return;
        const raw = (detail.rows ?? []) as Record<string, string>[];
        const mapped: ListCompany[] = [];
        const seen = new Set<string>();
        for (const row of raw) {
          const name = companyNameOf(row);
          if (!name) continue;
          const firmKey = normalizeFirmKey(name);
          if (!firmKey || seen.has(firmKey)) continue;
          seen.add(firmKey);
          mapped.push({
            name,
            website: rowWebsite(row),
            predictedFit: rowPredictedFit(row),
            firmKey,
          });
        }
        setCompanies(mapped);
        if (raw.length > 0 && mapped.length === 0) {
          setLoadError(
            `Loaded ${raw.length} rows but could not find company-name columns. Try another list.`,
          );
        }
      })
      .catch((err) => {
        if (!active) return;
        setCompanies([]);
        setLoadError((err as { message?: string })?.message ?? 'Could not load list companies.');
      })
      .finally(() => {
        if (active) setCompaniesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, selectedListId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, search]);

  const selectable = useMemo(
    () => filtered.filter((c) => !existingKeys.has(c.firmKey)).map((c) => c.firmKey),
    [filtered, existingKeys],
  );

  const allSelected = selectable.length > 0 && selectable.every((k) => selected.has(k));

  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        selectable.forEach((k) => next.delete(k));
        return next;
      }
      return new Set([...prev, ...selectable]);
    });
  };

  const importSelected = async () => {
    if (!selected.size) {
      toast.error('Select at least one company.');
      return;
    }
    setBusy(true);
    try {
      const byKey = new Map(companies.map((c) => [c.firmKey, c]));
      const rows = [...selected]
        .map((k) => byKey.get(k))
        .filter(Boolean)
        .map((c) => ({
          companyName: c!.name,
          website: c!.website,
          predictedFit: c!.predictedFit,
          stageId: stageId || undefined,
          sourceResultId: selectedListId,
        }));
      // Chunk large imports (backend accepts the full payload; keep UI responsive).
      const CHUNK = 25;
      let added = 0;
      let skipped = 0;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const res = await dealsService.bulkAdd(deal.id, rows.slice(i, i + CHUNK));
        added += res.added;
        skipped += res.skipped.length;
      }
      toast.success(`Added ${added} companies${skipped ? `, skipped ${skipped}` : ''}.`);
      onImported();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const listLabel = (r: ResultSummary) => {
    const count = r.totalMatches ?? r.totalCount ?? 0;
    const title = (r.resultFilename || '').replace(/\.[^.]+$/, '') || r.username || 'Untitled list';
    const ver = r.version ? ` · v${r.version}` : '';
    return `${title} · ${count} companies${ver}`;
  };

  return (
    <Modal open={open} onClose={onClose} title="Import from list" size="xl">
      <div className="deal-import">
        <p className="deal-import__hint">
          Choose a saved research list, select companies, and add them to this deal&apos;s pipeline.
        </p>

        <div className="deal-import-kinds" role="tablist" aria-label="List type">
          {KIND_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={kind === t.key}
              className={`deal-import-kinds__btn${kind === t.key ? ' is-active' : ''}`}
              onClick={() => setKind(t.key)}
              disabled={busy}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="deal-import-layout">
          <div className="deal-import-pane">
            <p className="deal-import-pane__title">Saved lists</p>
            <div className="deal-import-lists" role="listbox" aria-label="Saved lists">
              {listsLoading ? (
                <div className="p-4 text-center">
                  <Spinner size="sm" />
                </div>
              ) : lists.length === 0 ? (
                <p className="deal-import-empty">No saved lists in this category.</p>
              ) : (
                lists.map((r) => {
                  const id = listId(r, kind);
                  if (!id) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={selectedListId === id}
                      className={`deal-import-list-item${selectedListId === id ? ' is-active' : ''}`}
                      onClick={() => {
                        setSelectedListId(id);
                        setSelected(new Set());
                        setSearch('');
                      }}
                    >
                      {listLabel(r)}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="deal-import-pane">
            <p className="deal-import-pane__title">Companies</p>
            {!selectedListId ? (
              <p className="deal-import-empty">Pick a list on the left to preview companies.</p>
            ) : companiesLoading ? (
              <div className="p-4 text-center">
                <Spinner size="sm" />
                <p className="small text-muted mt-2 mb-0">Loading companies…</p>
              </div>
            ) : (
              <>
                <div className="deal-import-toolbar">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Search companies…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search companies in list"
                  />
                  <button
                    type="button"
                    className="deal-btn deal-btn--ghost deal-btn--sm"
                    onClick={toggleAll}
                    disabled={!selectable.length}
                  >
                    {allSelected ? 'Clear' : 'Select all'}
                  </button>
                  <span className="small text-muted">
                    {filtered.length} shown
                    {selectable.length < filtered.length
                      ? ` · ${filtered.length - selectable.length} in deal`
                      : ''}
                  </span>
                </div>
                {loadError && (
                  <p className="small text-danger px-3 pt-2 mb-0" role="alert">
                    {loadError}
                  </p>
                )}
                <div className="deal-import-companies">
                  {filtered.length === 0 ? (
                    <p className="deal-import-empty">No companies in this list.</p>
                  ) : (
                    filtered.map((c) => {
                      const inDeal = existingKeys.has(c.firmKey);
                      return (
                        <label
                          key={c.firmKey}
                          className={`deal-import-row${inDeal ? ' is-in-deal' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(c.firmKey)}
                            disabled={inDeal || busy}
                            onChange={() => {
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(c.firmKey)) next.delete(c.firmKey);
                                else next.add(c.firmKey);
                                return next;
                              });
                            }}
                          />
                          <span className="flex-grow-1 text-truncate" title={c.name}>
                            {c.name}
                          </span>
                          {inDeal && <span className="small text-success">In deal</span>}
                        </label>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="deal-import-footer">
          <div className="deal-import-footer__stage">
            <label className="form-label mb-1" htmlFor="import-stage">
              Destination stage
            </label>
            <select
              id="import-stage"
              className="form-select form-select-sm"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              disabled={busy}
            >
              {stages.map((s) => (
                <option key={s.stageId} value={s.stageId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="deal-btn deal-btn--ghost"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="deal-btn"
              onClick={importSelected}
              disabled={busy || selected.size === 0}
            >
              {busy ? <Spinner size="sm" /> : null}{' '}
              {selected.size > 0 ? `Add ${selected.size} to pipeline` : 'Add to pipeline'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
