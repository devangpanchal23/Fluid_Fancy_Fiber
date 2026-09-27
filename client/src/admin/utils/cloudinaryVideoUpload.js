export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB — Cloudinary's own plan limits apply too

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const VIDEO_UPLOAD_NOT_CONFIGURED_MESSAGE =
  "Video uploads aren't configured yet — set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in client/.env (see client/.env.example), then restart the dev server. \"Paste URL\" works without this.";

export function isCloudinaryVideoConfigured() {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export function validateVideoFile(file) {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported video type (use MP4, WEBM or MOV).`;
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return `"${file.name}" is too large. Maximum size is 500MB.`;
  }
  return null;
}

export function thumbnailForVideo(publicId) {
  if (!publicId || !CLOUD_NAME) return null;
  return { url: `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0/${publicId}.jpg`, alt: "" };
}

// Uploads directly from the browser to Cloudinary using an unsigned preset —
// the video file never passes through our own server, which avoids Vercel
// serverless request-size/timeout limits entirely. Uses XMLHttpRequest (not
// fetch) specifically because it's the only way to get real upload progress
// percentage, which matters here since video files are far larger than the
// images this admin panel otherwise handles.
export function uploadVideoToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryVideoConfigured()) {
      reject(new Error(VIDEO_UPLOAD_NOT_CONFIGURED_MESSAGE));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) {
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          duration: data.duration || null,
          size: data.bytes || file.size,
          mimeType: file.type,
          originalName: file.name,
          thumbnail: thumbnailForVideo(data.public_id)
        });
      } else {
        reject(new Error(data?.error?.message || "Upload failed. Please try again."));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed. Please check your connection and try again."));

    xhr.send(formData);
  });
}
