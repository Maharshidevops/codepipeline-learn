// Replit-style PE / IB / Research vertical sidebar. Nav targets the existing Quralyst SPA
// routes (Business-Research-Tool---Quralyst backend). Mobile uses the same overlay toggle.
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Building, Settings, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { authService, peChangesService } from '@/services/api';
import { paths } from '@/routes/paths';
import { clearClientAuthCookies } from '@/lib/authCookies';
import GlobalProgressTracker from '@/components/layout/GlobalProgressTracker';
import { maximizeProgress } from '@/hooks/useProgressStream';
import { ApprovalsBadge } from './SidebarStatusBadges';
import {
  type ScoutVertical,
  type SidebarNavItem,
  PE_NAV,
  IB_NAV,
  RESEARCH_NAV,
  VERTICAL_META,
  VERTICAL_STORAGE_KEY,
  detectVertical,
  navIsActive,
} from './sidebarNav';
import './sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, logout } = useAuth();
  const { can } = usePermissions();
  const canApprove = can('admin:approve');
  const canManageOrg = can('org:manage_members');
  const canPeDataset = can('pe:dataset');
  const canPeAdmin = can('pe:admin');
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const vertical = detectVertical(location.pathname);

  // Persist the resolved vertical so shared routes (Activity) keep IB/PE context like Replit.
  useEffect(() => {
    try {
      localStorage.setItem(VERTICAL_STORAGE_KEY, vertical);
    } catch {
      /* ignore */
    }
  }, [vertical]);

  // Close the mobile drawer on navigation (same destination click still needs the link onClick).
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Escape + body scroll lock while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const { data: changesSummary } = useQuery({
    queryKey: ['pe', 'changes', 'summary', 'sidebar'],
    queryFn: () => peChangesService.getChangesSummary(),
    enabled: isAuthenticated && canPeDataset && (vertical === 'pe' || vertical === 'ib'),
    staleTime: 60_000,
  });
  const changeCount = changesSummary?.total ?? 0;

  function switchVertical(v: ScoutVertical) {
    try {
      localStorage.setItem(VERTICAL_STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
    closeMenu();
    navigate(VERTICAL_META[v].firstPath);
  }

  const handleLogout = () => {
    closeMenu();
    void authService.logout().catch(() => {});
    clearClientAuthCookies();
    logout();
    navigate(paths.auth.login);
  };

  const rawNav: SidebarNavItem[] =
    vertical === 'pe' ? PE_NAV : vertical === 'ib' ? IB_NAV : RESEARCH_NAV;
  const navItems = rawNav.filter((item) => {
    if (item.requireAdmin && !canApprove) return false;
    if (item.requirePeAdmin && !canPeAdmin) return false;
    return true;
  });

  // PE / IB need pe:dataset; Research is always available. Still show all three tabs like Replit.
  const verticals: ScoutVertical[] = ['pe', 'ib', 'research'];

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- mobile backdrop dismiss */}
      <div
        className={`sidebar-overlay${menuOpen ? ' show' : ''}`}
        id="sidebarOverlay"
        onClick={closeMenu}
      />

      <aside className={`sidebar sidebar--replit${menuOpen ? ' is-open' : ''}`} id="sidebar">
        <div className="sidebar-topbar">
          <button
            type="button"
            className="sidebar-mobile-toggle"
            id="sidebarToggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="sidebarMenu"
          >
            <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true" />
          </button>

          <div className="sidebar-logo">
            <a href={isAuthenticated ? paths.processPreference : paths.auth.login}>
              <img src="/images/quralyst-logo.svg" alt="QuraLyst" className="sidebar-logo-img" />
            </a>
          </div>
        </div>

        <div className={`sidebar-menu${menuOpen ? ' show' : ''}`} id="sidebarMenu">
          {isAuthenticated ? (
            <>
              <div className="sidebar-vertical-switch" role="tablist" aria-label="Product vertical">
                {verticals.map((v) => {
                  const { label, icon: Icon } = VERTICAL_META[v];
                  const active = v === vertical;
                  const locked = (v === 'pe' || v === 'ib') && !canPeDataset;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`sidebar-vertical-btn${active ? ' active' : ''}${locked ? ' locked' : ''}`}
                      onClick={() => switchVertical(v)}
                      title={locked ? `${label} requires PE dataset access` : `Switch to ${label}`}
                    >
                      <Icon className="sidebar-icon" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <nav
                className="sidebar-nav"
                aria-label={`${VERTICAL_META[vertical].label} navigation`}
              >
                {navItems.map((item) => {
                  const active = navIsActive(location.pathname, item.to);
                  const Icon = item.icon;
                  const badge =
                    item.activityBadge && changeCount > 0 ? (
                      <span className="sidebar-nav-badge" aria-label={`${changeCount} changes`}>
                        {changeCount > 999 ? '999+' : changeCount}
                      </span>
                    ) : item.approvalsBadge ? (
                      <ApprovalsBadge />
                    ) : null;

                  if (item.comingSoon) {
                    return (
                      <NavLink
                        key={`${item.to}-${item.label}`}
                        to={`${paths.comingSoon}?feature=${encodeURIComponent(item.label)}`}
                        className={`sidebar-nav-link${active ? ' active' : ''}`}
                        onClick={closeMenu}
                        aria-label={`${item.label} (Coming soon)`}
                      >
                        <Icon className="sidebar-icon" aria-hidden="true" />
                        <span className="sidebar-nav-label">{item.label}</span>
                        <span className="sidebar-nav-soon">Soon</span>
                      </NavLink>
                    );
                  }

                  return (
                    <NavLink
                      key={`${item.to}-${item.label}`}
                      to={item.to}
                      className={`sidebar-nav-link${active ? ' active' : ''}`}
                      onClick={closeMenu}
                      aria-label={item.label}
                      end={item.to === paths.ib.banks}
                    >
                      <Icon className="sidebar-icon" aria-hidden="true" />
                      <span className="sidebar-nav-label">{item.label}</span>
                      {badge}
                    </NavLink>
                  );
                })}

                <GlobalProgressTracker onMaximize={maximizeProgress} />
              </nav>

              <div className="sidebar-account">
                <div className="sidebar-account-divider" />
                <NavLink
                  to={paths.deals}
                  className={({ isActive }) =>
                    `sidebar-nav-link sidebar-nav-link--muted${isActive ? ' active' : ''}`
                  }
                  onClick={closeMenu}
                  aria-label="Deals"
                >
                  <Briefcase className="sidebar-icon" aria-hidden="true" />
                  <span className="sidebar-nav-label">Deals</span>
                </NavLink>

                {currentUser?.showOrgNav && currentUser.orgNavSlug && (
                  <NavLink
                    to={
                      canManageOrg
                        ? paths.org.dashboard(currentUser.orgNavSlug)
                        : paths.org.crm(currentUser.orgNavSlug)
                    }
                    className={({ isActive }) =>
                      `sidebar-nav-link sidebar-nav-link--muted${isActive ? ' active' : ''}`
                    }
                    onClick={closeMenu}
                    aria-label="Organization"
                  >
                    <Building className="sidebar-icon" aria-hidden="true" />
                    <span className="sidebar-nav-label">Organization</span>
                  </NavLink>
                )}

                <NavLink
                  to={paths.settings.apiKeys}
                  className={({ isActive }) =>
                    `sidebar-nav-link sidebar-nav-link--muted${isActive ? ' active' : ''}`
                  }
                  onClick={closeMenu}
                  aria-label="Settings"
                >
                  <Settings className="sidebar-icon" aria-hidden="true" />
                  <span className="sidebar-nav-label">Settings</span>
                </NavLink>

                <button
                  type="button"
                  className="sidebar-nav-link sidebar-nav-link--muted sidebar-logout-btn"
                  onClick={handleLogout}
                  aria-label="Log out"
                >
                  <LogOut className="sidebar-icon" aria-hidden="true" />
                  <span className="sidebar-nav-label">Log out</span>
                </button>
              </div>
            </>
          ) : (
            <nav className="sidebar-nav">
              <NavLink to={paths.auth.login} className="sidebar-nav-link" onClick={closeMenu}>
                <LogIn className="sidebar-icon" aria-hidden="true" />
                <span className="sidebar-nav-label">Login</span>
              </NavLink>
              <NavLink to={paths.auth.signup} className="sidebar-nav-link" onClick={closeMenu}>
                <UserPlus className="sidebar-icon" aria-hidden="true" />
                <span className="sidebar-nav-label">Sign Up</span>
              </NavLink>
            </nav>
          )}
        </div>
      </aside>
    </>
  );
}
