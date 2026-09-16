import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import { images as bundledImages } from "../../assets/images";

function resolveSrc(url) {
  return bundledImages[url] || url;
}

export default function VariantList() {
  const { productId } = useParams();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    api.get(`/products/${productId}`).then((d) => setProduct(d.product)).catch(() => {});
  }, [productId]);

  function load() {
    setLoading(true);
    setError("");
    api
      .get("/variants", { product: productId, sort: "order" })
      .then((d) => setItems(d.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActive(variant) {
    try {
      const { variant: updated } = await api.put(`/variants/${variant._id}`, { isActive: !variant.isActive });
      setItems((it) => it.map((v) => (v._id === variant._id ? updated : v)));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function reorder(variant, direction) {
    try {
      await api.put(`/variants/${variant._id}/reorder`, { direction });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    const variant = pendingDelete;
    setPendingDelete(null);
    try {
      await api.delete(`/variants/${variant._id}`);
      toast.success(`"${variant.name}" deleted.`);
      setItems((it) => it.filter((v) => v._id !== variant._id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="ff-admin-toolbar">
        <div>
          <Link to="/admin/products" className="ff-admin-link-btn">
            ← All products
          </Link>
          <h2 style={{ margin: "6px 0 0" }}>{product ? `Variants — ${product.name}` : "Variants"}</h2>
        </div>
        <Link to={`/admin/products/${productId}/variants/new`} className="ff-btn ff-btn-primary">
          + New variant
        </Link>
      </div>

      {error && <div className="ff-admin-error-state">{error}</div>}
      {loading ? (
        <div className="ff-admin-loading-state">Loading variants…</div>
      ) : items.length === 0 ? (
        <div className="ff-admin-empty-state">No variants yet — add the first one.</div>
      ) : (
        <div className="ff-admin-table-wrap">
          <table className="ff-admin-table">
            <thead>
              <tr>
                <th aria-label="Image" />
                <th>Name</th>
                <th>SKU</th>
                <th>Status</th>
                <th aria-label="Order" />
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((v, i) => (
                <tr key={v._id}>
                  <td>
                    {v.images?.[0]?.url ? (
                      <img src={resolveSrc(v.images[0].url)} alt={v.images[0].alt || ""} className="ff-admin-table-thumb" />
                    ) : (
                      <span className="ff-admin-table-thumb ff-admin-table-thumb--empty" />
                    )}
                  </td>
                  <td>
                    <Link to={`/admin/products/${productId}/variants/${v._id}/edit`} className="ff-admin-table-title">
                      {v.name}
                    </Link>
                  </td>
                  <td>{v.sku}</td>
                  <td>
                    <button
                      type="button"
                      className={`ff-admin-badge ff-admin-badge--${v.isActive ? "active" : "draft"}`}
                      onClick={() => toggleActive(v)}
                    >
                      {v.isActive ? "Active" : "Inactive"}
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
                    <Link to={`/admin/products/${productId}/variants/${v._id}/edit`}>Edit</Link>
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
        title="Delete this variant?"
        message={pendingDelete ? `Deleting "${pendingDelete.name}" cannot be undone.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
