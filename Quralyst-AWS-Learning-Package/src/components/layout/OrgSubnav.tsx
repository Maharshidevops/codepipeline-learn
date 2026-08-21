// OrgSubnav — horizontal org-section nav (Backup/templates/organization/_subnav.html). Restyled in
// Phase 23 to render through the shared <TabNav>, matching the result-workspace tab row. The section
// list comes from the shared orgSections config (single source of truth with the sidebar group);
// admin-only items are filtered by isOrgAdmin (mirrors the Jinja `_is_org_admin` checks).
import TabNav from '@/components/layout/TabNav';
import { visibleOrgSections } from '@/components/layout/orgSections';

export interface OrgSubnavProps {
  orgSlug: string;
  isOrgAdmin: boolean;
}

export default function OrgSubnav({ orgSlug, isOrgAdmin }: OrgSubnavProps) {
  const items = visibleOrgSections(orgSlug, isOrgAdmin).map((section) => ({
    to: section.to,
    label: section.label,
    icon: section.icon,
    end: true, // org section routes are exact destinations
  }));

  return <TabNav items={items} ariaLabel="Organization sections" />;
}
