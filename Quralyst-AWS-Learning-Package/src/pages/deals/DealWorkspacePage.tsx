// Deal workspace — Pipeline / Buyer Log / Research Lists + Settings slide-over (Q20 parity).
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, Spinner } from '@/components/ui';
import {
  dealsService,
  type Deal,
  type DealActivity,
  type DealStage,
  type MemberCandidate,
} from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';
import PipelineTab from '@/features/deals/PipelineTab';
import BuyerLogTab from '@/features/deals/BuyerLogTab';
import ResearchListsTab from '@/features/deals/ResearchListsTab';
import ImportFromListDialog from '@/features/deals/ImportFromListDialog';
import '@/styles/pages/deals.css';

type View = 'pipeline' | 'buyerLog' | 'lists';

function DealTypeBadge({ type }: { type: Deal['dealType'] }) {
  const sell = type === 'sell_side';
  return (
    <span className={`deal-type-badge ${sell ? 'deal-type-badge--sell' : 'deal-type-badge--buy'}`}>
      {sell ? 'Sell-Side' : 'Buy-Side'}
    </span>
  );
}

function PipelineBar({ deal }: { deal: Deal }) {
  const summary = deal.pipelineSummary ?? [];
  const total = summary.reduce((acc, s) => acc + s.count, 0);
  const stages = [...deal.stages].sort((a, b) => a.order - b.order);

  return (
    <div className="deal-pipeline-bar">
      <div className="deal-pipeline-bar__label">
        <span>Pipeline</span>
        <span>· {total} companies</span>
      </div>
      <div className="deal-pipeline-bar__stages">
        {stages.map((stage) => {
          const count = summary.find((s) => s.stageId === stage.stageId)?.count ?? 0;
          return (
            <div key={stage.stageId} className="deal-pipeline-bar__stage">
              <span
                className="deal-stage-dot"
                style={stage.color ? { backgroundColor: stage.color } : undefined}
              />
              <span>{stage.name}</span>
              <span className={`deal-pipeline-bar__count${count === 0 ? ' is-zero' : ''}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DealWorkspacePage() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activity, setActivity] = useState<DealActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('pipeline');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addWebsite, setAddWebsite] = useState('');
  const [addStageId, setAddStageId] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<MemberCandidate[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [newStage, setNewStage] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pipelineKey, setPipelineKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  const isLead = deal?.yourRole === 'lead';

  const load = async () => {
    if (!dealId) return;
    setLoading(true);
    try {
      const d = await dealsService.get(dealId);
      setDeal(d);
      setStages(d.stages);
      setEditName(d.name);
      setEditDescription(d.description || '');
      setAddStageId(d.stages[0]?.stageId ?? '');
      setActivity(await dealsService.activity(dealId));
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to load deal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const apply = (d: Deal) => {
    setDeal(d);
    setStages(d.stages);
    setEditName(d.name);
    setEditDescription(d.description || '');
  };

  const saveDetails = async () => {
    if (!dealId || !editName.trim()) {
      toast.error('Deal name is required.');
      return;
    }
    setBusy(true);
    try {
      apply(
        await dealsService.patch(dealId, {
          name: editName.trim(),
          description: editDescription.trim(),
        }),
      );
      setDetailsSaved(true);
      window.setTimeout(() => setDetailsSaved(false), 2000);
      toast.success('Details saved.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not save details.');
    } finally {
      setBusy(false);
    }
  };

  const moveStage = (idx: number, dir: -1 | 1) => {
    setStages((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  useEffect(() => {
    if (!dealId || memberQuery.trim().length < 2) {
      setMemberResults([]);
      return;
    }
    const t = setTimeout(() => {
      dealsService
        .searchMembers(dealId, memberQuery.trim())
        .then(setMemberResults)
        .catch(() => setMemberResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [dealId, memberQuery]);

  const addMember = async (userId: string) => {
    if (!dealId || !userId) return;
    setBusy(true);
    try {
      apply(await dealsService.addMember(dealId, userId));
      setMemberQuery('');
      setMemberResults([]);
      toast.success('Member added.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not add member.');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (uid: string) => {
    if (!dealId) return;
    setBusy(true);
    try {
      apply(await dealsService.removeMember(dealId, uid));
      toast.success('Member removed.');
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not remove member.');
    } finally {
      setBusy(false);
    }
  };

  const saveStages = async () => {
    if (!dealId || !stages.length) {
      toast.error('A deal needs at least one stage.');
      return;
    }
    setBusy(true);
    try {
      apply(
        await dealsService.replaceStages(
          dealId,
          stages.map((s, i) => ({ ...s, order: i })),
        ),
      );
      toast.success('Stages saved.');
      setPipelineKey((k) => k + 1);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not save stages.');
      try {
        apply(await dealsService.get(dealId));
      } catch {
        /* keep original toast */
      }
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!dealId) return;
    setBusy(true);
    try {
      await dealsService.archive(dealId);
      toast.success('Deal archived.');
      navigate(paths.deals);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not archive.');
    } finally {
      setBusy(false);
    }
  };

  const addCompany = async () => {
    if (!dealId || !addName.trim()) return;
    setBusy(true);
    try {
      await dealsService.addCompany(dealId, {
        companyName: addName.trim(),
        website: addWebsite.trim(),
        stageId: addStageId || undefined,
      });
      toast.success('Company added.');
      setAddOpen(false);
      setAddName('');
      setAddWebsite('');
      setPipelineKey((k) => k + 1);
      apply(await dealsService.get(dealId));
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not add company.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="org-tab-loading">
        <Spinner />
      </div>
    );
  }
  if (!deal) {
    return (
      <div className="content-wrapper criteria-card criteria-card--white p-4">Deal not found.</div>
    );
  }

  const VIEWS: { id: View; label: string }[] = [
    { id: 'pipeline', label: 'Pipeline' },
    ...(deal.dealType === 'sell_side' ? [{ id: 'buyerLog' as View, label: 'Buyer Log' }] : []),
    { id: 'lists', label: 'Research Lists' },
  ];

  return (
    <div className="content-wrapper deals-page deals-page--wide">
      {/* Header — name + actions only */}
      <div className="deal-ws-header">
        <div className="deal-ws-header__left">
          <button
            type="button"
            className="deal-ws-header__back"
            onClick={() => navigate(paths.deals)}
            aria-label="Back to all deals"
          >
            <i className="bi bi-arrow-left" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <div className="deal-ws-header__title-row">
              <h1 className="deal-ws-header__title page-title">{deal.name}</h1>
              <DealTypeBadge type={deal.dealType} />
              {deal.status === 'archived' && (
                <span className="deal-archived-badge">
                  <i className="bi bi-archive" aria-hidden="true" /> Archived
                </span>
              )}
            </div>
            {deal.description ? (
              <p className="deal-ws-header__meta">{deal.description}</p>
            ) : isLead ? (
              <p className="deal-ws-header__meta">You are the lead</p>
            ) : null}
          </div>
        </div>
        <div className="deal-ws-header__actions">
          <button
            type="button"
            className="deal-btn deal-btn--outline deal-btn--sm"
            onClick={() => setImportOpen(true)}
          >
            <i className="bi bi-list-ul" aria-hidden="true" /> Import from list
          </button>
          <button
            type="button"
            className="deal-btn deal-btn--sm"
            onClick={() => {
              setAddStageId(deal.stages[0]?.stageId ?? '');
              setAddOpen(true);
            }}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" /> Add Company
          </button>
          <button
            type="button"
            className="deal-btn deal-btn--ghost deal-btn--sm"
            onClick={() => {
              setEditName(deal.name);
              setEditDescription(deal.description || '');
              setStages(deal.stages);
              setSettingsOpen(true);
            }}
          >
            <i className="bi bi-gear" aria-hidden="true" /> Settings
          </button>
        </div>
      </div>

      <PipelineBar deal={deal} />

      <div className="deal-view-toggle" role="tablist" aria-label="Deal views">
        {VIEWS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={view === t.id}
            className={`deal-view-toggle__btn${view === t.id ? ' is-active' : ''}`}
            onClick={() => setView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'pipeline' && (
        <PipelineTab
          key={pipelineKey}
          deal={deal}
          onDealRefresh={async () => {
            if (!dealId) return;
            apply(await dealsService.get(dealId));
          }}
        />
      )}
      {view === 'buyerLog' && <BuyerLogTab deal={deal} />}
      {view === 'lists' && <ResearchListsTab deal={deal} />}

      <ImportFromListDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        deal={deal}
        onImported={() => {
          setPipelineKey((k) => k + 1);
          void load();
        }}
      />

      {/* Add Company dialog */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Company" size="sm">
        <label className="form-label small fw-semibold" htmlFor="add-co-name">
          Company Name *
        </label>
        <input
          id="add-co-name"
          className="form-control form-control-sm mb-2"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          disabled={busy}
        />
        <label className="form-label small fw-semibold" htmlFor="add-co-web">
          Website
        </label>
        <input
          id="add-co-web"
          className="form-control form-control-sm mb-2"
          placeholder="https://"
          value={addWebsite}
          onChange={(e) => setAddWebsite(e.target.value)}
          disabled={busy}
        />
        <label className="form-label small fw-semibold" htmlFor="add-co-stage">
          Stage
        </label>
        <select
          id="add-co-stage"
          className="form-select form-select-sm mb-3"
          value={addStageId}
          onChange={(e) => setAddStageId(e.target.value)}
          disabled={busy}
        >
          {deal.stages.map((s) => (
            <option key={s.stageId} value={s.stageId}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="deal-btn deal-btn--ghost deal-btn--sm"
            onClick={() => setAddOpen(false)}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="deal-btn deal-btn--sm"
            onClick={addCompany}
            disabled={busy || !addName.trim()}
          >
            {busy ? <Spinner size="sm" /> : null} Add Company
          </button>
        </div>
      </Modal>

      {/* Settings slide-over */}
      {settingsOpen && (
        <>
          <div
            className="deal-settings-backdrop"
            onClick={() => setSettingsOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="deal-settings-panel"
            role="dialog"
            aria-label="Deal settings"
            aria-modal="true"
          >
            <div className="deal-settings-panel__header">
              <div>
                <h2 className="h5 mb-0">Deal Settings</h2>
                <p className="small text-muted mb-0 mt-1">{deal.name}</p>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
              />
            </div>
            <div className="deal-settings-panel__body">
              <div className="deal-settings-section">
                <h5>Details</h5>
                <label className="form-label small fw-semibold" htmlFor="deal-settings-name">
                  Deal Name
                </label>
                <input
                  id="deal-settings-name"
                  className="form-control form-control-sm mb-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!isLead || busy}
                />
                <label className="form-label small fw-semibold" htmlFor="deal-settings-client">
                  Client Firm Name
                </label>
                <input
                  id="deal-settings-client"
                  className="form-control form-control-sm mb-3"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. Apex Partners"
                  disabled={!isLead || busy}
                />
                {isLead && (
                  <button
                    type="button"
                    className="deal-btn deal-btn--sm"
                    onClick={saveDetails}
                    disabled={busy || !editName.trim()}
                  >
                    {busy ? <Spinner size="sm" /> : null}{' '}
                    {detailsSaved ? 'Saved ✓' : 'Save Details'}
                  </button>
                )}
              </div>

              <div className="deal-settings-section">
                <h5>Team Members</h5>
                {deal.members.map((m) => (
                  <div key={m.userId} className="deal-settings-member-row">
                    <div className="min-w-0">
                      <div className="fw-semibold small text-truncate">{m.name || m.userId}</div>
                      <p className="deal-settings-member-row__meta mb-0">
                        {m.role === 'lead' ? 'Deal Lead' : 'Member'}
                        {m.email ? ` · ${m.email}` : ''}
                      </p>
                    </div>
                    {isLead && m.role !== 'lead' && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        onClick={() => removeMember(m.userId)}
                        disabled={busy}
                        aria-label={`Remove ${m.name || m.userId}`}
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                {isLead && (
                  <div className="position-relative mt-2">
                    <input
                      className="form-control form-control-sm"
                      placeholder="Add member — search by name or email"
                      value={memberQuery}
                      onChange={(e) => setMemberQuery(e.target.value)}
                      aria-label="Add member — search by name or email"
                      disabled={busy}
                    />
                    {memberResults.length > 0 && (
                      <ul
                        className="list-group position-absolute w-100 shadow-sm"
                        style={{ zIndex: 5, maxHeight: '12rem', overflowY: 'auto' }}
                        role="listbox"
                        aria-label="Matching users"
                      >
                        {memberResults.map((u) => (
                          <li key={u.userId} className="list-group-item p-0">
                            <button
                              type="button"
                              className="btn btn-link text-decoration-none text-start w-100 px-2 py-1"
                              onClick={() => addMember(u.userId)}
                              disabled={busy}
                            >
                              <span className="fw-semibold">{u.name || u.userId}</span>
                              {u.email && <span className="text-muted small ms-1">{u.email}</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {memberQuery.trim().length >= 2 && memberResults.length === 0 && (
                      <div className="small text-muted mt-1">
                        No matching users in your organization.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="deal-settings-section">
                <h5>Pipeline Stages</h5>
                {stages.map((s, i) => (
                  <div key={s.stageId} className="deal-settings-stage-row">
                    {isLead && (
                      <div className="deal-settings-stage-move">
                        <button
                          type="button"
                          onClick={() => moveStage(i, -1)}
                          disabled={i === 0}
                          aria-label={`Move ${s.name} up`}
                        >
                          <i className="bi bi-chevron-up" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStage(i, 1)}
                          disabled={i === stages.length - 1}
                          aria-label={`Move ${s.name} down`}
                        >
                          <i className="bi bi-chevron-down" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <span
                      className="deal-stage-dot"
                      style={s.color ? { backgroundColor: s.color } : undefined}
                      aria-hidden="true"
                    />
                    {isLead ? (
                      <input
                        className="form-control form-control-sm"
                        value={s.name}
                        onChange={(e) =>
                          setStages((prev) =>
                            prev.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)),
                          )
                        }
                        aria-label={`Stage ${i + 1} name`}
                      />
                    ) : (
                      <span className="small flex-grow-1">{s.name}</span>
                    )}
                    {isLead ? (
                      <label className="deal-settings-terminal">
                        <input
                          type="checkbox"
                          checked={s.isTerminal}
                          onChange={(e) =>
                            setStages((prev) =>
                              prev.map((x, xi) =>
                                xi === i ? { ...x, isTerminal: e.target.checked } : x,
                              ),
                            )
                          }
                        />
                        Terminal
                      </label>
                    ) : (
                      s.isTerminal && (
                        <span className="badge bg-light text-dark border">terminal</span>
                      )
                    )}
                    {isLead && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        onClick={() => setStages((prev) => prev.filter((_, xi) => xi !== i))}
                        aria-label={`Remove stage ${s.name}`}
                      >
                        <i className="bi bi-trash" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                {isLead && (
                  <div className="d-flex gap-2 align-items-center flex-wrap mt-2">
                    <input
                      className="form-control form-control-sm w-auto"
                      placeholder="New stage name"
                      value={newStage}
                      onChange={(e) => setNewStage(e.target.value)}
                      aria-label="New stage name"
                    />
                    <button
                      type="button"
                      className="deal-btn deal-btn--outline deal-btn--sm"
                      onClick={() => {
                        if (!newStage.trim()) return;
                        setStages((prev) => [
                          ...prev,
                          {
                            stageId: `new_${Date.now()}`,
                            name: newStage.trim(),
                            order: prev.length,
                            isTerminal: false,
                            color: '#6366f1',
                          },
                        ]);
                        setNewStage('');
                      }}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" /> Add stage
                    </button>
                    <button
                      type="button"
                      className="deal-btn deal-btn--sm"
                      onClick={saveStages}
                      disabled={busy}
                    >
                      Save stages
                    </button>
                  </div>
                )}
              </div>

              <div className="deal-settings-section">
                <h5>Activity</h5>
                <ul className="list-group list-group-flush">
                  {activity.length === 0 && (
                    <li className="list-group-item px-0 text-muted small">No activity yet.</li>
                  )}
                  {activity.map((a) => (
                    <li key={a.id} className="list-group-item px-0 small text-muted">
                      <strong>{a.actionType}</strong> by {a.actorName || a.actorUserId}
                      {a.createdAt ? ` · ${new Date(a.createdAt).toLocaleString()}` : ''}
                    </li>
                  ))}
                </ul>
              </div>

              {isLead && deal.status === 'active' && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={archive}
                  disabled={busy}
                >
                  Archive deal
                </button>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
