import { getApiBase } from "../../apiBase";

const API_URL = getApiBase();

export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
// Kept in sync with server/src/controllers/videoAssetController.js's
// MAX_VIDEO_SIZE — enforced again server-side regardless, this just lets
// the admin see the rejection immediately instead of after a chunked upload
// already started.
export const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

export function validateVideoFile(file) {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported video type (use MP4, WEBM or MOV).`;
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return `"${file.name}" is too large. Maximum size is ${Math.round(MAX_VIDEO_SIZE / (1024 * 1024))}MB.`;
  }
  return null;
}

// Reads the video's duration client-side (no server-side transcoding, which
// would need a media-processing dependency this app deliberately doesn't
// have) by loading it into an offscreen <video> element just far enough to
// resolve its metadata. Best-effort: resolves null rather than rejecting, so
// a browser quirk here never blocks the actual upload.
export function getVideoDuration(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 8000);
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(null);
    };
    video.src = objectUrl;
  });
}

function requestJSON(path, { method = "GET", body } = {}) {
  return fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  }).then(async (res) => {
    let data = null;
    try {
      data = await res.json();
    } catch {
      // no body
    }
    if (!res.ok || (data && data.success === false)) {
      throw new Error(data?.message || "Something went wrong. Please try again.");
    }
    return data?.data ?? data;
  });
}

// Uses XMLHttpRequest (not fetch) specifically for its `upload.progress`
// event, which is what lets the caller report real byte-level progress
// across the whole multi-chunk upload — a bare spinner isn't much use for a
// file this size. One retry per chunk absorbs the occasional dropped
// connection without failing the whole upload over a single blip.
function putChunk(uploadId, index, blob, isLast, onChunkProgress) {
  return new Promise((resolve, reject) => {
    const attempt = (retriesLeft) => {
      const formData = new FormData();
      formData.append("chunk", blob);
      formData.append("isLast", String(isLast));

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", `${API_URL}/video-assets/uploads/${uploadId}/chunks/${index}`);
      xhr.withCredentials = true;

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onChunkProgress(e.loaded);
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        if (retriesLeft > 0) return attempt(retriesLeft - 1);
        let message = "Chunk upload failed.";
        try {
          message = JSON.parse(xhr.responseText)?.message || message;
        } catch {
          // ignore
        }
        reject(new Error(message));
      };

      xhr.onerror = () => {
        if (retriesLeft > 0) return attempt(retriesLeft - 1);
        reject(new Error("Upload failed. Please check your connection and try again."));
      };

      xhr.send(formData);
    };
    attempt(1);
  });
}

// Splits the file into fixed-size chunks (server-dictated size, see
// startVideoUpload) and PUTs them one at a time — see
// server/src/utils/videoStorage.js for why: Vercel serverless functions
// hard-cap request payloads at ~4.5MB, far below any real video file.
export async function uploadVideoLocally(file, onProgress) {
  const duration = await getVideoDuration(file);

  const { uploadId, chunkSize } = await requestJSON("/video-assets/uploads", {
    method: "POST",
    body: { mimeType: file.type, size: file.size }
  });

  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
  const chunkLoaded = new Array(totalChunks).fill(0);

  const reportProgress = () => {
    const loaded = chunkLoaded.reduce((sum, n) => sum + n, 0);
    onProgress?.(Math.min(100, Math.round((loaded / file.size) * 100)));
  };

  try {
    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const blob = file.slice(start, end);
      const isLast = index === totalChunks - 1;
      // eslint-disable-next-line no-await-in-loop -- chunks must land in order; the server keys each on this same index.
      await putChunk(uploadId, index, blob, isLast, (loaded) => {
        chunkLoaded[index] = loaded;
        reportProgress();
      });
      chunkLoaded[index] = blob.size;
      reportProgress();
    }

    const { videoAsset } = await requestJSON(`/video-assets/uploads/${uploadId}/complete`, {
      method: "POST",
      body: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        totalChunks,
        duration
      }
    });

    return videoAsset;
  } catch (err) {
    // Best-effort cleanup — don't let a failed abort call mask the real error.
    requestJSON(`/video-assets/uploads/${uploadId}`, { method: "DELETE" }).catch(() => {});
    throw err;
  }
}
