import { requestJSON } from "../api/http.js";

const queryString = ({ type = "all", visibility = "all", spoilers = "all", sort = "recent", limit = 20, offset = 0 } = {}) =>
  new URLSearchParams({ type, visibility, spoilers, sort, limit, offset }).toString();

export const reviewService = {
  // PUT is an upsert: it creates the relationship, the review or both.
  saveForMedia: (media, review) => requestJSON("/reviews/media", {
    method: "PUT",
    body: JSON.stringify({ media, review })
  }),
  listMine: (filters) => requestJSON(`/reviews/me?${queryString(filters)}`),
  mineForMedia: (mediaType, providerMediaId, limit = 1) => requestJSON(`/reviews/me?${new URLSearchParams({
    media_type: mediaType,
    provider_media_id: providerMediaId,
    limit
  })}`),
  get: (id) => requestJSON(`/reviews/${id}`),
  update: (id, patch) => requestJSON(`/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  }),
  remove: (id) => requestJSON(`/reviews/${id}`, { method: "DELETE" }),
  listPublic: (mediaType, providerMediaId, { limit = 20, offset = 0 } = {}) =>
    requestJSON(`/media/${mediaType}/${encodeURIComponent(providerMediaId)}/reviews?${new URLSearchParams({ limit, offset })}`)
};
