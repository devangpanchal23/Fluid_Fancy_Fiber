// Resolves the API base URL without depending on a VITE_API_URL build-time
// env var being configured on the host (Vite bakes env vars in at build
// time, so a missing one on a fresh deployment would otherwise silently fall
// back to a hardcoded value forever, until someone remembers to set it and
// rebuilds). Instead: explicit override wins if set; otherwise, only use the
// localhost dev server when actually running on localhost — every other
// origin (any Vercel deployment, a custom domain, etc.) talks to its own
// same-origin /api, which is always correct for this single-project setup.
export function getApiBase() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "/api";
    }
  }

  return "http://localhost:5000/api";
}

// Locally-stored uploads (server/src/utils/imageStorage.js) come back as
// origin-relative paths like "/uploads/<file>" — correct when the API and
// the page share an origin, but in local dev the client (Vite, :5173) and
// the API (Express, :5000) are different origins, so a bare "/uploads/..."
// resolves against the WRONG server (Vite's SPA fallback, which 200s with
// index.html instead of the image) and the <img> just fails to decode.
// Cloudinary-backed uploads are already absolute URLs and pass through
// unchanged; this only rewrites the locally-relative case, using the same
// API origin every request already goes through.
export function resolveUploadUrl(url) {
  if (typeof url !== "string" || !url.startsWith("/uploads/")) return url;
  const apiBase = getApiBase();
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${url}`;
}
