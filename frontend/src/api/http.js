const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API_PREFIX = `${API_ORIGIN}/api/v1`;

export async function requestJSON(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? "The request could not be completed.");
  }
  return payload;
}
