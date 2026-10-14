const configuredAPIOrigin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API_ORIGIN = import.meta.env.DEV ? "" : configuredAPIOrigin;
const API_PREFIX = `${API_ORIGIN}/api/v1`;

// Absolute URL for an API path, for use in attributes such as img src.
export function apiPath(path) {
  return `${API_PREFIX}${path}`;
}

export async function requestJSON(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body instanceof FormData) {
    headers.delete("Content-Type");
  } else if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_PREFIX}${path}`, {
    credentials: "include",
    headers,
    ...options
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? "The request could not be completed.");
  }
  return payload;
}
