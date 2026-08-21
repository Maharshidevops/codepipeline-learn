import type { LucideIcon } from 'lucide-react';
import {
  Building,
  Briefcase,
  DoorOpen,
  Users,
  SlidersHorizontal,
  MessagesSquare,
  Map as MapIcon,
  Sparkles,
  Activity,
  BarChart3,
  Wrench,
  ListChecks,
  ShieldCheck,
  Landmark,
  FileText,
  Clock,
  BookOpen,
  Brain,
  Mail,
  BarChart2,
  UserCheck,
  Target,
  Gauge,
} from 'lucide-react';
import { paths } from '@/routes/paths';

export type ScoutVertical = 'pe' | 'ib' | 'research';

export const VERTICAL_STORAGE_KEY = 'scout_vertical';

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Show only when can('admin:approve') / can('pe:admin'). */
  requireAdmin?: boolean;
  requirePeAdmin?: boolean;
  /** Activity badge on the PE/IB Activity item. */
  activityBadge?: boolean;
  /** Approvals pending count on Research Approvals. */
  approvalsBadge?: boolean;
  /** Navigate to Coming Soon instead of a live page. */
  comingSoon?: boolean;
}

export const VERTICAL_META: Record<
  ScoutVertical,
  { label: string; icon: LucideIcon; firstPath: string }
> = {
  pe: { label: 'PE', icon: Building, firstPath: paths.pe.firms },
  ib: { label: 'IB', icon: Landmark, firstPath: paths.ib.banks },
  research: { label: 'Research', icon: Target, firstPath: paths.processPreference },
};

/** Prefixes that imply the Research vertical when no stored preference exists. */
export const RESEARCH_PREFIXES = [
  paths.processPreference,
  paths.targetList,
  paths.strategic,
  paths.financialVerticals,
  paths.previousResults,
  paths.knowledgeBank,
  paths.analystPreferences,
  paths.settings.profile,
  paths.settings.apiKeys,
  paths.settings.appearance,
  paths.emailSync,
  paths.usage,
  paths.admin.organizationApprovals,
  paths.scorecard,
  paths.faq,
  paths.bdScoring,
];

export const PE_NAV: SidebarNavItem[] = [
  { to: paths.pe.firms, label: 'Firms', icon: Building },
  { to: paths.pe.holdings, label: 'Holdings', icon: Briefcase },
  { to: paths.pe.people, label: 'People', icon: Users },
  { to: paths.pe.screener, label: 'Screener', icon: SlidersHorizontal },
  // Operator / Staff only tools:
  { to: paths.pe.exitWatch, label: 'Exit Watch', icon: DoorOpen, requirePeAdmin: true },
  { to: paths.pe.ask, label: 'Ask the Market', icon: MessagesSquare, requirePeAdmin: true },
  { to: paths.pe.marketMap, label: 'Market Map', icon: MapIcon, requirePeAdmin: true },
  { to: paths.pe.digest, label: 'Digest', icon: Sparkles, requirePeAdmin: true },
  {
    to: paths.pe.changes,
    label: 'Activity',
    icon: Activity,
    activityBadge: true,
    requirePeAdmin: true,
  },
  { to: paths.pe.analysis, label: 'Analysis', icon: BarChart3, requirePeAdmin: true },
  { to: paths.pe.corrections, label: 'Corrections', icon: Wrench, requirePeAdmin: true },
  { to: paths.pe.actionQueue, label: 'Action Queue', icon: ListChecks, requirePeAdmin: true },
  { to: paths.pe.admin, label: 'Admin', icon: ShieldCheck, requirePeAdmin: true },
];

export const IB_NAV: SidebarNavItem[] = [
  { to: paths.ib.banks, label: 'Banks', icon: Landmark },
  { to: paths.ib.transactions, label: 'Transactions', icon: FileText },
  { to: paths.ib.people, label: 'Professionals', icon: Users },
  { to: paths.ib.screener, label: 'IB Screener', icon: SlidersHorizontal },
];

export const RESEARCH_NAV: SidebarNavItem[] = [
  { to: paths.processPreference, label: 'Research Home', icon: Clock },
  { to: paths.previousResults, label: 'Previous Results', icon: FileText },
  { to: paths.scorecard, label: 'Scorecard', icon: Gauge },
  { to: paths.knowledgeBank, label: 'Knowledge Bank', icon: BookOpen },
  { to: paths.analystPreferences, label: 'My Preferences', icon: Brain },
  { to: paths.emailSync, label: 'Email Sync', icon: Mail },
  { to: paths.usage, label: 'API Usage', icon: BarChart2 },
  {
    to: paths.admin.organizationApprovals,
    label: 'Approvals',
    icon: UserCheck,
    requireAdmin: true,
    approvalsBadge: true,
  },
];

function readStoredVertical(): ScoutVertical | null {
  try {
    const stored = localStorage.getItem(VERTICAL_STORAGE_KEY) as ScoutVertical | null;
    if (stored === 'pe' || stored === 'ib' || stored === 'research') return stored;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Resolve the active vertical.
 * Activity (`/pe/changes`) is shared by PE and IB (same as Replit `/changes`) — for that
 * route we keep the stored vertical so IB → Activity does not flip the rail to PE.
 */
export function detectVertical(pathname: string): ScoutVertical {
  const stored = readStoredVertical();

  // Shared PE/IB Activity feed — respect the vertical the user was already in.
  if (pathname === paths.pe.changes || pathname.startsWith(`${paths.pe.changes}/`)) {
    if (stored === 'pe' || stored === 'ib') return stored;
    return 'pe';
  }

  if (pathname === paths.ib.banks || pathname.startsWith(`${paths.ib.banks}/`)) return 'ib';
  if (pathname.startsWith('/pe')) return 'pe';
  if (RESEARCH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return 'research';
  }

  if (stored) return stored;
  if (pathname.startsWith('/org/') || pathname.startsWith('/deals')) return 'research';
  return 'pe';
}

export function navIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  // IB Banks is `/ib` — must not light when on /ib/transactions etc.
  if (href === paths.ib.banks) {
    const literals = [paths.ib.transactions, paths.ib.people, paths.ib.screener];
    if (literals.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
    return pathname === paths.ib.banks || pathname.startsWith(`${paths.ib.banks}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
