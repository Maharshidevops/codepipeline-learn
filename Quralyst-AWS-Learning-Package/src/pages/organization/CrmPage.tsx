// Org-wide CRM files table.
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/ui';
import type { Column } from '@/components/ui';
import { organizationService } from '@/services/api';
import { useOrgPageMeta, useOrgSlug } from '@/layouts/orgSettingsMeta';
import type { CrmFile } from '@/types';

const columns: Column<CrmFile>[] = [
  { key: 'title', header: 'Title', render: (f) => f.title || f.processId },
  { key: 'createdAt', header: 'Created' },
  { key: 'status', header: 'Status' },
];

export default function CrmPage() {
  const slug = useOrgSlug();
  useOrgPageMeta('CRM', <>Organization-wide CRM files for this organization.</>);

  const [files, setFiles] = useState<CrmFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    organizationService
      .getCrm(slug)
      .then((data) => {
        if (active) setFiles(data.files);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <div className="org-section">
      <div className="org-section-header">
        <div>
          <h2 className="org-section-title">Files</h2>
          <p className="org-section-sub">CRM files shared across the organization</p>
        </div>
      </div>
      <div className="org-section-body is-table">
        <DataTable
          columns={columns}
          rows={files}
          loading={loading}
          emptyMessage="No files yet."
          getRowKey={(f) => f.processId}
          variant="quiet"
        />
      </div>
    </div>
  );
}
