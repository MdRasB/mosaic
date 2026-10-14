import { requestJSON } from "../api/http.js";

export const profileService = {
  get: () => requestJSON("/profile/me"),
  update: (profile) => requestJSON("/profile/me", {
    method: "PATCH",
    body: JSON.stringify(profile)
  }),
  uploadAvatar: (file) => {
    const body = new FormData();
    body.append("avatar", file);
    return requestJSON("/profile/me/avatar/upload", { method: "POST", body });
  },
  clearAvatar: () => requestJSON("/profile/me/avatar", { method: "DELETE" })
};
