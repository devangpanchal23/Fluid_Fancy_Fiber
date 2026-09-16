import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import ProductImageUploader from "../components/ProductImageUploader";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY = { name: "", sku: "", specs: [], images: [], isActive: true };

export default function VariantForm() {
  const { productId, id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [initial, setInitial] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  useEffect(() => {
    api.get(`/products/${productId}`).then((d) => setProduct(d.product)).catch(() => {});
  }, [productId]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api
      .get(`/variants/${id}`)
      .then((d) => {
        if (cancelled) return;
        const v = d.variant;
        const loaded = {
          name: v.name,
          sku: v.sku,
          specs: v.specs || [],
          images: v.images || [],
          isActive: v.isActive
        };
        setForm(loaded);
        setInitial(loaded);
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

  function updateSpec(i, key, value) {
    setForm((f) => {
      const specs = [...f.specs];
      specs[i] = { ...specs[i], [key]: value };
      return { ...f, specs };
    });
  }
  function addSpec() {
    setForm((f) => ({ ...f, specs: [...f.specs, { key: "", value: "" }] }));
  }
  function removeSpec(i) {
    setForm((f) => ({ ...f, specs: f.specs.filter((_, idx) => idx !== i) }));
  }

  function buildPayload() {
    return {
      ...form,
      product: productId,
      specs: form.specs.filter((s) => s.key.trim() && s.value.trim())
    };
  }

  async function save() {
    if (imagesUploading) {
      toast.error("Please wait for the image upload to finish before saving.");
      return;
    }
    setErrors({});
    setSaving(true);
    const payload = buildPayload();
    try {
      if (isEdit) {
        await api.put(`/variants/${id}`, payload);
        toast.success("Variant updated.");
      } else {
        await api.post("/variants", payload);
        toast.success("Variant added.");
      }
      setInitial(form);
      navigate(`/admin/products/${productId}/variants`);
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    save();
  }

  function handleCancel() {
    const back = `/admin/products/${productId}/variants`;
    if (dirty) setShowLeaveConfirm(true);
    else navigate(back);
  }

  if (loading) return <div className="ff-admin-loading-state">Loading variant…</div>;

  return (
    <form className="ff-admin-form" onSubmit={onSubmit}>
      {product && <p className="ff-admin-hint">Under: {product.name}</p>}

      <div className="ff-admin-form-grid">
        <label className={`ff-field${errors.name ? " has-error" : ""}`}>
          <span className="ff-field-label">Name</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Cascatian" />
          <span className="ff-field-error">{errors.name || ""}</span>
        </label>

        <label className={`ff-field${errors.sku ? " has-error" : ""}`}>
          <span className="ff-field-label">SKU</span>
          <input value={form.sku} onChange={(e) => set("sku", e.target.value)} required />
          <span className="ff-field-error">{errors.sku || ""}</span>
        </label>

        <label className="ff-field ff-field--checkbox">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          <span>Active</span>
        </label>
      </div>

      <fieldset className="ff-admin-fieldset">
        <legend>Specifications</legend>
        {form.specs.map((s, i) => (
          <div className="ff-admin-spec-row" key={i}>
            <input placeholder="Label (e.g. Composition, Count Range, Twist)" value={s.key} onChange={(e) => updateSpec(i, "key", e.target.value)} />
            <input placeholder="Value" value={s.value} onChange={(e) => updateSpec(i, "value", e.target.value)} />
            <button type="button" onClick={() => removeSpec(i)} aria-label="Remove spec">
              ×
            </button>
          </div>
        ))}
        <button type="button" className="ff-btn ff-btn-ghost" onClick={addSpec}>
          + Add spec
        </button>
        <p className="ff-admin-hint">Add any field you need — Composition, Count Range, Application, Twist, Finish — no code changes required.</p>
      </fieldset>

      <fieldset className="ff-admin-fieldset">
        <legend>Images</legend>
        <ProductImageUploader
          images={form.images}
          onChange={(images) => set("images", images)}
          onUploadingChange={setImagesUploading}
          uploadPath={isEdit ? `/variants/${id}/images` : undefined}
        />
      </fieldset>

      <div className="ff-admin-form-actions">
        <button type="button" className="ff-btn ff-btn-ghost" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="ff-btn ff-btn-primary" disabled={saving || imagesUploading}>
          {saving && <span className="ff-btn-spinner" />}
          <span>{imagesUploading ? "Uploading image…" : isEdit ? "Save changes" : "Add variant"}</span>
        </button>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved changes to this variant."
        confirmLabel="Discard"
        danger
        onConfirm={() => navigate(`/admin/products/${productId}/variants`)}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </form>
  );
}
