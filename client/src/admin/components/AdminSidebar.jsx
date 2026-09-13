import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "grid" },
  { to: "/admin/products", label: "Products", icon: "box" },
  { to: "/admin/categories", label: "Categories", icon: "tag" },
  { to: "/admin/enquiries", label: "Enquiries", icon: "mail" },
  { to: "/admin/settings", label: "Settings", icon: "gear" }
];

const ICONS = {
  grid: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="8" /><rect x="3" y="13" width="8" height="8" /><rect x="13" y="13" width="8" height="8" /></svg>
  ),
  box: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
  ),
  tag: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20.6 12.6 12 21.2 2.8 12 2.8 4.8 12 4.8Z" /><circle cx="8" cy="9" r="1.4" fill="currentColor" stroke="none" /></svg>
  ),
  mail: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m4 6 8 7 8-7" /></svg>
  ),
  gear: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.3-.9-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3L2.7 15l2 3.4 2.3-.9c.77.66 1.65 1.17 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.4Z" /></svg>
  )
};

export default function AdminSidebar({ onNavigate }) {
  return (
    <nav className="ff-admin-sidebar-nav" aria-label="Admin">
      <div className="ff-admin-brand">Fluid Fancy Fibre</div>
      <ul>
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => `ff-admin-nav-link${isActive ? " is-active" : ""}`}
              onClick={onNavigate}
            >
              <span className="ff-admin-nav-icon">{ICONS[item.icon]}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <a href="/" className="ff-admin-nav-link ff-admin-nav-link--exit" target="_blank" rel="noreferrer">
        <span className="ff-admin-nav-icon">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v6H4V6h6" /></svg>
        </span>
        <span>View site</span>
      </a>
    </nav>
  );
}
