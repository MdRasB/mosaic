import { authService } from "../../auth/auth-service.js";
import { escapeHtml } from "../../utils/escape-html.js";

function authMarkup(mode) {
  const register = mode === "register";
  return `
    <section class="auth-page" aria-labelledby="auth-title">
      <div class="auth-card">
        <p class="eyebrow">${register ? "Create your account" : "Welcome back"}</p>
        <h1 id="auth-title">${register ? "Join Mosaic." : "Sign in."}</h1>
        <p class="muted">${register ? "Start building your personal media world." : "Continue exploring your world."}</p>
        <form class="auth-form" id="auth-form">
          <label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
          <label>Password<input name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" required minlength="15" maxlength="128"></label>
          <p class="auth-message" id="auth-message" role="alert"></p>
          <button class="button button-primary" type="submit">${register ? "Create account" : "Sign in"}</button>
        </form>
        <p class="auth-switch">${register ? "Already have an account?" : "New to Mosaic?"}
          <a href="/${register ? "login" : "register"}">${register ? "Sign in" : "Create one"}</a>
        </p>
      </div>
    </section>
  `;
}

export function renderAuthPage(container, mode, onSuccess) {
  container.classList.remove("explore-shell");
  container.innerHTML = authMarkup(mode);
  const form = container.querySelector("#auth-form");
  const message = container.querySelector("#auth-message");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    message.textContent = "";
    const formData = new FormData(form);
    try {
      await (mode === "register"
        ? authService.register(formData.get("email"), formData.get("password"))
        : authService.login(formData.get("email"), formData.get("password")));
      onSuccess();
    } catch (error) {
      message.textContent = escapeHtml(error.message);
      button.disabled = false;
    }
  });
}

export function renderDashboard(container, user, onLogout) {
  container.classList.remove("explore-shell");
  container.innerHTML = `
    <section class="explore-state explore-state-empty page-placeholder">
      <div><p class="eyebrow">Your Mosaic</p><h1>Welcome back.</h1><p class="muted">${escapeHtml(user.email)}</p>
      <p class="muted">Your dashboard foundation is ready. Collection features arrive in the next module.</p></div>
      <button class="button button-primary" id="logout-button" type="button">Log out</button>
    </section>`;
  container.querySelector("#logout-button").addEventListener("click", onLogout);
}
