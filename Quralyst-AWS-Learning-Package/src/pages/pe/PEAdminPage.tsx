// PE Dataset — Admin Ops operator console (F28.2). STAFF-ONLY (gated by RoleRoute role="pe_admin";
// the backend also require_staff-403s non-staff). Composes the pause + queue, hygiene/enrich action
// grid, firm de-dup flow, removal-review queues, and tables-first monitoring — all over the F28
// /api/pe/admin/* surface via peAdminService (TanStack Query, refetch-on-mutate). Review-queue +
// corrections UI is F27.3, NOT here. Contract: backend REF-API-CONTRACT.md §PE Dataset — Admin Ops.
import PipelineHealthPanel from '@/components/pe/admin/PipelineHealthPanel';
import ActionGrid from '@/components/pe/admin/ActionGrid';
import DedupPanel from '@/components/pe/admin/DedupPanel';
import NotFoundPanel from '@/components/pe/admin/NotFoundPanel';
import MonitoringPanel from '@/components/pe/admin/MonitoringPanel';
import AccessGrantsPanel from '@/components/pe/admin/AccessGrantsPanel';
import '@/styles/pages/pe-admin.css';

export default function PEAdminPage() {
  return (
    <div className="pea-page">
      <header className="pea-header">
        <div className="pea-header__copy">
          <div className="pea-crumb" aria-label="Breadcrumb">
            <span>Private Equity</span>
            <i className="bi bi-chevron-right" aria-hidden="true" />
            <span className="pea-crumb__current">Admin Ops</span>
          </div>
          <h1 className="pea-title">PE Admin Ops</h1>
          <p className="pea-subtitle">
            Staff-only operator console for the PE scraping estate — FV pipeline health, hygiene
            &amp; enrichment, de-duplication, removal review and monitoring. Live queue health and
            the queue ops are on the Action Queue page.
          </p>
        </div>
      </header>

      <PipelineHealthPanel />
      <ActionGrid />
      <DedupPanel />
      <NotFoundPanel />
      <MonitoringPanel />
      <AccessGrantsPanel />
    </div>
  );
}
