import { useRef, useState } from "react";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE = 500 * 1024 * 1024; // 500MB — Cloudinary's own plan limits apply too

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Unsupported file type. Upload an MP4, WEBM or MOV video.";
  }
  if (file.size > MAX_SIZE) {
    return "Video is too large. Maximum size is 500MB.";
  }
  return null;
}

function thumbnailFor(publicId, resourceCloudName) {
  return { url: `https://res.cloudinary.com/${resourceCloudName}/video/upload/so_0/${publicId}.jpg`, alt: "" };
}

// Uploads directly from the browser to Cloudinary using an unsigned preset —
// the video file never passes through our own server, which avoids Vercel
// serverless request-size/timeout limits entirely. Uses XMLHttpRequest
// (not fetch) specifically because it's the only way to get real upload
// progress percentage.
// `onUploadingChange` lets the parent form disable its Save button while a
// file is still uploading — VideoForm also independently refuses to save
// without a completed url/publicId, but this closes the gap visually too.
export default function VideoUploader({ video, onChange, onUploadingChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const configured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

  function setUploadingState(value) {
    setUploading(value);
    onUploadingChange?.(value);
  }

  function handleFile(file) {
    setError("");
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!configured) {
      setError("Video uploads aren't configured yet — set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET (see client/.env.example).");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.onload = () => {
      setUploadingState(false);
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) {
        onChange({
          url: data.secure_url,
          publicId: data.public_id,
          duration: data.duration || null,
          thumbnail: thumbnailFor(data.public_id, CLOUD_NAME)
        });
      } else {
        setError(data?.error?.message || "Upload failed. Please try again.");
      }
    };

    xhr.onerror = () => {
      setUploadingState(false);
      setError("Upload failed. Please check your connection and try again.");
    };

    setUploadingState(true);
    setProgress(0);
    xhr.send(formData);
  }

  function onInputChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  }

  function removeVideo() {
    onChange(null);
    setError("");
  }

  return (
    <div className="ff-admin-uploader">
      {video?.url ? (
        <div className="ff-admin-uploader-preview">
          <video src={video.url} poster={video.thumbnail?.url} controls style={{ width: 240, height: 135 }} />
          <button type="button" className="ff-admin-image-remove" onClick={removeVideo}>
            Remove
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="ff-admin-uploader-dropzone"
            style={{ width: 240, height: 135 }}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? `Uploading… ${progress}%` : "+ Upload video"}
          </button>
          {uploading && (
            <div className="ff-admin-progress-track">
              <div className="ff-admin-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
        </>
      )}
      <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(",")} onChange={onInputChange} hidden />
      {error && <p className="ff-field-error">{error}</p>}
    </div>
  );
}
