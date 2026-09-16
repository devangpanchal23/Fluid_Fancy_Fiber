import { useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { images as bundledImages } from "../../assets/images";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function resolveSrc(url) {
  return bundledImages[url] || url;
}

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported image type (use JPEG, PNG, WEBP or GIF).`;
  }
  if (file.size > MAX_SIZE) {
    return `"${file.name}" is too large. Maximum size is 5MB.`;
  }
  return null;
}

// `onUploadingChange` lets the parent form disable its Save button while a
// file is still uploading — without it, an admin who selects a file and
// clicks Save immediately (before the async upload finishes and calls
// onChange) submits the form without the image, since the upload happens
// independently of form submission.
export default function ProductImageUploader({ images, onChange, onUploadingChange }) {
  const inputRef = useRef(null);
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function setUploadingState(value) {
    setUploading(value);
    onUploadingChange?.(value);
  }

  async function handleFiles(fileList) {
    setError("");
    const files = Array.from(fileList);
    const uploaded = [];
    let sawError = false;
    setUploadingState(true);
    try {
      for (const file of files) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          toast.error(validationError);
          sawError = true;
          continue;
        }
        try {
          const formData = new FormData();
          formData.append("image", file);
          const { url, filename } = await api.upload("/uploads", formData);
          uploaded.push({ url, filename, alt: "" });
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Upload failed. Please try again.";
          setError(message);
          toast.error(`"${file.name}" failed to upload: ${message}`);
          sawError = true;
        }
      }
    } finally {
      setUploadingState(false);
    }
    // Only append the images that actually finished uploading — never silently
    // drop a failed file without telling the admin (this is what previously
    // let a form get saved with specs/name but no image: the upload failed,
    // the admin didn't notice the small inline error, and clicked Save anyway).
    if (uploaded.length) {
      onChange([...images, ...uploaded]);
      if (sawError) toast.info(`${uploaded.length} of ${files.length} image(s) uploaded — remember to Save to keep them.`);
    }
  }

  function onInputChange(e) {
    const files = e.target.files;
    e.target.value = "";
    if (files && files.length) handleFiles(files);
  }

  function removeAt(i) {
    const img = images[i];
    if (img?.filename) api.delete(`/uploads/${img.filename}`).catch(() => {});
    onChange(images.filter((_, idx) => idx !== i));
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function makePrimary(i) {
    if (i === 0) return;
    const next = [...images];
    const [item] = next.splice(i, 1);
    next.unshift(item);
    onChange(next);
  }

  return (
    <div className="ff-admin-image-uploader">
      {images.length > 0 && (
        <ul className="ff-admin-image-list">
          {images.map((img, i) => (
            <li key={`${img.url}-${i}`}>
              <img src={resolveSrc(img.url)} alt={img.alt || ""} />
              <div className="ff-admin-image-meta">
                <span>{i === 0 ? "Primary photo" : img.alt || "Gallery photo"}</span>
              </div>
              <div className="ff-admin-image-actions">
                {i !== 0 && (
                  <button type="button" onClick={() => makePrimary(i)}>
                    Make primary
                  </button>
                )}
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Move down">
                  ↓
                </button>
                <button type="button" onClick={() => removeAt(i)} className="ff-admin-image-remove" aria-label="Remove image">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="ff-btn ff-btn-ghost"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading && <span className="ff-btn-spinner" />}
        <span>{uploading ? "Uploading…" : "+ Upload images"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        onChange={onInputChange}
        hidden
      />
      {error && <p className="ff-field-error">{error}</p>}
      <p className="ff-admin-hint">The first image is used as the primary photo. Use "Make primary" to reorder.</p>
    </div>
  );
}
