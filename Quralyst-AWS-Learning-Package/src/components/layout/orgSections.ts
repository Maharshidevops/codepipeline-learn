// Single source of truth for the Organization section list — consumed by both OrgSubnav (the org
// page tab row) and the sidebar "Organization" group (Phase 22) so the two can never drift.
// `adminOnly` mirrors the Jinja `_is_org_admin` gates from Backup/templates/organization/_subnav.html.
import { paths } from '@/routes/paths';

export interface OrgSection {
  to: string;
  label: string;
  icon: string; // bootstrap-icons class, e.g. "bi-speedometer2"
  adminOnly: boolean;
}

export function orgSections(orgSlug: string): OrgSection[] {
  return [
    {
      to: paths.org.dashboard(orgSlug),
      label: 'Dashboard',
      icon: 'bi-speedometer2',
      adminOnly: true,
    },
    { to: paths.org.edit(orgSlug), label: 'Edit', icon: 'bi-pencil-square', adminOnly: true },
    { to: paths.org.billing(orgSlug), label: 'Billing', icon: 'bi-credit-card', adminOnly: false },
    { to: paths.org.members(orgSlug), label: 'Members', icon: 'bi-people', adminOnly: true },
    { to: paths.org.invites(orgSlug), label: 'Invites', icon: 'bi-envelope-plus', adminOnly: true },
    {
      to: paths.org.creditLedger(orgSlug),
      label: 'Credit ledger',
      icon: 'bi-coin',
      adminOnly: false,
    },
    { to: paths.org.updates(orgSlug), label: 'Updates', icon: 'bi-journal-text', adminOnly: true },
    { to: paths.org.crm(orgSlug), label: 'CRM', icon: 'bi-briefcase', adminOnly: false },
    { to: paths.org.domains(orgSlug), label: 'Domains', icon: 'bi-globe2', adminOnly: true },
  ];
}

/** Filter to the sections visible for the current org role. */
export function visibleOrgSections(orgSlug: string, isOrgAdmin: boolean): OrgSection[] {
  return orgSections(orgSlug).filter((item) => !item.adminOnly || isOrgAdmin);
}
