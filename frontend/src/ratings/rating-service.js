import { requestJSON } from "../api/http.js";
import { cachedQuery, invalidateCached } from "../api/query-cache.js";

const queryString = ({ type = "all", sort = "recent", limit = 20, offset = 0 } = {}) =>
  new URLSearchParams({ type, sort, limit, offset }).toString();

export const ratingService = {
  // Resolves media identity and the relationship in one call, so a title can be
  // rated without first being added to collection, favorites or watchlist.
  setForMedia: async (media, rating) => {
    const result = await requestJSON("/ratings/media", {
      method: "PUT",
      body: JSON.stringify({ media, rating })
    });
    invalidateCached("/ratings");
    return result;
  },
  set: async (id, rating) => {
    const result = await requestJSON(`/ratings/${id}`, {
      method: "PUT",
      body: JSON.stringify({ rating })
    });
    invalidateCached("/ratings");
    return result;
  },
  remove: async (id) => {
    const result = await requestJSON(`/ratings/${id}`, { method: "DELETE" });
    invalidateCached("/ratings");
    return result;
  },
  list: (filters) => cachedQuery(`/ratings?${queryString(filters)}`, () => requestJSON(`/ratings?${queryString(filters)}`))
};
