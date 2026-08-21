// DashboardPage — org overview (metrics + recent updates). Header/subnav from OrgSettingsLayout.
import { useEffect, useState } from 'react';
import { Users, UserPlus, Armchair } from 'lucide-react';
import { useOrgPageMeta, useOrgSlug } from '@/layouts/orgSettingsMeta';
import { Spinner } from '@/components/ui';
import { organizationService } from '@/services/api';
import type { DashboardData } from '@/services/api/organizationService';

export default function DashboardPage() {
  const slug = useOrgSlug();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    organizationService
      .getDashboard(slug)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useOrgPageMeta(
    'Dashboard',
    data ? (
      <>
        <span className="org-meta-line">
          {data.org.name} · slug <code>{data.org.slug}</code> · join code{' '}
          <code>{data.org.joinCode}</code>
        </span>
        Overview, seats, and recent activity.
      </>
    ) : undefined,
  );

  if (loading) {
    return (
      <div className="org-tab-loading">
        <Spinner label="Loading dashboard" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="org-section">
        <div className="org-empty">Unable to load dashboard.</div>
      </div>
    );
  }

  return (
    <>
      <div className="org-metrics mb-3">
        <div className="org-metric-card">
          <div className="org-metric-label">
            <Users aria-hidden />
            Members
          </div>
          <div className="org-metric-value">{data.memberCount}</div>
          <div className="org-metric-sub">Active in this organization</div>
        </div>
        <div className="org-metric-card">
          <div className="org-metric-label">
            <UserPlus aria-hidden />
            Pending approvals
          </div>
          <div className="org-metric-value">{data.pendingMembers}</div>
          <div className="org-metric-sub">Awaiting review</div>
        </div>
        <div className="org-metric-card">
          <div className="org-metric-label">
            <Armchair aria-hidden />
            Seats
          </div>
          <div className="org-metric-value">
            {data.seatUsage} / {data.seatCap ?? '∞'}
          </div>
          <div className="org-metric-sub">Used / capacity</div>
        </div>
      </div>

      <div className="org-section">
        <div className="org-section-header">
          <div>
            <h2 className="org-section-title">Recent updates</h2>
            <p className="org-section-sub">Latest organization activity</p>
          </div>
        </div>
        <ul className="org-feed">
          {data.recentUpdates.length > 0 ? (
            data.recentUpdates.map((u, i) => (
              <li className="org-feed-item" key={i}>
                <span>{u.summary || u.updateType}</span>
                <span className="org-feed-time">{u.createdAt}</span>
              </li>
            ))
          ) : (
            <li className="org-feed-item is-muted">No entries yet.</li>
          )}
        </ul>
      </div>
    </>
  );
}
