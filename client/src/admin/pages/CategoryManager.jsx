import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import ImageUploader from "../components/ImageUploader";
import { images as bundledImages } from "../../assets/images";
import { resolveUploadUrl } from "../../apiBase";

function resolveSrc(url) {
  return bundledImages[url] || resolveUploadUrl(url);
}

export default function CategoryManager() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  function load() {
    setLoading(true);
    api
      .get("/categories")
      .then((d) => setCategories(d.categories))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post("/categories", { name: name.trim(), description: description.trim() });
      toast.success("Category added.");
      setName("");
      setDescription("");
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(cat) {
    try {
      await api.put(`/categories/${cat._id}`, { isActive: !cat.isActive });
      setCategories((cs) => cs.map((c) => (c._id === cat._id ? { ...c, isActive: !c.isActive } : c)));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function saveEdit(cat) {
    if (!editName.trim() || editName.trim() === cat.name) {
      setEditingId(null);
      return;
    }
    try {
      const { category } = await api.put(`/categories/${cat._id}`, { name: editName.trim() });
      setCategories((cs) => cs.map((c) => (c._id === cat._id ? category : c)));
      toast.success("Category renamed.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditingId(null);
    }
  }

  async function updateImage(cat, image) {
    try {
      const { category } = await api.put(`/categories/${cat._id}`, { image });
      setCategories((cs) => cs.map((c) => (c._id === cat._id ? category : c)));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function reorder(cat, direction) {
    try {
      await api.put(`/categories/${cat._id}/reorder`, { direction });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    const cat = pendingDelete;
    setPendingDelete(null);
    try {
      await api.delete(`/categories/${cat._id}`);
      toast.success("Category deleted.");
      setCategories((cs) => cs.filter((c) => c._id !== cat._id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <form className="ff-admin-inline-form" onSubmit={onCreate}>
        <input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="ff-btn ff-btn-primary" disabled={creating || !name.trim()}>
          + Add category
        </button>
      </form>

      {loading ? (
        <div className="ff-admin-loading-state">Loading categories…</div>
      ) : categories.length === 0 ? (
        <div className="ff-admin-empty-state">No categories yet.</div>
      ) : (
        <div className="ff-admin-table-wrap">
          <table className="ff-admin-table">
            <thead>
              <tr>
                <th aria-label="Image" />
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th aria-label="Order" />
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c, i) => (
                <tr key={c._id}>
                  <td>
                    {c.image?.url ? (
                      <img src={resolveSrc(c.image.url)} alt={c.image.alt || ""} className="ff-admin-table-thumb" />
                    ) : (
                      <ImageUploader image={c.image} onChange={(image) => updateImage(c, image)} label="image" />
                    )}
                    {c.image?.url && (
                      <button type="button" className="ff-admin-link-btn" onClick={() => updateImage(c, null)}>
                        Remove
                      </button>
                    )}
                  </td>
                  <td>
                    {editingId === c._id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => saveEdit(c)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(c)}
                      />
                    ) : (
                      <button
                        type="button"
                        className="ff-admin-table-title ff-admin-link-btn"
                        onClick={() => {
                          setEditingId(c._id);
                          setEditName(c.name);
                        }}
                      >
                        {c.name}
                      </button>
                    )}
                  </td>
                  <td>{c.description || "—"}</td>
                  <td>
                    <button type="button" className={`ff-admin-badge ff-admin-badge--${c.isActive ? "active" : "draft"}`} onClick={() => toggleActive(c)}>
                      {c.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="ff-admin-table-reorder">
                    <button type="button" onClick={() => reorder(c, "up")} disabled={i === 0} aria-label="Move up">
                      ↑
                    </button>
                    <button type="button" onClick={() => reorder(c, "down")} disabled={i === categories.length - 1} aria-label="Move down">
                      ↓
                    </button>
                  </td>
                  <td className="ff-admin-table-actions">
                    <button type="button" onClick={() => setPendingDelete(c)}>
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
        title="Delete this category?"
        message={pendingDelete ? `Deleting "${pendingDelete.name}" cannot be undone. Categories still used by products can't be deleted.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
