import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [active, draft, archived, enquiriesTotal, recentProducts, recentEnquiries] = await Promise.all([
          api.get("/products", { status: "active", limit: 1 }),
          api.get("/products", { status: "draft", limit: 1 }),
          api.get("/products", { status: "archived", limit: 1 }),
          api.get("/enquiries", { limit: 1 }),
          api.get("/products", { limit: 5, sort: "-createdAt" }),
          api.get("/enquiries", { limit: 5 })
        ]);
        if (cancelled) return;
        setStats({
          active: active.total,
          draft: draft.total,
          archived: archived.total,
          total: active.total + draft.total + archived.total,
          enquiries: enquiriesTotal.total,
          recentProducts: recentProducts.items,
          recentEnquiries: recentEnquiries.items
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="ff-admin-error-state">{error}</div>;
  if (!stats) return <div className="ff-admin-loading-state">Loading dashboard…</div>;

  return (
    <div>
      <div className="ff-admin-stat-grid">
        <StatCard label="Total products" value={stats.total} />
        <StatCard label="Active products" value={stats.active} />
        <StatCard label="Draft products" value={stats.draft} />
        <StatCard label="Total enquiries" value={stats.enquiries} />
      </div>

      <div className="ff-admin-quick-actions">
        <Link to="/admin/products/new" className="ff-btn ff-btn-primary">
          + New product
        </Link>
        <Link to="/admin/categories" className="ff-btn ff-btn-ghost">
          Manage categories
        </Link>
        <Link to="/admin/enquiries" className="ff-btn ff-btn-ghost">
          View enquiries
        </Link>
      </div>

      <div className="ff-admin-panel-grid">
        <section className="ff-admin-panel">
          <h2>Recent products</h2>
          {stats.recentProducts.length === 0 ? (
            <p className="ff-admin-empty">No products yet.</p>
          ) : (
            <ul className="ff-admin-mini-list">
              {stats.recentProducts.map((p) => (
                <li key={p._id}>
                  <Link to={`/admin/products/${p._id}/edit`}>{p.name}</Link>
                  <span className={`ff-admin-badge ff-admin-badge--${p.status}`}>{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ff-admin-panel">
          <h2>Recent enquiries</h2>
          {stats.recentEnquiries.length === 0 ? (
            <p className="ff-admin-empty">No enquiries yet.</p>
          ) : (
            <ul className="ff-admin-mini-list">
              {stats.recentEnquiries.map((e) => (
                <li key={e._id}>
                  <Link to="/admin/enquiries">{e.name || e.email}</Link>
                  <span className={`ff-admin-badge ff-admin-badge--${e.status}`}>{e.status.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="ff-admin-stat-card">
      <div className="ff-admin-stat-value">{value}</div>
      <div className="ff-admin-stat-label">{label}</div>
    </div>
  );
}
