// One sidebar nav link. Reproduces base.html `.sidebar-item` markup (icon + <span>).
// NavLink supplies the `active` class natively (replaces sidebar.js active-link logic).
import { NavLink } from 'react-router-dom';

interface SidebarItemProps {
  to: string;
  icon: string; // bootstrap-icons class, e.g. "bi-list-ul"
  label: string;
  external?: boolean;
  onClick?: () => void;
}

export default function SidebarItem({ to, icon, label, external, onClick }: SidebarItemProps) {
  // `aria-label` keeps the accessible name when the text <span> is visually hidden in the collapsed
  // rail (display:none drops it from the a11y tree). No `title` — it renders a native hover tooltip.
  if (external) {
    return (
      <a
        href={to}
        className="sidebar-item"
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        aria-label={label}
      >
        <i className={`bi ${icon}`}></i>
        <span>{label}</span>
      </a>
    );
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      onClick={onClick}
      aria-label={label}
    >
      <i className={`bi ${icon}`}></i>
      <span>{label}</span>
    </NavLink>
  );
}
