// Deal Research Lists — brief + build-new-list actions + linked lists (QURALYST-20 parity).
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import {
  dealsService,
  mandateService,
  type Deal,
  type DealBrief,
  type DealListLink,
  type MandatePrefill,
} from '@/services/api';
import { storeComposerPrefill } from '@/features/research/composerPrefill';
import { useToast } from '@/hooks/useToast';
import { paths } from '@/routes/paths';
import '@/styles/pages/deals.css';

const BRIEF_MAX_BYTES = 8 * 1024 * 1024;

function listResultPath(link: DealListLink): string {
  return link.kind === 'financial'
    ? paths.financialVerticalsResults(link.resultId)
    : paths.viewResult(link.resultId);
}

function listIcon(listType: string, kind: string): string {
  const t = (listType || kind || '').toLowerCase();
  if (t.includes('financial') || kind === 'financial') return 'bi-bar-chart';
  if (t.includes('strategic')) return 'bi-people';
  return 'bi-bullseye';
}

export default function ResearchListsTab({ deal }: { deal: Deal }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<DealBrief | null>(null);
  const [links, setLinks] = useState<DealListLink[]>([]);
  const [loading, setLoading] = useState(true);
  /** Separate from delete/unlink so delete never shows “Reading brief…”. */
  const [briefAction, setBriefAction] = useState<'idle' | 'uploading' | 'deleting'>('idle');
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dealSuffix = `?deal=${encodeURIComponent(deal.id)}`;
  const newListActions = [
    {
      label: 'Target list',
      icon: 'bi-bullseye',
      path: `${paths.targetList}${dealSuffix}`,
    },
    {
      label: 'Strategic buyers',
      icon: 'bi-people',
      path: `${paths.strategic}${dealSuffix}`,
    },
    {
      label: 'Financial buyers',
      icon: 'bi-bar-chart',
      path: `${paths.financialVerticals}${dealSuffix}`,
    },
  ];

  const load = async () => {
    setLoading(true);
    try {
      const [b, l] = await Promise.all([
        dealsService.getBrief(deal.id),
        dealsService.listLinks(deal.id),
      ]);
      setBrief(b);
      setLinks(l);
    } catch {
      toast.error('Failed to load research lists.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  const onPickBrief = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > BRIEF_MAX_BYTES) {
      toast.error('Brief is too large (8MB max).');
      return;
    }
    setBriefAction('uploading');
    try {
      let b = await dealsService.uploadBrief(deal.id, file);
      setBrief(b);
      try {
        const prefill = await mandateService.parseMandate({
          files: [file],
          intent: 'example-target-profile',
        });
        b = await dealsService.setBriefCriteria(deal.id, {
          criteria: prefill as unknown as Record<string, unknown>,
          status: 'ready',
        });
        toast.success('Brief uploaded and parsed.');
      } catch {
        b = await dealsService.setBriefCriteria(deal.id, {
          status: 'error',
          errorMessage:
            'Could not parse the brief. You can still download it and enter criteria manually.',
        });
        toast.error('Brief stored, but parsing failed.');
      }
      setBrief(b);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Could not upload the brief.');
    } finally {
      setBriefAction('idle');
    }
  };

  const deleteBrief = async () => {
    setBriefAction('deleting');
    try {
      await dealsService.deleteBrief(deal.id);
      setBrief(null);
      toast.success('Brief removed.');
    } catch {
      toast.error('Could not remove the brief.');
    } finally {
      setBriefAction('idle');
    }
  };

  const startResearch = () => {
    if (!brief || brief.status !== 'ready') return;
    storeComposerPrefill(brief.criteria as unknown as MandatePrefill);
    navigate(`${paths.targetList}?deal=${encodeURIComponent(deal.id)}`);
  };

  const unlink = async (resultId: string) => {
    setUnlinkBusy(true);
    try {
      await dealsService.unlinkList(deal.id, resultId);
      setLinks((prev) => prev.filter((l) => l.resultId !== resultId));
      toast.success('List detached.');
    } catch {
      toast.error('Could not detach the list.');
    } finally {
      setUnlinkBusy(false);
    }
  };

  const criteriaChips = useMemo(() => {
    if (!brief || brief.status !== 'ready') return [] as string[];
    const c = brief.criteria || {};
    const out: string[] = [];
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const arr = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];
    const ind = [str(c.industry), str(c.subIndustry), str(c.sub_industry)]
      .filter(Boolean)
      .join(' / ');
    if (ind) out.push(ind);
    const geo = [
      ...arr(c.countries),
      ...arr(c.states),
      ...arr(c.cities),
      str(c.geography),
      str(c.location),
    ].filter(Boolean);
    if (geo.length) out.push(geo.slice(0, 3).join(', '));
    const desc = str(c.targetDescription) || str(c.target_description) || str(c.businessQuery);
    if (desc) out.push(desc.length > 80 ? `${desc.slice(0, 80)}…` : desc);
    return out.slice(0, 6);
  }, [brief]);

  if (loading) {
    return (
      <div className="org-tab-loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      {/* Deal brief */}
      <div className="deal-panel">
        <div className="d-flex align-items-start justify-content-between gap-3">
          <div className="min-w-0">
            <p className="deal-panel__label mb-0">Deal brief</p>
            <p className="deal-panel__hint mb-0">
              Attach a CIM or buy-box document. Its criteria prefill new research lists for this
              deal.
            </p>
          </div>
          {brief && (
            <button
              type="button"
              className="deal-btn deal-btn--outline deal-btn--sm flex-shrink-0"
              onClick={() => fileRef.current?.click()}
              disabled={briefAction !== 'idle'}
            >
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> Replace
            </button>
          )}
        </div>

        <div className="mt-3">
          {briefAction === 'uploading' ? (
            <div className="d-flex align-items-center gap-2 small text-muted py-2">
              <Spinner size="sm" /> Reading brief and extracting criteria…
            </div>
          ) : briefAction === 'deleting' ? (
            <div className="d-flex align-items-center gap-2 small text-muted py-2">
              <Spinner size="sm" /> Removing brief…
            </div>
          ) : !brief ? (
            <button
              type="button"
              className="deal-btn deal-btn--sm"
              onClick={() => fileRef.current?.click()}
            >
              <i className="bi bi-file-earmark-text" aria-hidden="true" /> Attach brief
            </button>
          ) : (
            <div>
              <div className="deal-brief-file">
                <i className="bi bi-file-earmark-text deal-brief-file__icon" aria-hidden="true" />
                <div className="deal-brief-file__meta min-w-0">
                  <p className="deal-brief-file__name" title={brief.filename}>
                    {brief.filename || 'Attached brief'}
                  </p>
                  <p className="deal-brief-file__status">
                    {brief.status === 'parsing' && (
                      <span className="deal-brief-status deal-brief-status--parsing">
                        <Spinner size="sm" /> Parsing
                      </span>
                    )}
                    {brief.status === 'ready' && (
                      <span className="deal-brief-status deal-brief-status--ready">
                        <i className="bi bi-check-circle-fill" aria-hidden="true" /> Ready
                      </span>
                    )}
                    {brief.status === 'error' && (
                      <span className="deal-brief-status deal-brief-status--error">
                        <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />{' '}
                        Extraction failed
                      </span>
                    )}
                  </p>
                </div>
                <div className="deal-brief-file__actions">
                  {brief.hasFile !== false && (
                    <a
                      className="deal-brief-icon-btn"
                      href={dealsService.briefDownloadUrl(deal.id)}
                      title="Download original"
                      aria-label="Download brief"
                    >
                      <i className="bi bi-download" aria-hidden="true" />
                    </a>
                  )}
                  <button
                    type="button"
                    className="deal-brief-icon-btn deal-brief-icon-btn--danger"
                    onClick={deleteBrief}
                    disabled={briefAction !== 'idle'}
                    title="Remove brief"
                    aria-label="Remove brief"
                  >
                    <i className="bi bi-trash" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {brief.status === 'ready' && criteriaChips.length > 0 && (
                <div className="deal-brief-chips">
                  {criteriaChips.map((f) => (
                    <span key={f} className="deal-brief-chip">
                      {f}
                    </span>
                  ))}
                </div>
              )}
              {brief.status === 'ready' && criteriaChips.length === 0 && (
                <p className="small text-muted mt-2 mb-0">
                  No buy-box criteria were found in this document.
                </p>
              )}
              {brief.status === 'error' && (
                <p className="small text-danger mt-2 mb-0">
                  {brief.errorMessage ||
                    'Could not extract criteria. The file is still attached; try replacing it.'}
                </p>
              )}
              {brief.status === 'ready' && (
                <button
                  type="button"
                  className="deal-btn deal-btn--sm mt-3"
                  onClick={startResearch}
                >
                  <i className="bi bi-magic" aria-hidden="true" /> Start research from brief
                </button>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf,.doc,.docx,.txt,text/plain,.md,.rtf,.csv,.xlsx,.xls"
          className="d-none"
          onChange={onPickBrief}
          aria-label="Upload a deal brief"
        />
      </div>

      {/* Build a new list */}
      <div className="deal-panel">
        <p className="deal-panel__label">Build a new list for {deal.name}</p>
        <div className="deal-build-actions">
          {newListActions.map((a) => (
            <button
              key={a.label}
              type="button"
              className="deal-btn deal-btn--outline deal-btn--sm"
              onClick={() => navigate(a.path)}
            >
              <i className={`bi ${a.icon}`} aria-hidden="true" /> {a.label}
            </button>
          ))}
        </div>
        <p className="deal-panel__hint mt-2 mb-0">
          Lists built here are saved as research under this deal. Companies are not added to the
          pipeline.
        </p>
      </div>

      {/* Linked research lists */}
      <div className="deal-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {links.length === 0 ? (
          <div className="text-center py-5 px-3">
            <i
              className="bi bi-file-earmark-text d-block mb-2"
              style={{ fontSize: '1.75rem', color: '#d1d5db' }}
              aria-hidden="true"
            />
            <p className="text-muted small mb-0">No research lists linked to this deal yet.</p>
          </div>
        ) : (
          <div className="deal-table-wrap">
            <table className="deal-table">
              <thead>
                <tr>
                  <th>List</th>
                  <th>Type</th>
                  <th className="deal-table__num">Companies</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-start text-decoration-none"
                        onClick={() => navigate(listResultPath(l))}
                      >
                        <i
                          className={`bi ${listIcon(l.listType, l.kind)} me-2 text-muted`}
                          aria-hidden="true"
                        />
                        {l.title || l.resultId}
                      </button>
                    </td>
                    <td className="text-capitalize text-muted small">{l.listType || l.kind}</td>
                    <td className="deal-table__num">{l.totalCount || '—'}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="deal-btn deal-btn--ghost deal-btn--sm me-1"
                        onClick={() => navigate(listResultPath(l))}
                        aria-label={`Open ${l.title || l.resultId}`}
                      >
                        <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        onClick={() => unlink(l.resultId)}
                        disabled={unlinkBusy}
                        aria-label={`Detach ${l.title || l.resultId}`}
                        title="Detach from deal"
                      >
                        <i className="bi bi-unlink" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
