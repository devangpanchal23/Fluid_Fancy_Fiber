import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import ImageUploader from "../components/ImageUploader";
import ConfirmDialog from "../components/ConfirmDialog";

const LIST_PATH = "/admin/cone-library";
const EMPTY = { productName: "", productDetails: "", image: null };

export default function ConeLibraryForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [initial, setInitial] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    api
      .get(`/cone-library/${id}`)
      .then((d) => {
        if (cancelled) return;
        const p = d.product;
        const loaded = { productName: p.productName, productDetails: p.productDetails, image: p.image || null };
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
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  // Mirrors the server rules — all three fields are mandatory; the server
  // re-validates regardless.
  function validate() {
    const found = {};
    if (!form.productName.trim()) found.productName = "Product name is required.";
    if (!form.productDetails.trim()) found.productDetails = "Product details are required.";
    if (!form.image?.url) found.image = "Product image is required.";
    return found;
  }

  async function save() {
    if (imageUploading) {
      toast.error("Please wait for the image upload to finish before saving.");
      return;
    }
    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      toast.error("Please fill in the product image, name and details.");
      return;
    }
    setErrors({});
    setSaving(true);
    const payload = { productName: form.productName.trim(), productDetails: form.productDetails.trim(), image: form.image };
    try {
      if (isEdit) {
        await api.put(`/cone-library/${id}`, payload);
        toast.success("Product updated.");
      } else {
        await api.post("/cone-library", payload);
        toast.success("Product added.");
      }
      setInitial(form);
      navigate(LIST_PATH);
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
    if (dirty) setShowLeaveConfirm(true);
    else navigate(LIST_PATH);
  }

  if (loading) return <div className="ff-admin-loading-state">Loading product…</div>;

  return (
    <form className="ff-admin-form" onSubmit={onSubmit} noValidate>
      <fieldset className="ff-admin-fieldset">
        <legend>Product image (required)</legend>
        <ImageUploader image={form.image} onChange={(image) => set("image", image)} label="image" onUploadingChange={setImageUploading} />
        {errors.image && <p className="ff-field-error">{errors.image}</p>}
      </fieldset>

      <div className="ff-admin-form-grid">
        <label className={`ff-field${errors.productName ? " has-error" : ""}`}>
          <span className="ff-field-label">Product name</span>
          <input value={form.productName} onChange={(e) => set("productName", e.target.value)} maxLength={120} placeholder="e.g. MONO 40S" />
          <span className="ff-field-error">{errors.productName || ""}</span>
        </label>

        <label className={`ff-field${errors.productDetails ? " has-error" : ""}`}>
          <span className="ff-field-label">Product details</span>
          <input value={form.productDetails} onChange={(e) => set("productDetails", e.target.value)} maxLength={120} placeholder="e.g. P/40" />
          <span className="ff-field-error">{errors.productDetails || ""}</span>
        </label>
      </div>

      <div className="ff-admin-form-actions">
        <button type="button" className="ff-btn ff-btn-ghost" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="ff-btn ff-btn-primary" disabled={saving || imageUploading}>
          {saving && <span className="ff-btn-spinner" />}
          <span>{imageUploading ? "Uploading image…" : isEdit ? "Save changes" : "Add product"}</span>
        </button>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved changes to this product."
        confirmLabel="Discard"
        danger
        onConfirm={() => navigate(LIST_PATH)}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </form>
  );
}
