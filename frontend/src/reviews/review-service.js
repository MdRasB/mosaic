import { requestJSON } from "../api/http.js";
import { cachedQuery, invalidateCached } from "../api/query-cache.js";

const queryString = ({ type = "all", visibility = "all", spoilers = "all", sort = "recent", limit = 20, offset = 0 } = {}) =>
  new URLSearchParams({ type, visibility, spoilers, sort, limit, offset }).toString();

export const reviewService = {
  // PUT is an upsert: it creates the relationship, the review or both.
  saveForMedia: async (media, review) => {
    const result = await requestJSON("/reviews/media", {
      method: "PUT",
      body: JSON.stringify({ media, review })
    });
    invalidateCached("/reviews", "/media/");
    return result;
  },
  listMine: (filters) => cachedQuery(`/reviews/me?${queryString(filters)}`, () => requestJSON(`/reviews/me?${queryString(filters)}`)),
  mineForMedia: (mediaType, providerMediaId, limit = 1) => cachedQuery(`/reviews/me?${new URLSearchParams({
    media_type: mediaType,
    provider_media_id: providerMediaId,
    limit
  })}`, () => requestJSON(`/reviews/me?${new URLSearchParams({
    media_type: mediaType, provider_media_id: providerMediaId, limit
  })}`)),
  get: (id) => cachedQuery(`/reviews/${id}`, () => requestJSON(`/reviews/${id}`)),
  update: async (id, patch) => {
    const result = await requestJSON(`/reviews/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    invalidateCached("/reviews");
    return result;
  },
  remove: async (id) => {
    const result = await requestJSON(`/reviews/${id}`, { method: "DELETE" });
    invalidateCached("/reviews");
    return result;
  },
  listPublic: (mediaType, providerMediaId, { limit = 20, offset = 0 } = {}) =>
  cachedQuery(`/media/${mediaType}/${encodeURIComponent(providerMediaId)}/reviews?${new URLSearchParams({ limit, offset })}`,
    () => requestJSON(`/media/${mediaType}/${encodeURIComponent(providerMediaId)}/reviews?${new URLSearchParams({ limit, offset })}`))
};
