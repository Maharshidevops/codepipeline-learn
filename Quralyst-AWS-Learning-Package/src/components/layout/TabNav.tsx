// TabNav (Phase 23) — shared horizontal tab row (ResultLayout + OrgSubnav).
// Active = solid btn-standard; inactive = btn-outline-standard (brand-matched pair).
import { NavLink } from 'react-router-dom';

export interface TabNavItem {
  to: string;
  label: string;
  icon?: string; // bootstrap-icons class, e.g. "bi-table"
  end?: boolean; // exact-match active (for index-style routes)
}

export interface TabNavProps {
  items: TabNavItem[];
  ariaLabel: string;
}

export default function TabNav({ items, ariaLabel }: TabNavProps) {
  return (
    <nav className="tab-nav" aria-label={ariaLabel}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          // Native View Transition on tab switches (Phase 36) — no-op where unsupported.
          viewTransition
          className={({ isActive }) => (isActive ? 'btn btn-standard' : 'btn btn-outline-standard')}
        >
          {item.icon && <i className={`bi ${item.icon} me-1`} aria-hidden="true" />}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
