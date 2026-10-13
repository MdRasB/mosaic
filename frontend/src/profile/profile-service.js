import { requestJSON } from "../api/http.js";

export const profileService = {
  get: () => requestJSON("/profile/me"),
  update: (profile) => requestJSON("/profile/me", {
    method: "PATCH",
    body: JSON.stringify(profile)
  })
};
