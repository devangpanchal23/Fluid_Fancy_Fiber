import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import ProductImageUploader from "../components/ProductImageUploader";

const EMPTY = {
  name: "",
  category: "",
  tag: "",
  shortDescription: "",
  description: "",
  features: [],
  images: [],
  status: "draft",
  featured: false
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [initial, setInitial] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [featuresText, setFeaturesText] = useState("");

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  useEffect(() => {
    api.get("/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api
      .get(`/products/${id}`)
      .then((d) => {
        if (cancelled) return;
        const p = d.product;
        const loaded = {
          name: p.name,
          category: p.category?._id || p.category,
          tag: p.tag || "",
          shortDescription: p.shortDescription || "",
          description: p.description || "",
          features: p.features || [],
          images: p.images || [],
          status: p.status,
          featured: p.featured
        };
        setForm(loaded);
        setInitial(loaded);
        setFeaturesText((p.features || []).join(", "));
      })
      .catch((err) => toast.error(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  useEffect(() => {
    function onBeforeUnload(e) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function buildPayload(status) {
    return {
      ...form,
      status,
      features: featuresText.split(",").map((s) => s.trim()).filter(Boolean)
    };
  }

  async function save(status) {
    if (imagesUploading) {
      toast.error("Please wait for the image upload to finish before saving.");
      return;
    }
    setErrors({});
    setSaving(true);
    const payload = buildPayload(status);
    try {
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        toast.success("Product updated.");
        setInitial(form);
        navigate("/admin/products");
      } else {
        const { product } = await api.post("/products", payload);
        toast.success(status === "active" ? "Product published." : "Draft saved.");
        setInitial(form);
        // Straight into managing its variants — a new Type has none yet.
        navigate(`/admin/products/${product._id}/variants`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    save(form.status === "active" ? "active" : "draft");
  }

  function handleCancel() {
    if (dirty) setShowLeaveConfirm(true);
    else navigate("/admin/products");
  }

  if (loading) return <div className="ff-admin-loading-state">Loading product…</div>;

  return (
    <form className="ff-admin-form" onSubmit={onSubmit}>
      <div className="ff-admin-form-grid">
        <label className={`ff-field${errors.name ? " has-error" : ""}`}>
          <span className="ff-field-label">Name</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Polyester" />
          <span className="ff-field-error">{errors.name || ""}</span>
        </label>

        <label className={`ff-field${errors.category ? " has-error" : ""}`}>
          <span className="ff-field-label">Category</span>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} required>
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="ff-field-error">{errors.category || ""}</span>
        </label>

        <label className="ff-field">
          <span className="ff-field-label">Tag / positioning</span>
          <input value={form.tag} onChange={(e) => set("tag", e.target.value)} placeholder="e.g. Premium synthetic" />
        </label>

        <label className="ff-field ff-field--checkbox">
          <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
          <span>Featured</span>
        </label>
      </div>

      <label className="ff-field">
        <span className="ff-field-label">Short description</span>
        <input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} maxLength={300} />
      </label>

      <label className="ff-field">
        <span className="ff-field-label">Full description</span>
        <textarea rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </label>

      <label className="ff-field">
        <span className="ff-field-label">Features (comma-separated)</span>
        <input value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
      </label>

      <fieldset className="ff-admin-fieldset">
        <legend>Images</legend>
        <ProductImageUploader images={form.images} onChange={(images) => set("images", images)} onUploadingChange={setImagesUploading} />
        <p className="ff-admin-hint">
          Used as the catalogue preview when a selected Variant has no image of its own. The first image is the primary/featured one.
        </p>
      </fieldset>

      <p className="ff-admin-hint">
        SKU, composition, count range, application and other specifications are set per-variant — save this Type first, then add its Variants.
      </p>

      <div className="ff-admin-form-actions">
        <button type="button" className="ff-btn ff-btn-ghost" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="ff-btn ff-btn-ghost"
          disabled={saving || imagesUploading}
          onClick={() => save("draft")}
        >
          {imagesUploading ? "Uploading image…" : "Save draft"}
        </button>
        <button type="button" className="ff-btn ff-btn-primary" disabled={saving || imagesUploading} onClick={() => save("active")}>
          {saving && <span className="ff-btn-spinner" />}
          <span>{imagesUploading ? "Uploading image…" : "Publish"}</span>
        </button>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved changes to this product."
        confirmLabel="Discard"
        danger
        onConfirm={() => navigate("/admin/products")}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </form>
  );
}
