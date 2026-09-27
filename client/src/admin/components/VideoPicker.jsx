import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { validateVideoFile, uploadVideoToCloudinary, ALLOWED_VIDEO_TYPES } from "../utils/cloudinaryVideoUpload";
import { parseVideoUrl } from "../utils/videoEmbed";
import VideoPlayer from "../../components/VideoPlayer";

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Modal for choosing the video behind a Video Gallery entry — mirrors
// MediaPicker's "choose from library" flow, with a second tab for pasting a
// URL directly (e.g. a Google Drive share link) instead of uploading a file.
export default function VideoPicker({ open, onClose, onConfirm }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [tab, setTab] = useState("library");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlPreview, setUrlPreview] = useState(null);

  useEffect(() => {
    if (!open) return;
    setTab("library");
    setSelectedAsset(null);
    setQ("");
    setPage(1);
    setUrlInput("");
    setUrlError("");
    setUrlPreview(null);
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "library") return undefined;
    let cancelled = false;
    setLoading(true);
    api
      .get("/video-assets", { q, page, limit: 12 })
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
  }, [open, tab, q, page]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleUpload(fileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      const validationError = validateVideoFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }
      setUploading(true);
      setProgress(0);
      try {
        const uploaded = await uploadVideoToCloudinary(file, setProgress);
        const { videoAsset } = await api.post("/video-assets", uploaded);
        setItems((it) => [videoAsset, ...it]);
        setTotal((t) => t + 1);
        setSelectedAsset(videoAsset);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : err.message || "Upload failed. Please try again.";
        toast.error(`"${file.name}" failed to upload: ${message}`);
      } finally {
        setUploading(false);
      }
    }
  }

  function onInputChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length) handleUpload(files);
  }

  function onUrlChange(value) {
    setUrlInput(value);
    setUrlError("");
    setUrlPreview(null);
  }

  function onUrlSubmit(e) {
    e.preventDefault();
    const result = parseVideoUrl(urlInput);
    if (result.error) {
      setUrlError(result.error);
      setUrlPreview(null);
      return;
    }
    setUrlError("");
    setUrlPreview(result);
  }

  function confirm() {
    if (tab === "library") {
      if (!selectedAsset) {
        onClose();
        return;
      }
      onConfirm({
        source: "upload",
        url: selectedAsset.url,
        publicId: selectedAsset.publicId,
        embedType: "native",
        videoAsset: selectedAsset._id,
        duration: selectedAsset.duration,
        thumbnail: selectedAsset.thumbnail
      });
      onClose();
      return;
    }

    if (!urlPreview) {
      setUrlError(urlInput.trim() ? "Press Enter to validate the link first." : "Paste a video URL first.");
      return;
    }
    onConfirm({
      source: "url",
      url: urlPreview.url,
      publicId: "",
      embedType: urlPreview.embedType,
      videoAsset: null,
      duration: null,
      thumbnail: null
    });
    onClose();
  }

  const confirmDisabled = tab === "library" ? !selectedAsset : !urlPreview;

  return (
    <div className="ff-admin-dialog-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="ff-media-picker ff-video-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a video"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ff-media-picker-head">
          <h3>Choose a video</h3>
          <button type="button" className="ff-admin-drawer-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ff-picker-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "library"}
            className={`ff-picker-tab${tab === "library" ? " is-active" : ""}`}
            onClick={() => setTab("library")}
          >
            Video library
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "url"}
            className={`ff-picker-tab${tab === "url" ? " is-active" : ""}`}
            onClick={() => setTab("url")}
          >
            Paste URL
          </button>
        </div>

        {tab === "library" ? (
          <>
            <div className="ff-admin-toolbar">
              <input
                type="search"
                placeholder="Search by filename…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="ff-admin-search"
              />
              <button type="button" className="ff-btn ff-btn-ghost" onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading && <span className="ff-btn-spinner" />}
                <span>{uploading ? `Uploading… ${progress}%` : "+ Upload new video"}</span>
              </button>
              <input ref={inputRef} type="file" accept={ALLOWED_VIDEO_TYPES.join(",")} onChange={onInputChange} hidden />
            </div>

            {uploading && (
              <div className="ff-admin-progress-track" style={{ width: "100%" }}>
                <div className="ff-admin-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="ff-media-picker-body">
              {loading ? (
                <div className="ff-admin-loading-state">Loading videos…</div>
              ) : items.length === 0 ? (
                <div className="ff-admin-empty-state">{q ? "No videos match your search." : "No videos in the library yet — upload one above."}</div>
              ) : (
                <ul className="ff-media-grid ff-video-picker-grid">
                  {items.map((asset) => {
                    const isSelected = selectedAsset?._id === asset._id;
                    return (
                      <li key={asset._id}>
                        <button
                          type="button"
                          className={`ff-media-tile ff-video-tile${isSelected ? " is-selected" : ""}`}
                          onClick={() => setSelectedAsset(asset)}
                          aria-pressed={isSelected}
                        >
                          {asset.thumbnail?.url ? (
                            <img src={asset.thumbnail.url} alt="" loading="lazy" />
                          ) : (
                            <span className="ff-video-tile-fallback" aria-hidden="true">
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <rect x="3" y="6" width="13" height="12" rx="1.2" />
                                <path d="m16 10 5-3v10l-5-3" />
                              </svg>
                            </span>
                          )}
                          {asset.duration != null && <span className="ff-video-tile-duration">{formatDuration(asset.duration)}</span>}
                          {isSelected && <span className="ff-media-tile-badge">✓</span>}
                        </button>
                        <span className="ff-media-tile-name" title={asset.originalName || asset.publicId}>
                          {asset.originalName || asset.publicId}
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
          </>
        ) : (
          <div className="ff-video-url-tab">
            <form onSubmit={onUrlSubmit} className="ff-video-url-form">
              <label className={`ff-field${urlError ? " has-error" : ""}`}>
                <span className="ff-field-label">Video URL</span>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/…/view or a direct .mp4 link"
                  value={urlInput}
                  onChange={(e) => onUrlChange(e.target.value)}
                  autoFocus
                />
                <span className="ff-field-error">{urlError || ""}</span>
              </label>
              <button type="submit" className="ff-btn ff-btn-ghost">
                Validate
              </button>
            </form>
            <p className="ff-admin-hint">
              Google Drive share links are automatically converted to an embeddable format. Any other direct video link (e.g. ending in
              .mp4 or .webm) plays natively.
            </p>
            {urlPreview && (
              <div className="ff-video-url-preview">
                <VideoPlayer url={urlPreview.url} embedType={urlPreview.embedType} title="Preview" />
              </div>
            )}
          </div>
        )}

        <div className="ff-admin-dialog-actions">
          <span className="ff-admin-hint" style={{ marginRight: "auto" }}>
            {tab === "library" ? (selectedAsset ? "1 video selected" : "Select a video") : urlPreview ? "Ready to use" : "Paste and validate a URL"}
          </span>
          <button type="button" className="ff-btn ff-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ff-btn ff-btn-primary" onClick={confirm} disabled={confirmDisabled}>
            Use this video
          </button>
        </div>
      </div>
    </div>
  );
}
