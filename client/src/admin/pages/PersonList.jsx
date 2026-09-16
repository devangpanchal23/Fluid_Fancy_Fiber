import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import { images as bundledImages } from "../../assets/images";

function resolveSrc(url) {
  return bundledImages[url] || url;
}

export default function PersonList() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  function load() {
    setLoading(true);
    setError("");
    api
      .get("/people", { q, sort: "order" })
      .then((d) => setItems(d.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActive(person) {
    try {
      const { person: updated } = await api.put(`/people/${person._id}`, { isActive: !person.isActive });
      setItems((it) => it.map((p) => (p._id === person._id ? updated : p)));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function reorder(person, direction) {
    try {
      await api.put(`/people/${person._id}/reorder`, { direction });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    const person = pendingDelete;
    setPendingDelete(null);
    try {
      await api.delete(`/people/${person._id}`);
      toast.success(`"${person.name}" deleted.`);
      setItems((it) => it.filter((p) => p._id !== person._id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="ff-admin-toolbar">
        <input
          type="search"
          placeholder="Search people…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="ff-admin-search"
        />
        <Link to="/admin/people/new" className="ff-btn ff-btn-primary">
          + New person
        </Link>
      </div>

      {error && <div className="ff-admin-error-state">{error}</div>}
      {loading ? (
        <div className="ff-admin-loading-state">Loading people…</div>
      ) : items.length === 0 ? (
        <div className="ff-admin-empty-state">No people yet.</div>
      ) : (
        <div className="ff-admin-table-wrap">
          <table className="ff-admin-table">
            <thead>
              <tr>
                <th aria-label="Photo" />
                <th>Name</th>
                <th>Designation</th>
                <th>Status</th>
                <th aria-label="Order" />
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((p, i) => (
                <tr key={p._id}>
                  <td>
                    {p.image?.url ? (
                      <img src={resolveSrc(p.image.url)} alt={p.image.alt || ""} className="ff-admin-table-thumb" />
                    ) : (
                      <span className="ff-admin-table-thumb ff-admin-table-thumb--empty" />
                    )}
                  </td>
                  <td>
                    <Link to={`/admin/people/${p._id}/edit`} className="ff-admin-table-title">
                      {p.name}
                    </Link>
                  </td>
                  <td>{p.designation}</td>
                  <td>
                    <button
                      type="button"
                      className={`ff-admin-badge ff-admin-badge--${p.isActive ? "active" : "draft"}`}
                      onClick={() => toggleActive(p)}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="ff-admin-table-reorder">
                    <button type="button" onClick={() => reorder(p, "up")} disabled={i === 0} aria-label="Move up">
                      ↑
                    </button>
                    <button type="button" onClick={() => reorder(p, "down")} disabled={i === items.length - 1} aria-label="Move down">
                      ↓
                    </button>
                  </td>
                  <td className="ff-admin-table-actions">
                    <Link to={`/admin/people/${p._id}/edit`}>Edit</Link>
                    <button type="button" onClick={() => setPendingDelete(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this person?"
        message={pendingDelete ? `Deleting "${pendingDelete.name}" cannot be undone.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
