import { requestJSON } from "../api/http.js";

const queryString = ({ type = "all", sort = "recent", limit = 20, offset = 0 } = {}) =>
  new URLSearchParams({ type, sort, limit, offset }).toString();

export const collectionService = {
  add: (media) => requestJSON("/collection", { method: "POST", body: JSON.stringify(media) }),
  check: (media) => requestJSON(`/collection/check?${new URLSearchParams({
    provider: media.provider,
    type: media.media_type,
    id: media.provider_media_id
  })}`),
  list: (filters) => requestJSON(`/collection?${queryString(filters)}`),
  remove: (id) => requestJSON(`/collection/${id}`, { method: "DELETE" }),
  favorite: (id) => requestJSON(`/collection/${id}/favorite`, { method: "PUT" }),
  unfavorite: (id) => requestJSON(`/collection/${id}/favorite`, { method: "DELETE" }),
  addAsFavorite: (media) => requestJSON("/favorites/media", {
    method: "PUT",
    body: JSON.stringify(media)
  }),
  listFavorites: (filters) => requestJSON(`/favorites?${queryString(filters)}`)
};
