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
