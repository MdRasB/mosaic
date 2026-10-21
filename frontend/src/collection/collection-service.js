import { requestJSON } from "../api/http.js";
import { cachedQuery, invalidateCached } from "../api/query-cache.js";

const queryString = ({ type = "all", sort = "recent", limit = 20, offset = 0 } = {}) =>
  new URLSearchParams({ type, sort, limit, offset }).toString();

export const collectionService = {
  add: async (media) => {
    const result = await requestJSON("/collection", { method: "POST", body: JSON.stringify(media) });
    invalidateCached("/collection", "/favorites");
    return result;
  },
  check: (media) => requestJSON(`/collection/check?${new URLSearchParams({
    provider: media.provider,
    type: media.media_type,
    id: media.provider_media_id
  })}`),
  list: (filters) => cachedQuery(`/collection?${queryString(filters)}`, () => requestJSON(`/collection?${queryString(filters)}`)),
  remove: async (id) => {
    const result = await requestJSON(`/collection/${id}`, { method: "DELETE" });
    invalidateCached("/collection", "/favorites");
    return result;
  },
  favorite: async (id) => {
    const result = await requestJSON(`/collection/${id}/favorite`, { method: "PUT" });
    invalidateCached("/collection", "/favorites");
    return result;
  },
  unfavorite: async (id) => {
    const result = await requestJSON(`/collection/${id}/favorite`, { method: "DELETE" });
    invalidateCached("/collection", "/favorites");
    return result;
  },
  addAsFavorite: async (media) => {
    const result = await requestJSON("/favorites/media", {
      method: "PUT",
      body: JSON.stringify(media)
    });
    invalidateCached("/collection", "/favorites");
    return result;
  },
  listFavorites: (filters) => cachedQuery(`/favorites?${queryString(filters)}`, () => requestJSON(`/favorites?${queryString(filters)}`))
};
