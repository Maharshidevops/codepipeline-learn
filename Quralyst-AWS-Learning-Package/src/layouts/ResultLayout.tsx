// Result workspace shell (Phase 12) — merges the per-result pages (Data / Preview /
// Summary) into one tabbed workspace, mirroring the OrgSettingsLayout + OrgSubnav pattern. Reads
// :resultId, fetches the result metadata once for the shared header (title + "Created by … on …"),
// renders the cross-cutting toolbar (Edit & Re-run / Use Same Filters / Download / Delete) and a
// NavLink tab row, then each tab renders only its body via <Outlet>. Old per-view URLs redirect
// here (see router.tsx).
import { Suspense } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { researchService, resultsService } from '@/services/api';
import {
  filtersToFvForm,
  filtersToStrategicForm,
  filtersToTargetForm,
} from '@/features/research/filtersToForm';
import { storeRerunMeta } from '@/features/research/composerPrefill';
import { useResultSummaryMeta } from '@/features/results/useResultSummaryMeta';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { paths } from '@/routes/paths';
import { formatDateTimeLong } from '@/lib/datetime';
import TabNav from '@/components/layout/TabNav';
import './result-layout.css';

// Preview is intentionally not a workspace tab — it's reached from the "Input Files Used" Preview
// action (its route still exists). Keeping it out of the tab row per the requested UX.
// Manage CRM is intentionally NOT a tab: CRM lives inline in the result detail (Call status +
// Lead owner on each company row), matching the reference build which has no standalone CRM surface.
const TABS: { tab: 'data' | 'summary'; label: string; icon: string }[] = [
  { tab: 'data', label: 'Results', icon: 'bi-table' },
  { tab: 'summary', label: 'Summary', icon: 'bi-bar-chart' },
];

export default function ResultLayout() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const { data: summary } = useResultSummaryMeta(resultId);

  // Title from the result filename (e.g. "target_list_results_1.xlsx" → "Target List Results 1").
  const rawName = summary?.resultFilename?.replace(/\.[^.]+$/, '') ?? '';
  const title = rawName
    ? rawName
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim()
    : 'Result';
  const creator = summary?.username || '';
  const createdAt = summary?.createdAt || '';
  const isCreator = !!currentUser && !!summary && String(summary.userId) === String(currentUser.id);
  const version = typeof summary?.version === 'number' ? summary.version : undefined;

  const navigateWithFilters = async (asRerun: boolean) => {
    if (!resultId) return;
    try {
      const filters = await researchService.reuseFilters(resultId);
      const sourceType = String(filters.source_type ?? '');
      if (asRerun) {
        storeRerunMeta({
          sourceProcessId: resultId,
          version,
          title,
        });
      }
      if (sourceType === 'strategic_buyer_list') {
        localStorage.setItem(
          'quralyst:draft:strategic',
          JSON.stringify(filtersToStrategicForm(filters)),
        );
        toast.info(asRerun ? 'Edit criteria, then re-run…' : 'Re-running with the same filters…');
        navigate(paths.strategic);
      } else if (sourceType === 'financial_verticals') {
        localStorage.setItem(
          'quralyst:draft:financial_verticals',
          JSON.stringify(filtersToFvForm(filters)),
        );
        toast.info(asRerun ? 'Edit criteria, then re-run…' : 'Re-running with the same filters…');
        navigate(paths.financialVerticals);
      } else {
        localStorage.setItem(
          'quralyst:draft:target_list',
          JSON.stringify(filtersToTargetForm(filters)),
        );
        toast.info(asRerun ? 'Edit criteria, then re-run…' : 'Re-running with the same filters…');
        navigate(paths.targetList);
      }
    } catch {
      toast.error('Could not load the filters from this result.');
    }
  };

  const handleUseSameFilters = () => void navigateWithFilters(false);
  const handleEditAndRerun = () => void navigateWithFilters(true);

  const handleDownload = () => {
    if (!resultId) return;
    toast.info('Preparing your download…');
    // Cookie-authed GET that returns the results XLSX with a Content-Disposition
    // attachment header — a plain anchor navigation carries the session cookie and
    // lets the browser save the file using the server-provided filename.
    const a = document.createElement('a');
    a.href = resultsService.downloadUrl(resultId);
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDelete = async () => {
    if (!resultId) return;
    const ok = await confirm({
      title: 'Delete result?',
      message: 'Are you sure you want to delete this result?',
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      const res = await resultsService.remove(resultId);
      if (res.success) {
        toast.success(res.message || 'Result deleted.');
        navigate(paths.previousResults);
      } else {
        toast.error(res.message || 'Failed to delete result.');
      }
    } catch {
      toast.error('Failed to delete result.');
    }
  };

  return (
    <div className="container-fluid page-top-padding">
      <div className="result-workspace-header">
        <div className="result-workspace-title-section">
          <h1 className="result-workspace-title">
            {title}
            {typeof version === 'number' && version > 1 ? (
              <span className="ms-2 badge text-bg-secondary align-middle">v{version}</span>
            ) : null}
          </h1>
          {creator && (
            <p className="result-workspace-meta">
              <span>Created by</span> <span className="fw-semibold">{creator}</span>{' '}
              {createdAt && (
                <>
                  <span>on</span> <span>{formatDateTimeLong(createdAt)}</span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="result-workspace-actions">
          <button
            type="button"
            className="btn btn-standard action-btn"
            onClick={handleEditAndRerun}
          >
            <i className="bi bi-pencil-square me-2" />
            Edit &amp; Re-run
          </button>
          <button
            type="button"
            className="btn btn-standard action-btn"
            onClick={handleUseSameFilters}
          >
            <i className="bi bi-sliders me-2" />
            Use settings
          </button>
          <button type="button" className="btn btn-standard action-btn" onClick={handleDownload}>
            <i className="bi bi-download me-2" />
            Download
          </button>
          {isCreator && (
            <button
              type="button"
              className="btn btn-standard action-btn text-danger"
              title="Delete"
              onClick={handleDelete}
            >
              <i className="bi bi-trash me-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      <TabNav
        ariaLabel="Result views"
        items={TABS.map(({ tab, label, icon }) => ({
          to: paths.result(resultId ?? '', tab),
          label,
          icon,
        }))}
      />

      {/* Local boundary so a lazy tab body (Data/Summary) suspends here — keeping the header + tab
          row mounted — instead of bubbling to AppLayout's boundary and blanking the whole workspace. */}
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  );
}
