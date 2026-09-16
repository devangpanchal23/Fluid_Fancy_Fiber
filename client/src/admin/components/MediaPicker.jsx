import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { resolveUploadUrl } from "../../apiBase";

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
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Reusable "choose from library" modal. Admin can search/browse, select one
// or several images (selection order becomes gallery order — see
// mediaSelection.js), upload new files without leaving the flow, and
// confirm. Selection state lives here as an ordered array (not a Set) so
// the picker itself is the single source of truth for pick-order, which
// mergeSelectedMedia then relies on to decide the new primary image.
export default function MediaPicker({ open, multiple = true, onClose, onConfirm }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState([]); // ordered Media objects

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQ("");
    setPage(1);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    api
      .get("/media", { q, page, limit: 24 })
      .then((d) => {
        if (cancelled) return;
        setItems(d.items);
        setTotal(d.total);
        setPages(d.pages);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q, page]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function toggle(media) {
    setSelected((sel) => {
      const already = sel.some((m) => m._id === media._id);
      if (already) return sel.filter((m) => m._id !== media._id);
      if (!multiple) return [media];
      return [...sel, media];
    });
  }

  async function handleUpload(fileList) {
    const files = Array.from(fileList);
    setUploading(true);
    try {
      for (const file of files) {
        const validationError = validateFile(file);
        if (validationError) {
          toast.error(validationError);
          continue;
        }
        try {
          const formData = new FormData();
          formData.append("image", file);
          const { media } = await api.upload("/media", formData);
          setItems((it) => [media, ...it]);
          setTotal((t) => t + 1);
          setSelected((sel) => (multiple ? [...sel, media] : [media]));
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Upload failed. Please try again.";
          toast.error(`"${file.name}" failed to upload: ${message}`);
        }
      }
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e) {
    // See ProductImageUploader's onInputChange for why this must be a
    // snapshot, not the live FileList: clearing `.value` empties it in place.
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length) handleUpload(files);
  }

  function confirm() {
    if (!selected.length) {
      onClose();
      return;
    }
    onConfirm(selected);
    onClose();
  }

  return (
    <div className="ff-admin-dialog-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="ff-media-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Choose from media library"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ff-media-picker-head">
          <h3>Media library</h3>
          <button type="button" className="ff-admin-drawer-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ff-admin-toolbar">
          <input
            type="search"
            placeholder="Search by filename or alt text…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="ff-admin-search"
          />
          <button type="button" className="ff-btn ff-btn-ghost" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading && <span className="ff-btn-spinner" />}
            <span>{uploading ? "Uploading…" : "+ Upload new image"}</span>
          </button>
          <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(",")} multiple onChange={onInputChange} hidden />
        </div>

        <div className="ff-media-picker-body">
          {loading ? (
            <div className="ff-admin-loading-state">Loading images…</div>
          ) : items.length === 0 ? (
            <div className="ff-admin-empty-state">{q ? "No images match your search." : "No images uploaded yet."}</div>
          ) : (
            <ul className="ff-media-grid">
              {items.map((media) => {
                const index = selected.findIndex((m) => m._id === media._id);
                const isSelected = index !== -1;
                return (
                  <li key={media._id}>
                    <button
                      type="button"
                      className={`ff-media-tile${isSelected ? " is-selected" : ""}`}
                      onClick={() => toggle(media)}
                      aria-pressed={isSelected}
                    >
                      <img src={resolveUploadUrl(media.url)} alt={media.alt || media.originalName || ""} loading="lazy" />
                      {isSelected && <span className="ff-media-tile-badge">{multiple ? index + 1 : "✓"}</span>}
                    </button>
                    <span className="ff-media-tile-name" title={media.originalName || media.filename}>
                      {media.originalName || media.filename}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

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

        <div className="ff-admin-dialog-actions">
          <span className="ff-admin-hint" style={{ marginRight: "auto" }}>
            {selected.length > 0 ? `${selected.length} selected` : "Select one or more images"}
          </span>
          <button type="button" className="ff-btn ff-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ff-btn ff-btn-primary" onClick={confirm} disabled={!selected.length}>
            Use {selected.length || ""} image{selected.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
