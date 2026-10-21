import { requestJSON } from "../api/http.js";
import { cachedQuery, invalidateCached } from "../api/query-cache.js";

export const profileService = {
  get: () => cachedQuery("/profile/me", () => requestJSON("/profile/me"), 300000),
  update: async (profile) => {
    const result = await requestJSON("/profile/me", {
      method: "PATCH",
      body: JSON.stringify(profile)
    });
    invalidateCached("/profile/me");
    return result;
  },
  uploadAvatar: async (file) => {
    const body = new FormData();
    body.append("avatar", file);
    const result = await requestJSON("/profile/me/avatar/upload", { method: "POST", body });
    invalidateCached("/profile/me");
    return result;
  },
  clearAvatar: async () => {
    const result = await requestJSON("/profile/me/avatar", { method: "DELETE" });
    invalidateCached("/profile/me");
    return result;
  },
};
