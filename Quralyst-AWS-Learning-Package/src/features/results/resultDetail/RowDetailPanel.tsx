import { useEffect, useId, useRef, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import {
  commentsService,
  normalizeFirmKey,
  resultsService,
  type OutcomeValue,
} from '@/services/api';
import { CellModalContext } from '@/components/ui/Modal/cellModalContext';
import FitOverrideSelect from '@/components/domain/FitOverrideSelect';
import OutcomeTagSelect from '@/components/domain/OutcomeTagSelect';
import AddToDealButton from '@/features/deals/AddToDealButton';
import ComparableDealNote from './ComparableDealNote';
import { useOutcomes } from '@/features/results/viewResult/useOutcomes';
import { openTearsheet } from '@/lib/tearsheet/openTearsheet';
import { useToast } from '@/hooks/useToast';
import { CRM_STATUSES, cell, cleanInsightAnswer, numCell } from './fitUtils';
import type { ComparableDeal, RowData } from './types';

export default function RowDetailPanel({
  row,
  resultId,
  panelWidth,
  onSaved,
}: {
  row: RowData;
  resultId: string;
  panelWidth?: number;
  onSaved: () => void;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const showCellModal = useContext(CellModalContext)?.showCellModal;
  const companyName = cell(row, 'Company Name');
  const firmKey = normalizeFirmKey(companyName);
  const outcomes = useOutcomes(resultId);
  const rowOutcome = outcomes[firmKey];
  const canLoadCrm = Boolean(resultId && companyName) && !resultId.startsWith('fv_');
  const seededRef = useRef(false);
  const crmStatusId = useId();
  const crmOwnerId = useId();

  const fullName = [cell(row, 'Contact First Name'), cell(row, 'Contact Last Name')]
    .filter(Boolean)
    .join(' ');

  // A comparable past settled deal (Tier A / A5): the backend attaches it as an object (or null)
  // under the row's `comparable_deal` key. RowData types every value as string, so read via a cast.
  const comparable = row['comparable_deal'] as unknown as ComparableDeal | null | undefined;

  const [crmStatus, setCrmStatus] = useState('');
  const [crmOwner, setCrmOwner] = useState('');
  const [comment, setComment] = useState('');
  const [savingCrm, setSavingCrm] = useState(false);
  const [savingComment, setSavingComment] = useState(false);

  const { data: crmDetail } = useQuery({
    queryKey: ['result-crm', resultId],
    queryFn: () => resultsService.getCrm(resultId),
    enabled: canLoadCrm,
    staleTime: 60_000,
  });

  const { data: companyComments } = useQuery({
    queryKey: ['result-comments-company', resultId, companyName],
    queryFn: () => commentsService.getForCompany(resultId, companyName),
    enabled: canLoadCrm,
    staleTime: 30_000,
  });

  // Seed CRM/comment fields once from the CRM twin + comments API (Replit row.crm / row.comments).
  useEffect(() => {
    if (seededRef.current || !canLoadCrm) return;
    if (crmDetail === undefined && companyComments === undefined) return;

    const match = crmDetail?.crmData?.find(
      (r) => (r.companyName || '').trim().toLowerCase() === companyName.trim().toLowerCase(),
    );
    if (match) {
      setCrmStatus(match.call_status || '');
      setCrmOwner(match.lead_owner || '');
    }
    const existing = companyComments?.comments?.find((c) => c.position === 1);
    if (existing?.text) setComment(existing.text);
    seededRef.current = true;
  }, [canLoadCrm, companyName, companyComments, crmDetail]);

  const overall = numCell(row, 'Total Score', 'Score');
  const business = numCell(row, 'Business Score');
  const size = numCell(row, 'Size Fit Score', 'Size Scores');
  const geo = numCell(row, 'Geographic Fit Score', 'Geography Score');
  const description = cell(row, 'Business Description');
  const rationale = cell(row, 'Rationale') || 'Evaluation complete.';

  const insights = Object.entries(row)
    .filter(([k]) => {
      const known = new Set([
        'Company Name',
        'Business Description',
        'Company Type',
        'Sector',
        'Industry',
        'Website',
        'Company LinkedIn URL',
        'LinkedIn URL',
        'LinkedIn Followers',
        'Revenue ($M)',
        'Revenue',
        'Employees',
        'Number of Employees',
        'City',
        'State',
        'Country',
        'Ultimate Corporate Parent',
        'Parent Company',
        'Owner Type',
        'Owner Name',
        'Investors',
        'Active Investors',
        'Source Dataset',
        'Fit/No Fit',
        'Rationale',
        'Total Score',
        'Score',
        'Business Fit',
        'Business Fit Rationale',
        'Business Score',
        'Size Fit Rationale',
        'Size Fit Score',
        'Size Scores',
        'Geographic Fit Rationale',
        'Geographic Fit Score',
        'Geography Score',
        'Acquisition Target Readiness',
        'Sell-side Mandate Readiness',
        'Strategic Buyer Propensity',
        'Contact First Name',
        'Contact Last Name',
        'Contact Title',
        'Contact Email',
        'Contact Phone',
        'Contact LinkedIn URL',
        'Company Phone',
        'Company Phone Number',
        'Google Rating',
        'Google Review Count',
        'Rating',
        'Review Count',
        'Review URL',
        'News',
        'Acquisition News',
        'Ownership Acquired Date',
        'Company Acquired',
        'Company Acquisition Date',
        'comparable_deal', // per-row object metadata, not a custom insight — never list it
      ]);
      return !known.has(k) && cleanInsightAnswer(String(row[k] ?? '')).length > 0;
    })
    .map(([q, a]) => [q, cleanInsightAnswer(String(a ?? ''))] as const);

  const saveCrm = async () => {
    setSavingCrm(true);
    try {
      await resultsService.saveCrm({
        result_id: resultId,
        company_name: companyName,
        fields: { call_status: crmStatus, lead_owner: crmOwner },
      });
      toast.success(`Saved CRM for ${companyName}`);
      void qc.invalidateQueries({ queryKey: ['result-crm', resultId] });
      onSaved();
    } catch {
      toast.error('Failed to save CRM status');
    } finally {
      setSavingCrm(false);
    }
  };

  const saveComment = async () => {
    setSavingComment(true);
    try {
      await commentsService.save({
        resultId,
        companyName,
        position: 1,
        text: comment,
      });
      toast.success(`Saved comment for ${companyName}`);
      void qc.invalidateQueries({ queryKey: ['result-comments-company', resultId, companyName] });
      onSaved();
    } catch {
      toast.error('Failed to save comment');
    } finally {
      setSavingComment(false);
    }
  };

  const downloadDetail = () => {
    const fields: [string, unknown][] = [
      ['Company', companyName],
      ['Website', cell(row, 'Website')],
      ['Sector', cell(row, 'Sector')],
      ['Industry', cell(row, 'Industry')],
      ['Revenue', cell(row, 'Revenue ($M)', 'Revenue')],
      ['Employees', cell(row, 'Employees', 'Number of Employees')],
      ['Fit', cell(row, 'Fit/No Fit')],
      ['Overall score', overall],
      ['Business score', business],
      ['Geography score', geo],
      ['Size score', size],
      ['Rationale', cell(row, 'Rationale')],
      ['Contact name', fullName],
      ['Contact title', cell(row, 'Contact Title')],
      ['Contact email', cell(row, 'Contact Email')],
      ['CRM status', crmStatus],
      ['CRM owner', crmOwner],
    ];
    for (const [q, a] of insights) fields.push([`Insight: ${q}`, a]);
    if (comment.trim()) fields.push(['Comment', comment]);

    const esc = (v: unknown) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv =
      'Field,Value\n' +
      fields
        .filter(([, v]) => v != null && String(v).trim() !== '')
        .map(([k, v]) => `${esc(k)},${esc(v)}`)
        .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/[^a-z0-9]+/gi, '_') || 'company'}_detail.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rd-rowdetail border-top">
      <div
        className="sticky-left p-4 text-wrap"
        style={panelWidth ? { width: panelWidth } : undefined}
      >
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <h4 className="fw-bold mb-0 text-truncate rd-company-title">{companyName}</h4>
          <div className="d-flex flex-wrap align-items-center gap-2">
            {firmKey && (
              <OutcomeTagSelect
                key={`${firmKey}:${rowOutcome?.resolved_outcome ?? 'not_contacted'}`}
                resultId={resultId}
                firmKey={firmKey}
                companyName={companyName}
                value={(rowOutcome?.resolved_outcome ?? 'not_contacted') as OutcomeValue}
                onChange={onSaved}
              />
            )}
            <AddToDealButton
              records={[
                {
                  companyName,
                  website: cell(row, 'Website'),
                  predictedFit: cell(row, 'Fit/No Fit'),
                  contactName: fullName,
                  contactEmail: cell(row, 'Contact Email'),
                  contactTitle: cell(row, 'Contact Title'),
                  contactPhone: cell(row, 'Contact Phone', 'Company Phone'),
                },
              ]}
              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
              icon={<i className="bi bi-plus"></i>}
              label="Add to Deal"
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
              disabled={!companyName}
              onClick={() =>
                navigate(openTearsheet(companyName, cell(row, 'Website') || undefined))
              }
            >
              <FileText style={{ width: 14, height: 14 }} />
              Tearsheet
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
              onClick={downloadDetail}
            >
              <Download style={{ width: 14, height: 14 }} />
              Download
            </button>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="mb-4">
              <h6 className="text-muted fw-semibold small mb-2 text-uppercase">DESCRIPTION</h6>
              {!description ? (
                <p className="small text-muted mb-0">No description provided.</p>
              ) : showCellModal ? (
                <button
                  type="button"
                  className="rd-text-expand small mb-0 lh-base text-start"
                  onClick={() => showCellModal('Business Description', description)}
                  title="View full description"
                >
                  {description}
                </button>
              ) : (
                <p className="small mb-0 lh-base">{description}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="small fw-semibold text-muted">Overall</span>
                  <span className="small fw-bold">{overall}</span>
                </div>
                <div className="progress" style={{ height: 6 }}>
                  <div
                    className="progress-bar"
                    style={{
                      width: `${overall}%`,
                      backgroundColor: 'var(--color-primary, #6366f1)',
                    }}
                  />
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="small fw-semibold text-muted">Business</span>
                  <span className="small fw-bold">{business}</span>
                </div>
                <div className="progress" style={{ height: 6 }}>
                  <div
                    className="progress-bar"
                    style={{
                      width: `${business}%`,
                      backgroundColor: 'var(--color-primary, #6366f1)',
                    }}
                  />
                </div>
              </div>
              <div className="small d-flex align-items-center gap-2">
                <span className="rd-confidence-dot"></span>
                <span>
                  <strong>Confidence</strong>
                </span>
                <span className="text-muted">
                  High (80%) - complete data with aligned sub-scores
                </span>
              </div>
            </div>

            <div className="mb-4">
              <h6 className="text-muted fw-semibold small mb-2 text-uppercase">WHY THIS FIT</h6>
              {showCellModal ? (
                <button
                  type="button"
                  className="rd-text-expand small lh-base text-start"
                  onClick={() => showCellModal('Why this fit', `Business: ${rationale}`)}
                  title="View full rationale"
                >
                  <strong>Business:</strong> {rationale}
                </button>
              ) : (
                <div className="small lh-base">
                  <strong>Business:</strong> {rationale}
                </div>
              )}
            </div>

            {/* Comparable past deal (Tier A / A5) — only shown when the backend found a genuine
                match against this org's settled-deal history; never fabricated. */}
            <ComparableDealNote comparable={comparable} />
          </div>

          <div className="col-lg-4">
            <div className="rd-side-card mb-3 p-3">
              <h6 className="fw-semibold small text-muted text-uppercase mb-2">CONTACT</h6>
              {fullName ? (
                <div className="small">
                  <div className="fw-bold">
                    {fullName} {cell(row, 'Contact Title') ? `· ${cell(row, 'Contact Title')}` : ''}
                  </div>
                  {cell(row, 'Contact Email') && (
                    <div>
                      <a
                        href={`mailto:${cell(row, 'Contact Email')}`}
                        className="text-decoration-none rd-link"
                      >
                        {cell(row, 'Contact Email')}
                      </a>
                    </div>
                  )}
                  {cell(row, 'Contact Phone') && (
                    <div className="text-muted mt-1">{cell(row, 'Contact Phone')}</div>
                  )}
                </div>
              ) : (
                <div className="small text-muted">No contact specified.</div>
              )}
            </div>

            <div className="rd-side-card mb-3 p-3">
              <h6 className="fw-semibold small text-muted text-uppercase mb-2">OVERRIDE FIT</h6>
              <div className="mb-2">
                <FitOverrideSelect
                  resultId={resultId}
                  companyName={companyName}
                  value={cell(row, 'Fit/No Fit')}
                  onChange={onSaved}
                />
              </div>
              <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>
                Corrections are saved to your analyst memory and used to calibrate future scoring
                runs.
              </p>
            </div>

            <div className="rd-side-card mb-3 p-3">
              <h6 className="fw-semibold small text-muted text-uppercase mb-2">CRM</h6>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label htmlFor={crmStatusId} className="small text-muted d-block mb-1">
                    Status
                  </label>
                  <select
                    id={crmStatusId}
                    className="form-select form-select-sm"
                    value={crmStatus}
                    onChange={(e) => setCrmStatus(e.target.value)}
                  >
                    {CRM_STATUSES.map((s) => (
                      <option key={s || 'blank'} value={s}>
                        {s || '— Select —'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label htmlFor={crmOwnerId} className="small text-muted d-block mb-1">
                    Owner
                  </label>
                  <input
                    id={crmOwnerId}
                    className="form-control form-control-sm"
                    value={crmOwner}
                    onChange={(e) => setCrmOwner(e.target.value)}
                    placeholder="Lead owner"
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100 d-flex justify-content-center align-items-center gap-2 fw-semibold"
                disabled={savingCrm}
                onClick={() => void saveCrm()}
              >
                <i className="bi bi-save"></i> {savingCrm ? 'Saving…' : 'Save CRM'}
              </button>
            </div>

            <div className="rd-side-card p-3">
              <h6 className="fw-semibold small text-muted text-uppercase mb-2">COMMENT</h6>
              <textarea
                className="form-control form-control-sm mb-2"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100 d-flex justify-content-center align-items-center gap-2 fw-semibold"
                disabled={savingComment}
                onClick={() => void saveComment()}
              >
                <i className="bi bi-save"></i> {savingComment ? 'Saving…' : 'Save comment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
