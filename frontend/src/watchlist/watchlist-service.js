import { requestJSON } from "../api/http.js";
import { cachedQuery, invalidateCached } from "../api/query-cache.js";

const queryString = ({ type = "all", status = "all", sort = "recent", limit = 20, offset = 0 } = {}) =>
  new URLSearchParams({ type, status, sort, limit, offset }).toString();

export const watchlistService = {
  add: async (media) => {
    const result = await requestJSON("/watchlist", { method: "POST", body: JSON.stringify(media) });
    invalidateCached("/watchlist");
    return result;
  },
  list: (filters) => cachedQuery(`/watchlist?${queryString(filters)}`, () => requestJSON(`/watchlist?${queryString(filters)}`)),
  remove: async (id) => {
    const result = await requestJSON(`/watchlist/${id}`, { method: "DELETE" });
    invalidateCached("/watchlist");
    return result;
  },
  setStatus: async (id, status) => {
    const result = await requestJSON(`/watchlist/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
    invalidateCached("/watchlist");
    return result;
  },
  history: (id) => requestJSON(`/watchlist/${id}/history`)
};