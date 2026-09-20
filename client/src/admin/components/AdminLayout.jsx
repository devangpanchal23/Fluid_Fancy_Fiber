import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

const LABELS = {
  admin: "Admin",
  dashboard: "Dashboard",
  products: "Products",
  new: "New",
  edit: "Edit",
  categories: "Categories",
  "cone-library": "Cone library",
  enquiries: "Enquiries",
  settings: "Settings",
  profile: "My profile"
};

function useBreadcrumb() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean).filter((p) => p !== "admin");
  if (!parts.length) return "Dashboard";
  return parts
    .map((p) => LABELS[p] || (p.length > 12 ? "Detail" : p))
    .join(" / ");
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const breadcrumb = useBreadcrumb();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className={`ff-admin-shell${drawerOpen ? " drawer-open" : ""}`}>
      <aside className="ff-admin-sidebar">
        <AdminSidebar />
      </aside>

      {drawerOpen && (
        <div className="ff-admin-drawer-overlay" onClick={() => setDrawerOpen(false)} role="presentation" />
      )}
      <aside className="ff-admin-drawer" aria-hidden={!drawerOpen}>
        <AdminSidebar onNavigate={() => setDrawerOpen(false)} />
      </aside>

      <div className="ff-admin-main">
        <AdminHeader onMenuClick={() => setDrawerOpen((v) => !v)} breadcrumb={breadcrumb} />
        <main className="ff-admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
