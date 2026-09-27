import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import VideoPicker from "../components/VideoPicker";
import { normalizeVideoUrl } from "../../utils/videoSource";
import ImageUploader from "../components/ImageUploader";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY = { videoMedia: null, sourceType: "direct", title: "", description: "", url: "", publicId: "", duration: null, thumbnail: null, status: "draft" };

export default function VideoForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [initial, setInitial] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const uploading = videoUploading || thumbnailUploading;

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api
      .get(`/videos/${id}`)
      .then((d) => {
        if (cancelled) return;
        const v = d.video;
        const loaded = {
          videoMedia: v.videoMedia || null,
          sourceType: v.sourceType || "direct",
          title: v.title,
          description: v.description || "",
          url: v.url,
          publicId: v.publicId,
          duration: v.duration,
          thumbnail: v.thumbnail || null,
          status: v.status
        };
        setForm(loaded);
        setInitial(loaded);
      })
      .catch((err) => { if (!cancelled) { setLoadError(err.message); toast.error(err.message); } })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  useEffect(() => {
    function onBeforeUnload(e) {
      if (!dirty && !uploading) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, uploading]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save(status) {
    setErrors({});
    if (uploading) {
      toast.error("Please wait for the upload to finish before saving.");
      return;
    }
    if (saving) return;
    if (!form.title.trim()) { setErrors({ title: "Enter a title." }); return; }
    let source;
    try { source = form.videoMedia ? {} : normalizeVideoUrl(form.url); }
    catch (e) { setErrors({ url: e.message }); toast.error(e.message); return; }
    setSaving(true);
    try {
      const payload = { ...form, ...source, status };
      if (isEdit) {
        await api.put(`/videos/${id}`, payload);
        toast.success("Video updated.");
      } else {
        await api.post("/videos", payload);
        toast.success(status === "published" ? "Video published." : "Draft saved.");
      }
      setInitial(form);
      navigate("/admin/videos");
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    save(form.status === "published" ? "published" : "draft");
  }

  function handleCancel() {
    if (dirty) setShowLeaveConfirm(true);
    else navigate("/admin/videos");
  }

  if (loadError) return <div className="ff-admin-error-state" role="alert">{loadError} <button type="button" onClick={() => navigate("/admin/videos")}>Back to videos</button></div>;
  if (loading) return <div className="ff-admin-loading-state">Loading video…</div>;

  return (
    <form className="ff-admin-form" onSubmit={onSubmit}>
      <fieldset className="ff-admin-fieldset">
        <legend>Video source</legend>
        <VideoPicker video={form} onChange={(source) => setForm((f) => ({ ...f, ...source }))} onUploadingChange={setVideoUploading} disabled={saving} />
        {errors.url && <p className="ff-field-error" role="alert">{errors.url}</p>}
      </fieldset>

      <div className="ff-admin-form-grid">
        <label className={`ff-field${errors.title ? " has-error" : ""}`}>
          <span className="ff-field-label">Title</span>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={160} />
          <span className="ff-field-error">{errors.title || ""}</span>
        </label>
      </div>

      <label className="ff-field">
        <span className="ff-field-label">Description</span>
        <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
      </label>

      <fieldset className="ff-admin-fieldset">
        <legend>Thumbnail override (optional — defaults to a Cloudinary auto-thumbnail)</legend>
        <ImageUploader image={form.thumbnail} onChange={(thumbnail) => set("thumbnail", thumbnail)} label="thumbnail" onUploadingChange={setThumbnailUploading} />
      </fieldset>

      <div className="ff-admin-form-actions">
        <button type="button" className="ff-btn ff-btn-ghost" onClick={handleCancel} disabled={saving || uploading}>
          Cancel
        </button>
        <button type="button" className="ff-btn ff-btn-ghost" disabled={saving || uploading} onClick={() => save("draft")}>
          {uploading ? "Uploading…" : "Save draft"}
        </button>
        <button type="button" className="ff-btn ff-btn-primary" disabled={saving || uploading} onClick={() => save("published")}>
          {saving && <span className="ff-btn-spinner" />}
          <span>{uploading ? "Uploading…" : "Publish"}</span>
        </button>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved changes to this video."
        confirmLabel="Discard"
        danger
        onConfirm={() => navigate("/admin/videos")}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </form>
  );
}
