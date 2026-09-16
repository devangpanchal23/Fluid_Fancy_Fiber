import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import ImageUploader from "../components/ImageUploader";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY = {
  name: "",
  designation: "",
  email: "",
  phone: "",
  bio: "",
  image: null,
  links: [],
  isActive: true
};

export default function PersonForm() {
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
    if (!isEdit) return;
    let cancelled = false;
    api
      .get(`/people/${id}`)
      .then((d) => {
        if (cancelled) return;
        const p = d.person;
        const loaded = {
          name: p.name,
          designation: p.designation,
          email: p.email || "",
          phone: p.phone || "",
          bio: p.bio || "",
          image: p.image || null,
          links: p.links || [],
          isActive: p.isActive
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

  function updateLink(i, key, value) {
    setForm((f) => {
      const links = [...f.links];
      links[i] = { ...links[i], [key]: value };
      return { ...f, links };
    });
  }
  function addLink() {
    setForm((f) => ({ ...f, links: [...f.links, { label: "", href: "" }] }));
  }
  function removeLink(i) {
    setForm((f) => ({ ...f, links: f.links.filter((_, idx) => idx !== i) }));
  }

  function buildPayload() {
    return {
      ...form,
      links: form.links.filter((l) => l.label.trim() && l.href.trim())
    };
  }

  async function save() {
    if (imageUploading) {
      toast.error("Please wait for the photo upload to finish before saving.");
      return;
    }
    setErrors({});
    setSaving(true);
    const payload = buildPayload();
    try {
      if (isEdit) {
        await api.put(`/people/${id}`, payload);
        toast.success("Person updated.");
      } else {
        await api.post("/people", payload);
        toast.success("Person added.");
      }
      setInitial(form);
      navigate("/admin/people");
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
    else navigate("/admin/people");
  }

  if (loading) return <div className="ff-admin-loading-state">Loading person…</div>;

  return (
    <form className="ff-admin-form" onSubmit={onSubmit}>
      <div className="ff-admin-form-grid">
        <label className={`ff-field${errors.name ? " has-error" : ""}`}>
          <span className="ff-field-label">Name</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          <span className="ff-field-error">{errors.name || ""}</span>
        </label>

        <label className={`ff-field${errors.designation ? " has-error" : ""}`}>
          <span className="ff-field-label">Designation / role</span>
          <input value={form.designation} onChange={(e) => set("designation", e.target.value)} required />
          <span className="ff-field-error">{errors.designation || ""}</span>
        </label>

        <label className="ff-field">
          <span className="ff-field-label">Email</span>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </label>

        <label className="ff-field">
          <span className="ff-field-label">Phone</span>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>

        <label className="ff-field ff-field--checkbox">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          <span>Active</span>
        </label>
      </div>

      <label className="ff-field">
        <span className="ff-field-label">Bio</span>
        <textarea rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={1000} />
      </label>

      <fieldset className="ff-admin-fieldset">
        <legend>Photo</legend>
        <ImageUploader image={form.image} onChange={(image) => set("image", image)} label="photo" onUploadingChange={setImageUploading} />
      </fieldset>

      <fieldset className="ff-admin-fieldset">
        <legend>Links</legend>
        {form.links.map((l, i) => (
          <div className="ff-admin-spec-row" key={i}>
            <input placeholder="Label (e.g. LinkedIn)" value={l.label} onChange={(e) => updateLink(i, "label", e.target.value)} />
            <input placeholder="URL or #contact" value={l.href} onChange={(e) => updateLink(i, "href", e.target.value)} />
            <button type="button" onClick={() => removeLink(i)} aria-label="Remove link">
              ×
            </button>
          </div>
        ))}
        <button type="button" className="ff-btn ff-btn-ghost" onClick={addLink}>
          + Add link
        </button>
      </fieldset>

      <div className="ff-admin-form-actions">
        <button type="button" className="ff-btn ff-btn-ghost" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="ff-btn ff-btn-primary" disabled={saving || imageUploading}>
          {saving && <span className="ff-btn-spinner" />}
          <span>{imageUploading ? "Uploading photo…" : isEdit ? "Save changes" : "Add person"}</span>
        </button>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved changes to this person."
        confirmLabel="Discard"
        danger
        onConfirm={() => navigate("/admin/people")}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </form>
  );
}
