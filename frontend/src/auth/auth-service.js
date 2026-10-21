import { requestJSON } from "../api/http.js";
import { cachedQuery, invalidateCached } from "../api/query-cache.js";

export const authService = {
  register: (email, password) => requestJSON("/auth/register", {
    method: "POST", body: JSON.stringify({ email, password })
  }),
  login: (email, password) => requestJSON("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password })
  }),
  me: () => cachedQuery("/auth/me", () => requestJSON("/auth/me"), 30000),
  logout: async () => {
    const result = await requestJSON("/auth/logout", { method: "POST" });
    invalidateCached("/auth/me", "/profile/me");
    return result;
  }
};
