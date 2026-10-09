import { requestJSON } from "../api/http.js";

export const authService = {
  register: (email, password) => requestJSON("/auth/register", {
    method: "POST", body: JSON.stringify({ email, password })
  }),
  login: (email, password) => requestJSON("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password })
  }),
  me: () => requestJSON("/auth/me"),
  logout: () => requestJSON("/auth/logout", { method: "POST" })
};
