import { requestJSON } from "../api/http.js";

const queryString = ({ type = "all", sort = "recent", limit = 20, offset = 0 } = {}) =>
  new URLSearchParams({ type, sort, limit, offset }).toString();

export const ratingService = {
  // Resolves media identity and the relationship in one call, so a title can be
  // rated without first being added to collection, favorites or watchlist.
  setForMedia: (media, rating) => requestJSON("/ratings/media", {
    method: "PUT",
    body: JSON.stringify({ media, rating })
  }),
  set: (id, rating) => requestJSON(`/ratings/${id}`, {
    method: "PUT",
    body: JSON.stringify({ rating })
  }),
  remove: (id) => requestJSON(`/ratings/${id}`, { method: "DELETE" }),
  list: (filters) => requestJSON(`/ratings?${queryString(filters)}`)
};
