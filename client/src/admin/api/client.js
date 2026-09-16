import { getApiBase } from "../../apiBase";

const API_URL = getApiBase();

class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

const REQUEST_TIMEOUT_MS = 20000;

async function request(path, { method = "GET", body, params } = {}) {
  let url = `${API_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError("Request timed out. Check your connection (or that the server is running) and try again.", 0, {});
    }
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0, {});
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty body (e.g. 204) — leave data null
  }

  if (!res.ok || (data && data.success === false)) {
    throw new ApiError(data?.message || "Something went wrong. Please try again.", res.status, data?.errors);
  }
  return data?.data ?? data;
}

const UPLOAD_TIMEOUT_MS = 45000;

// A network-level hang (dropped connection, server restart mid-request, a
// misbehaving proxy) leaves fetch's promise pending forever — there is no
// default timeout. Without this, the uploader's "Uploading…" state would
// spin indefinitely with no error and no way to recover except reloading
// the page. AbortController turns that into a clear, actionable error after
// a bounded wait instead.
async function upload(path, formData) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError("Upload timed out. Check your connection (or that the server is running) and try again.", 0, {});
    }
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0, {});
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty body — leave data null
  }
  if (!res.ok || (data && data.success === false)) {
    throw new ApiError(data?.message || "Upload failed. Please try again.", res.status, data?.errors);
  }
  return data?.data ?? data;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  delete: (path, params) => request(path, { method: "DELETE", params }),
  upload
};

export { ApiError };
