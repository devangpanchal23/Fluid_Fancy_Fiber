import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import { images as bundledImages } from "../../assets/images";
import { resolveUploadUrl } from "../../apiBase";

function resolveSrc(url) {
  return bundledImages[url] || resolveUploadUrl(url);
}

// Shows the stored image, or a clear "needs image" marker when it is missing
// or fails to load, so a broken record is obvious and one click from a fix.
function ConeThumb({ product }) {
  const [broken, setBroken] = useState(false);
  if (!product.image?.url || broken) {
    return (
      <Link to={`/admin/cone-library/${product._id}/edit`} className="ff-admin-table-thumb ff-admin-table-thumb--empty" title="Image missing — click to add one">
        <span aria-hidden="true">!</span>
      </Link>
    );
  }
  return <img src={resolveSrc(product.image.url)} alt={product.image.alt || product.productName} className="ff-admin-table-thumb" onError={() => setBroken(true)} />;
}

export default function ConeLibraryList() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [moving, setMoving] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    api
      .get("/cone-library")
      .then((d) => setItems(d.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function reorder(product, direction) {
    setMoving(true);
    try {
      const d = await api.put(`/cone-library/${product._id}/reorder`, { direction });
      setItems(d.items);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMoving(false);
    }
  }

  async function confirmDelete() {
    const product = pendingDelete;
    setPendingDelete(null);
    try {
      await api.delete(`/cone-library/${product._id}`);
      toast.success(`"${product.productName}" deleted.`);
      setItems((it) => it.filter((p) => p._id !== product._id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="ff-admin-toolbar">
        <p className="ff-admin-hint" style={{ flex: 1, margin: 0, alignSelf: "center" }}>Shown on the live site in this order. Use the arrows to rearrange.</p>
        <Link to="/admin/cone-library/new" className="ff-btn ff-btn-primary">
          + New product
        </Link>
      </div>

      {error && <div className="ff-admin-error-state">{error}</div>}
      {loading ? (
        <div className="ff-admin-loading-state">Loading cone library…</div>
      ) : items.length === 0 ? (
        <div className="ff-admin-empty-state">No cone library products yet.</div>
      ) : (
        <div className="ff-admin-table-wrap">
          <table className="ff-admin-table">
            <thead>
              <tr>
                <th aria-label="Image" />
                <th>Product name</th>
                <th>Product details</th>
                <th aria-label="Order" />
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((p, i) => (
                <tr key={p._id}>
                  <td>
                    <ConeThumb product={p} />
                  </td>
                  <td>
                    <Link to={`/admin/cone-library/${p._id}/edit`} className="ff-admin-table-title">
                      {p.productName}
                    </Link>
                  </td>
                  <td>{p.productDetails}</td>
                  <td>
                    <div className="ff-admin-table-reorder">
                      <button type="button" onClick={() => reorder(p, "up")} disabled={moving || i === 0} aria-label="Move up">
                        ↑
                      </button>
                      <button type="button" onClick={() => reorder(p, "down")} disabled={moving || i === items.length - 1} aria-label="Move down">
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="ff-admin-table-actions">
                      <Link to={`/admin/cone-library/${p._id}/edit`}>Edit</Link>
                      <button type="button" onClick={() => setPendingDelete(p)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this product?"
        message={pendingDelete ? `Deleting "${pendingDelete.productName}" removes it from the live site and cannot be undone.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
