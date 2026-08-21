// PE Dataset — Action Queue (F64 unit 6). STAFF-ONLY, same `pe_admin` gate as the admin console:
// it exposes cross-firm operational data and destructive requeue/purge/pause controls.
//
// Split out of PEAdminPage, where the queue view was one of eight stacked panels — the thing an
// operator watches most often was the hardest to get to. PausePanel comes with it deliberately:
// pausing is the action you take *because of* what the queue shows.
//
// Contract: GET /api/pe/admin/queues, GET /api/pe/admin/queues/{queue}/jobs,
// POST .../requeue | .../purge | .../pause.
import PausePanel from '@/components/pe/admin/PausePanel';
import QueuesPanel from '@/components/pe/admin/QueuesPanel';
import '@/styles/pages/pe-action-queue.css';

export default function PEActionQueuePage() {
  return (
    <div className="pea-page">
      <header className="pea-header">
        <div className="pea-header__copy">
          <div className="pea-crumb" aria-label="Breadcrumb">
            <span>Private Equity</span>
            <i className="bi bi-chevron-right" aria-hidden="true" />
            <span className="pea-crumb__current">Action Queue</span>
          </div>
          <h1 className="pea-title">Action Queue</h1>
          <p className="pea-subtitle">
            Live view of the PE scraping estate — per-queue health, pending and failed jobs, and the
            queue ops (requeue, purge, pause). Refreshes automatically.
          </p>
        </div>
      </header>

      <PausePanel />
      <QueuesPanel />
    </div>
  );
}
