import { requestJSON } from "../api/http.js";

const queryString = ({ type = "all", status = "all", sort = "recent", limit = 20, offset = 0 } = {}) =>
  new URLSearchParams({ type, status, sort, limit, offset }).toString();

export const watchlistService = {
  add: (media) => requestJSON("/watchlist", { method: "POST", body: JSON.stringify(media) }),
  list: (filters) => requestJSON(`/watchlist?${queryString(filters)}`),
  remove: (id) => requestJSON(`/watchlist/${id}`, { method: "DELETE" }),
  setStatus: (id, status) => requestJSON(`/watchlist/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status })
  })
};