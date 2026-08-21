// Org updates feed.
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';
import { organizationService } from '@/services/api';
import { useOrgPageMeta, useOrgSlug } from '@/layouts/orgSettingsMeta';
import type { OrgUpdate } from '@/types';

export default function UpdatesPage() {
  const slug = useOrgSlug();
  useOrgPageMeta('Organization updates', <>Activity and notifications for this organization.</>);

  const [rows, setRows] = useState<OrgUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    organizationService
      .getUpdates(slug)
      .then((data) => {
        if (active) setRows(data.rows);
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
          <h2 className="org-section-title">Feed</h2>
          <p className="org-section-sub">Organization activity and notifications</p>
        </div>
      </div>
      {loading ? (
        <div className="org-tab-loading">
          <Spinner />
        </div>
      ) : (
        <ul className="org-feed">
          {rows.length ? (
            rows.map((r, i) => (
              <li key={`${r.createdAt}-${i}`} className="org-feed-item">
                <span>
                  {r.summary || r.updateType} <span className="org-feed-status">({r.status})</span>
                </span>
                <span className="org-feed-time">{r.createdAt}</span>
              </li>
            ))
          ) : (
            <li className="org-feed-item is-muted">No updates yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
