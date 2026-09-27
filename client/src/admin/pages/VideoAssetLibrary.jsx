import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import {
  validateVideoFile,
  uploadVideoToCloudinary,
  isCloudinaryVideoConfigured,
  VIDEO_UPLOAD_NOT_CONFIGURED_MESSAGE,
  ALLOWED_VIDEO_TYPES
} from "../utils/cloudinaryVideoUpload";
import ConfirmDialog from "../components/ConfirmDialog";

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// The central admin gallery for video files — browse/search/upload/delete
// every video ever uploaded to Cloudinary through this admin. VideoPicker
// (opened from the Video Gallery form) reuses this same /api/video-assets
// backend to let an admin reuse an already-uploaded file instead of
// re-uploading it; this page is where they manage the library directly.
// Structurally parallel to MediaLibrary.jsx (the Image Library page).
export default function VideoAssetLibrary() {
  const toast = useToast();
  const configured = isCloudinaryVideoConfigured();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [forceDeleteInfo, setForceDeleteInfo] = useState(null); // { asset, message }

  function load() {
    setLoading(true);
    setError("");
    api
      .get("/video-assets", { q, page, limit: 24 })
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
    if (!configured) {
      toast.error(VIDEO_UPLOAD_NOT_CONFIGURED_MESSAGE);
      return;
    }
    const files = Array.from(fileList);
    let uploadedCount = 0;
    let sawError = false;
    for (const file of files) {
      const validationError = validateVideoFile(file);
      if (validationError) {
        toast.error(validationError);
        sawError = true;
        continue;
      }
      setUploading(true);
      setProgress(0);
      try {
        const uploaded = await uploadVideoToCloudinary(file, setProgress);
        await api.post("/video-assets", uploaded);
        uploadedCount += 1;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : err.message || "Upload failed. Please try again.";
        toast.error(`"${file.name}" failed to upload: ${message}`);
        sawError = true;
      } finally {
        setUploading(false);
      }
    }
    if (uploadedCount) {
      toast.success(`${uploadedCount} video${uploadedCount === 1 ? "" : "s"} uploaded.`);
      setQ("");
      setPage(1);
      load();
    } else if (!sawError) {
      toast.error("No videos were uploaded.");
    }
  }

  function onInputChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length) handleFiles(files);
  }

  async function confirmDelete(force) {
    const asset = pendingDelete || forceDeleteInfo?.asset;
    setPendingDelete(null);
    setForceDeleteInfo(null);
    try {
      await api.delete(`/video-assets/${asset._id}`, force ? { force: "true" } : undefined);
      toast.success("Video deleted.");
      setItems((it) => it.filter((v) => v._id !== asset._id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setForceDeleteInfo({ asset, message: err.message });
      } else {
        toast.error(err.message);
      }
    }
  }

  return (
    <div>
      {!configured && (
        <div className="ff-admin-config-banner" role="alert">
          <span>
            <strong>Video uploads aren't configured yet.</strong>
            Set <code>VITE_CLOUDINARY_CLOUD_NAME</code> and <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> in <code>client/.env</code> (see{" "}
            <code>client/.env.example</code> for the one-time Cloudinary dashboard steps), then restart the dev server. Video Gallery entries can
            still be added via "Paste URL" in the meantime.
          </span>
        </div>
      )}
      <div className="ff-admin-toolbar">
        <input
          type="search"
          placeholder="Search by filename…"
          value={q}
          onChange={(e) => resetPage(setQ)(e.target.value)}
          className="ff-admin-search"
        />
        <button
          type="button"
          className="ff-btn ff-btn-primary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !configured}
          title={configured ? undefined : VIDEO_UPLOAD_NOT_CONFIGURED_MESSAGE}
        >
          {uploading && <span className="ff-btn-spinner" />}
          <span>{uploading ? `Uploading… ${progress}%` : "+ Upload videos"}</span>
        </button>
        <input ref={inputRef} type="file" accept={ALLOWED_VIDEO_TYPES.join(",")} multiple onChange={onInputChange} hidden disabled={!configured} />
      </div>

      {uploading && (
        <div className="ff-admin-progress-track" style={{ width: "100%", marginBottom: 14 }}>
          <div className="ff-admin-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <div className="ff-admin-error-state">{error}</div>}
      {loading ? (
        <div className="ff-admin-loading-state">Loading videos…</div>
      ) : items.length === 0 ? (
        <div className="ff-admin-empty-state">{q ? "No videos match your search." : "No videos uploaded yet. Upload your first one above."}</div>
      ) : (
        <ul className="ff-media-grid ff-media-grid--library">
          {items.map((asset) => (
            <li key={asset._id} className="ff-media-card ff-video-card">
              <div className="ff-media-card-thumb">
                {asset.thumbnail?.url ? (
                  <img src={asset.thumbnail.url} alt="" loading="lazy" />
                ) : (
                  <video src={asset.url} muted preload="metadata" />
                )}
              </div>
              <div className="ff-media-card-body">
                <p className="ff-media-card-filename" title={asset.originalName || asset.publicId}>
                  {asset.originalName || asset.publicId}
                </p>
                <p className="ff-media-card-meta">
                  {formatDate(asset.createdAt)} · {formatSize(asset.size)} · {formatDuration(asset.duration)}
                </p>
              </div>
              <button type="button" className="ff-admin-image-remove ff-media-card-delete" onClick={() => setPendingDelete(asset)}>
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
        title="Delete this video?"
        message={
          pendingDelete
            ? `"${pendingDelete.originalName || pendingDelete.publicId}" will be permanently removed from Cloudinary if it isn't in use anywhere.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDelete(false)}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(forceDeleteInfo)}
        title="This video is still in use"
        message={forceDeleteInfo ? `${forceDeleteInfo.message} Deleting anyway will unassign it (and unpublish) from all of them.` : ""}
        confirmLabel="Delete anyway"
        cancelLabel="Keep it"
        danger
        onConfirm={() => confirmDelete(true)}
        onCancel={() => setForceDeleteInfo(null)}
      />
    </div>
  );
}
