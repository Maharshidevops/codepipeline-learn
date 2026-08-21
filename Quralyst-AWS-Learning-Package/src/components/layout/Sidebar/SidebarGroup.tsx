// SidebarGroup (Phase 22) — a collapsible nav group. The parent row = icon + label that NAVIGATES to
// the group's overview route, plus a chevron <button> that TOGGLES the submenu. The group auto-opens
// when the current route is its overview or one of its children, and the whole active trail (parent +
// active child) is highlighted. In the collapsed icon-rail (Phase 21) the submenu shows as a
// fixed-positioned flyout next to the rail, opened on hover/focus (keyboard-accessible).
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface RouteMatch {
  pathname: string;
  search: string;
}

export interface SidebarGroupChild {
  to: string;
  label: string;
  isActive: (loc: RouteMatch) => boolean;
}

export interface SidebarGroupProps {
  icon: string;
  label: string;
  overviewTo: string;
  isOverviewActive: (loc: RouteMatch) => boolean;
  items: SidebarGroupChild[];
  collapsed: boolean;
  badge?: ReactNode;
  onNavigate?: () => void;
}

export default function SidebarGroup({
  icon,
  label,
  overviewTo,
  isOverviewActive,
  items,
  collapsed,
  badge,
  onNavigate,
}: SidebarGroupProps) {
  const location = useLocation();
  const loc: RouteMatch = { pathname: location.pathname, search: location.search };
  const submenuId = useId();

  const childActive = items.some((c) => c.isActive(loc));
  const activeTrail = isOverviewActive(loc) || childActive;

  // Inline accordion state (expanded sidebar). Auto-open when the group becomes the active trail;
  // never force-close, so a group the user opened/closed manually is respected.
  const [open, setOpen] = useState(activeTrail);
  useEffect(() => {
    if (activeTrail) setOpen(true);
  }, [activeTrail]);

  // Collapsed-rail flyout state (hover/focus), with fixed coords so it escapes the rail's overflow.
  const rowRef = useRef<HTMLDivElement>(null);
  const [flyout, setFlyout] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const openFlyout = () => {
    if (!collapsed) return;
    const rect = rowRef.current?.getBoundingClientRect();
    // Overlap the rail edge by 2px so there's no hover dead-zone between the icon and the flyout.
    if (rect) setFlyoutPos({ top: rect.top, left: rect.right - 2 });
    setFlyout(true);
  };
  const closeFlyout = () => setFlyout(false);

  const showSubmenu = collapsed ? flyout : open;

  return (
    <div
      className={`sidebar-group${open ? ' open' : ''}${activeTrail ? ' active-trail' : ''}`}
      onMouseEnter={openFlyout}
      onMouseLeave={() => collapsed && closeFlyout()}
      onFocus={openFlyout}
      onBlur={(e) => {
        if (collapsed && !e.currentTarget.contains(e.relatedTarget as Node | null)) closeFlyout();
      }}
    >
      <div className="sidebar-group-row" ref={rowRef}>
        <Link
          to={overviewTo}
          className={`sidebar-item sidebar-group-label${activeTrail ? ' active' : ''}`}
          onClick={onNavigate}
          aria-label={label}
        >
          <i className={`bi ${icon}`} aria-hidden="true" />
          <span>{label}</span>
          {badge}
        </Link>
        {!collapsed && (
          <button
            type="button"
            className={`sidebar-group-chevron${open ? ' open' : ''}`}
            aria-expanded={open}
            aria-controls={submenuId}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${label} menu`}
            onClick={() => setOpen((o) => !o)}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        )}
      </div>

      <ul
        id={submenuId}
        role="group"
        aria-label={label}
        className={`sidebar-submenu${collapsed ? ' sidebar-flyout' : ''}`}
        style={
          collapsed
            ? { display: showSubmenu ? 'block' : 'none', top: flyoutPos.top, left: flyoutPos.left }
            : { display: showSubmenu ? 'block' : 'none' }
        }
      >
        {collapsed && <li className="sidebar-flyout-title">{label}</li>}
        {items.map((c) => {
          const active = c.isActive(loc);
          return (
            <li key={c.to}>
              <Link
                to={c.to}
                className={`sidebar-item sidebar-subitem${active ? ' active' : ''}`}
                onClick={onNavigate}
                aria-label={c.label}
                aria-current={active ? 'page' : undefined}
              >
                <span className="sidebar-subitem-dot" aria-hidden="true" />
                <span>{c.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
