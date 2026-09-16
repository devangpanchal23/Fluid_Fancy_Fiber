import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { resolveUploadUrl } from "../../apiBase";
import ConfirmDialog from "../components/ConfirmDialog";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported image type (use JPEG, PNG, WEBP or GIF).`;
  }
  if (file.size > MAX_SIZE) {
    return `"${file.name}" is too large. Maximum size is 5MB.`;
  }
  return null;
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// The central admin gallery — browse/search/upload/delete every image ever
// uploaded. The MediaPicker component (opened from Product/Variant forms)
// reuses this same /api/media backend, but this page is where an admin
// manages the library directly: renaming alt text, cleaning up unused
// files, or bulk-uploading ahead of time before building out a catalogue.
export default function MediaLibrary() {
  const toast = useToast();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { done, total }
  const [editingAlt, setEditingAlt] = useState(null); // media _id
  const [altDraft, setAltDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null); // media
  const [forceDeleteInfo, setForceDeleteInfo] = useState(null); // { media, message }

  function load() {
    setLoading(true);
    setError("");
    api
      .get("/media", { q, page, limit: 24 })
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
        setPages(d.pages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [q, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetPage(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    let uploadedCount = 0;
    let sawError = false;
    try {
      for (const file of files) {
        const validationError = validateFile(file);
        if (validationError) {
          toast.error(validationError);
          sawError = true;
          setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
          continue;
        }
        try {
          const formData = new FormData();
          formData.append("image", file);
          await api.upload("/media", formData);
          uploadedCount += 1;
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Upload failed. Please try again.";
          toast.error(`"${file.name}" failed to upload: ${message}`);
          sawError = true;
        }
        setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
    if (uploadedCount) {
      toast.success(`${uploadedCount} image${uploadedCount === 1 ? "" : "s"} uploaded.`);
      setQ("");
      setPage(1);
      load();
    } else if (!sawError) {
      toast.error("No images were uploaded.");
    }
  }

  function onInputChange(e) {
    // See ProductImageUploader's onInputChange for why this must be a
    // snapshot, not the live FileList: clearing `.value` empties it in place.
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length) handleFiles(files);
  }

  function startEditAlt(media) {
    setEditingAlt(media._id);
    setAltDraft(media.alt || "");
  }

  async function saveAlt(media) {
    try {
      const { media: updated } = await api.put(`/media/${media._id}`, { alt: altDraft });
      setItems((it) => it.map((m) => (m._id === media._id ? updated : m)));
      setEditingAlt(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete(force) {
    const media = pendingDelete || forceDeleteInfo?.media;
    setPendingDelete(null);
    setForceDeleteInfo(null);
    try {
      await api.delete(`/media/${media._id}`, force ? { force: "true" } : undefined);
      toast.success("Image deleted.");
      setItems((it) => it.filter((m) => m._id !== media._id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setForceDeleteInfo({ media, message: err.message });
      } else {
        toast.error(err.message);
      }
    }
  }

  return (
    <div>
      <div className="ff-admin-toolbar">
        <input
          type="search"
          placeholder="Search by filename or alt text…"
          value={q}
          onChange={(e) => resetPage(setQ)(e.target.value)}
          className="ff-admin-search"
        />
        <button type="button" className="ff-btn ff-btn-primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading && <span className="ff-btn-spinner" />}
          <span>{uploading ? "Uploading…" : "+ Upload images"}</span>
        </button>
        <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(",")} multiple onChange={onInputChange} hidden />
      </div>

      {uploadProgress && (
        <div className="ff-admin-progress-track" style={{ width: "100%", marginBottom: 14 }}>
          <div
            className="ff-admin-progress-bar"
            style={{ width: `${((uploadProgress.done + (uploading ? 0 : 1)) / Math.max(1, uploadProgress.total)) * 100}%` }}
          />
        </div>
      )}

      {error && <div className="ff-admin-error-state">{error}</div>}
      {loading ? (
        <div className="ff-admin-loading-state">Loading images…</div>
      ) : items.length === 0 ? (
        <div className="ff-admin-empty-state">{q ? "No images match your search." : "No images uploaded yet. Upload your first one above."}</div>
      ) : (
        <ul className="ff-media-grid ff-media-grid--library">
          {items.map((media) => (
            <li key={media._id} className="ff-media-card">
              <div className="ff-media-card-thumb">
                <img src={resolveUploadUrl(media.url)} alt={media.alt || media.originalName || ""} loading="lazy" />
              </div>
              <div className="ff-media-card-body">
                <p className="ff-media-card-filename" title={media.originalName || media.filename}>
                  {media.originalName || media.filename}
                </p>
                <p className="ff-media-card-meta">
                  {formatDate(media.createdAt)} · {formatSize(media.size)}
                </p>
                {editingAlt === media._id ? (
                  <div className="ff-media-card-alt-edit">
                    <input
                      value={altDraft}
                      onChange={(e) => setAltDraft(e.target.value)}
                      placeholder="Alt text"
                      maxLength={200}
                      autoFocus
                    />
                    <button type="button" className="ff-admin-link-btn" onClick={() => saveAlt(media)}>
                      Save
                    </button>
                    <button type="button" className="ff-admin-link-btn" onClick={() => setEditingAlt(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" className="ff-admin-link-btn ff-media-card-alt" onClick={() => startEditAlt(media)}>
                    {media.alt ? `Alt: ${media.alt}` : "+ Add alt text"}
                  </button>
                )}
              </div>
              <button type="button" className="ff-admin-image-remove ff-media-card-delete" onClick={() => setPendingDelete(media)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="ff-admin-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages} · {total} total
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this image?"
        message={pendingDelete ? `"${pendingDelete.originalName || pendingDelete.filename}" will be permanently removed if it isn't in use anywhere.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDelete(false)}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(forceDeleteInfo)}
        title="This image is still in use"
        message={forceDeleteInfo ? `${forceDeleteInfo.message} Deleting anyway will remove it from all of them.` : ""}
        confirmLabel="Delete anyway"
        cancelLabel="Keep it"
        danger
        onConfirm={() => confirmDelete(true)}
        onCancel={() => setForceDeleteInfo(null)}
      />
    </div>
  );
}
