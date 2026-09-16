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
    return "Unsupported file type. Choose a JPEG, PNG, WEBP or GIF image.";
  }
  if (file.size > MAX_SIZE) {
    return "Image is too large. Maximum size is 5MB.";
  }
  return null;
}

// Single-image uploader used for Person photos, Category images, and Video
// thumbnails. `onUploadingChange` lets the parent form disable its Save
// button while a file is still uploading — without it, an admin who selects
// a file and clicks Save immediately (before the async upload finishes and
// calls onChange) submits the form without the image, since the upload
// happens independently of form submission.
export default function ImageUploader({ image, onChange, label = "Image", onUploadingChange }) {
  const inputRef = useRef(null);
  const toast = useToast();
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function setUploadingState(value) {
    setUploading(value);
    onUploadingChange?.(value);
  }

  async function handleFile(file) {
    setError("");
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploadingState(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { url, filename } = await api.upload("/uploads", formData);
      onChange({ url, filename, alt: image?.alt || "" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Upload failed. Please try again.";
      setError(message);
      toast.error(`Image upload failed: ${message}`);
    } finally {
      setUploadingState(false);
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    }
  }

  function onInputChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  }

  async function removeImage() {
    if (image?.filename) {
      api.delete(`/uploads/${image.filename}`).catch(() => {});
    }
    onChange(null);
    setError("");
  }

  const displaySrc = preview || (image ? resolveSrc(image.url) : null);

  return (
    <div className="ff-admin-uploader">
      {displaySrc ? (
        <div className="ff-admin-uploader-preview">
          <img src={displaySrc} alt={image?.alt || ""} />
          {uploading && <span className="ff-admin-uploader-spinner" aria-label="Uploading" />}
          {!uploading && (
            <button type="button" className="ff-admin-image-remove" onClick={removeImage}>
              Remove
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="ff-admin-uploader-dropzone"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <span className="ff-admin-uploader-spinner" aria-label="Uploading" /> : `+ Upload ${label.toLowerCase()}`}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={onInputChange}
        hidden
      />
      {error && <p className="ff-field-error">{error}</p>}
    </div>
  );
}
