import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useToast } from "../context/ToastContext";

export default function AdminHeader({ onMenuClick, breadcrumb }) {
  const { admin, logout } = useAdminAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    toast.info("Logged out.");
    navigate("/admin", { replace: true });
  }

  const initials = (admin?.name || admin?.email || "A").slice(0, 1).toUpperCase();

  return (
    <header className="ff-admin-header">
      <button
        type="button"
        className="ff-admin-burger"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="ff-admin-breadcrumb" aria-live="polite">
        {breadcrumb}
      </div>

      <div className="ff-admin-profile" ref={menuRef}>
        <button
          type="button"
          className="ff-admin-profile-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="ff-admin-avatar">{initials}</span>
          <span className="ff-admin-profile-email">{admin?.email}</span>
        </button>
        {menuOpen && (
          <div className="ff-admin-profile-menu" role="menu">
            <button type="button" role="menuitem" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
