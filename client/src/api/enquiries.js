import { getApiBase } from "../apiBase";

const API_URL = getApiBase();

async function postJSON(path, body, idempotencyKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    throw new Error(error.name === "AbortError" ? "The request timed out. Please try again." : "Could not reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

export function submitEnquiry({ name, company, email, message, website }, idempotencyKey) {
  return postJSON("/enquiries", { type: "contact", name, company, email, message, website }, idempotencyKey);
}

export function submitSpecRequest({ email, lineName, website }, idempotencyKey) {
  return postJSON("/enquiries", { type: "spec", email, lineName, website }, idempotencyKey);
}
