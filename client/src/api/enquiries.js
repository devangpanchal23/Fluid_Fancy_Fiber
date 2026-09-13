import { getApiBase } from "../apiBase";

const API_URL = getApiBase();

async function postJSON(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

export function submitEnquiry({ name, company, email, message }) {
  return postJSON("/enquiries", { type: "contact", name, company, email, message });
}

export function submitSpecRequest({ email, lineName }) {
  return postJSON("/enquiries", { type: "spec", email, lineName });
}
