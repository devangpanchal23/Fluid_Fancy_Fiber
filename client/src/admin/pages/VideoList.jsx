import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";

export default function VideoList() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  function load() {
    setLoading(true);
    setError("");
    api
      .get("/videos", { sort: "order" })
      .then((d) => setItems(d.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePublished(video) {
    try {
      const { video: updated } = await api.put(`/videos/${video._id}`, {
        status: video.status === "published" ? "draft" : "published"
      });
      setItems((it) => it.map((v) => (v._id === video._id ? updated : v)));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function reorder(video, direction) {
    try {
      await api.put(`/videos/${video._id}/reorder`, { direction });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    const video = pendingDelete;
    setPendingDelete(null);
    try {
      await api.delete(`/videos/${video._id}`);
      toast.success(`"${video.title}" deleted.`);
      setItems((it) => it.filter((v) => v._id !== video._id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="ff-admin-toolbar">
        <Link to="/admin/videos/new" className="ff-btn ff-btn-primary">
          + New video
        </Link>
      </div>

      {error && <div className="ff-admin-error-state">{error}</div>}
      {loading ? (
        <div className="ff-admin-loading-state">Loading videos…</div>
      ) : items.length === 0 ? (
        <div className="ff-admin-empty-state">No videos yet.</div>
      ) : (
        <div className="ff-admin-table-wrap">
          <table className="ff-admin-table">
            <thead>
              <tr>
                <th aria-label="Thumbnail" />
                <th>Title</th>
                <th>Status</th>
                <th aria-label="Order" />
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((v, i) => (
                <tr key={v._id}>
                  <td>
                    {v.thumbnail?.url ? (
                      <img src={v.thumbnail.url} alt="" className="ff-admin-table-thumb" />
                    ) : (
                      <span className="ff-admin-table-thumb ff-admin-table-thumb--empty" />
                    )}
                  </td>
                  <td>
                    <Link to={`/admin/videos/${v._id}/edit`} className="ff-admin-table-title">
                      {v.title}
                    </Link>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`ff-admin-badge ff-admin-badge--${v.status === "published" ? "active" : "draft"}`}
                      onClick={() => togglePublished(v)}
                    >
                      {v.status === "published" ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="ff-admin-table-reorder">
                    <button type="button" onClick={() => reorder(v, "up")} disabled={i === 0} aria-label="Move up">
                      ↑
                    </button>
                    <button type="button" onClick={() => reorder(v, "down")} disabled={i === items.length - 1} aria-label="Move down">
                      ↓
                    </button>
                  </td>
                  <td className="ff-admin-table-actions">
                    <Link to={`/admin/videos/${v._id}/edit`}>Edit</Link>
                    <button type="button" onClick={() => setPendingDelete(v)}>
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
        title="Delete this video?"
        message={pendingDelete ? `Deleting "${pendingDelete.title}" removes it from Cloudinary and cannot be undone.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
