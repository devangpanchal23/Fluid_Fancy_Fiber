import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";

const STATUSES = ["", "active", "draft", "archived"];

export default function ProductList() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("order");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    api.get("/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    setError("");
    api
      .get("/products", { q, status, category, sort, page, limit: 12 })
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
        setPages(d.pages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [q, status, category, sort, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetPage(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  async function reorder(product, direction) {
    try {
      await api.put(`/products/${product._id}/reorder`, { direction });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    const product = pendingDelete;
    setPendingDelete(null);
    try {
      await api.delete(`/products/${product._id}`);
      toast.success(`"${product.name}" archived.`);
      setItems((it) => it.map((p) => (p._id === product._id ? { ...p, status: "archived" } : p)));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="ff-admin-toolbar">
        <input
          type="search"
          placeholder="Search products…"
          value={q}
          onChange={(e) => resetPage(setQ)(e.target.value)}
          className="ff-admin-search"
        />
        <select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s[0].toUpperCase() + s.slice(1) : "All statuses"}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => resetPage(setCategory)(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="order">Display order</option>
          <option value="-createdAt">Newest first</option>
          <option value="createdAt">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="-name">Name Z–A</option>
        </select>
        <Link to="/admin/products/new" className="ff-btn ff-btn-primary">
          + New product
        </Link>
      </div>

      {error && <div className="ff-admin-error-state">{error}</div>}
      {loading ? (
        <div className="ff-admin-loading-state">Loading products…</div>
      ) : items.length === 0 ? (
        <div className="ff-admin-empty-state">No products match these filters.</div>
      ) : (
        <div className="ff-admin-table-wrap">
          <table className="ff-admin-table">
            <thead>
              <tr>
                <th>Product / Type</th>
                <th>Category</th>
                <th>Status</th>
                <th>Featured</th>
                {sort === "order" && <th aria-label="Order" />}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((p, i) => (
                <tr key={p._id}>
                  <td>
                    <Link to={`/admin/products/${p._id}/edit`} className="ff-admin-table-title">
                      {p.name}
                    </Link>
                  </td>
                  <td>{p.category?.name || "—"}</td>
                  <td>
                    <span className={`ff-admin-badge ff-admin-badge--${p.status}`}>{p.status}</span>
                  </td>
                  <td>{p.featured ? "★" : ""}</td>
                  {sort === "order" && (
                    <td className="ff-admin-table-reorder">
                      <button type="button" onClick={() => reorder(p, "up")} disabled={i === 0} aria-label="Move up">
                        ↑
                      </button>
                      <button type="button" onClick={() => reorder(p, "down")} disabled={i === items.length - 1} aria-label="Move down">
                        ↓
                      </button>
                    </td>
                  )}
                  <td className="ff-admin-table-actions">
                    <Link to={`/admin/products/${p._id}/variants`}>Variants</Link>
                    <Link to={`/admin/products/${p._id}/edit`}>Edit</Link>
                    {p.status !== "archived" && (
                      <button type="button" onClick={() => setPendingDelete(p)}>
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="ff-admin-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages} · {total} total
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Archive this product?"
        message={pendingDelete ? `"${pendingDelete.name}" will be hidden from the public catalogue. You can restore it later by editing its status.` : ""}
        confirmLabel="Archive"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
