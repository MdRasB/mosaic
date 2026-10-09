import { createSearchSuggestions } from "./components/search/search-suggestions.js";
import { renderExplorePage } from "./pages/explore/explore.js";
import { renderSearchLanding, renderSearchPage } from "./pages/search/search.js";
import { parseMediaRoute, renderMediaDetailsPage } from "./pages/media/media-details.js";
import { authService } from "./auth/auth-service.js";
import { renderAuthPage, renderDashboard } from "./pages/auth/auth.js";
import { renderProfilePage } from "./pages/profile/profile.js";
import { renderProfileSettings } from "./pages/profile/profile-settings.js";
import { saveRecentSearch } from "./utils/recent-searches.js";

const themeToggle = document.querySelector("#theme-toggle");
const appShell = document.querySelector(".app-shell");
const toast = document.querySelector("#toast");
const sidebar = document.querySelector("#sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const sidebarOverlay = document.querySelector("#sidebar-overlay");
const loginButton = document.querySelector("#login-button");
const registerButton = document.querySelector("#register-button");
const profileButton = document.querySelector("#profile-button");
const navLinks = document.querySelectorAll(".nav-link");
const themeStorageKey = "mosaic-theme";
const content = document.querySelector("#app-content");
const searchForm = document.querySelector("#global-search-form");
const searchInput = document.querySelector("#global-search");
let currentUser = null;

function setTheme(isLight, { persist = true } = {}) {
  document.documentElement.toggleAttribute("data-theme", isLight);
  themeToggle.setAttribute("aria-pressed", String(isLight));
  themeToggle.textContent = isLight ? "Use dark theme" : "Use light theme";

  if (persist) {
    window.localStorage.setItem(themeStorageKey, isLight ? "light" : "dark");
  }
}

function showToast() {
  toast.classList.add("toast-visible");
  window.setTimeout(() => toast.classList.remove("toast-visible"), 2600);
}

function showMessage(message) {
  toast.textContent = message;
  showToast();
}

function restoreTheme() {
  const savedTheme = window.localStorage.getItem(themeStorageKey);
  setTheme(savedTheme === "light", { persist: false });
}

function setSidebarCollapsed(isCollapsed) {
  sidebar.classList.toggle("sidebar-collapsed", isCollapsed);
  appShell.classList.toggle("sidebar-is-collapsed", isCollapsed);
  sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
  sidebarToggle.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
}

function renderPlaceholder(title) {
  content.innerHTML = `
    <section class="explore-state explore-state-empty page-placeholder">
      <div>
        <p class="eyebrow">Coming in a later module</p>
        <h1>${title}</h1>
        <p class="muted">This route is reserved for the next implementation module.</p>
      </div>
      <a class="button button-primary" href="/explore">Back to Explore</a>
    </section>
  `;
}

function isCurrentNavigationTarget(link) {
  const target = new URL(link.href, window.location.origin);
  const currentPath = window.location.pathname;
  const targetPath = target.pathname;
  const currentExplore = currentPath === "/" || currentPath === "/explore";
  const targetExplore = targetPath === "/" || targetPath === "/explore";

  if (currentExplore && targetExplore) {
    return true;
  }

  return (
    targetPath === currentPath &&
    target.search === window.location.search &&
    target.hash === window.location.hash
  );
}

function updateAuthControls() {
  loginButton.hidden = Boolean(currentUser);
  registerButton.hidden = Boolean(currentUser);
  profileButton.hidden = !currentUser;
  profileButton.textContent = currentUser ? currentUser.email.slice(0, 2).toUpperCase() : "MR";
  profileButton.setAttribute("aria-label", currentUser ? `Open account for ${currentUser.email}` : "Open profile");
}

function safeRedirectPath(path) {
  return path.startsWith("/") && !path.startsWith("//")
    ? path
    : "/dashboard";
}

async function loadSession() {
  try {
    currentUser = await authService.me();
  } catch {
    currentUser = null;
  }
  updateAuthControls();
}

function renderRoute() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  content.mediaDetailsRenderToken = Symbol("route-change");

  if (path === "/login" || path === "/register") {
    if (currentUser) {
      window.history.replaceState({}, "", "/dashboard");
      loadSession().then(renderRoute);
      return;
    }
    renderAuthPage(content, path.slice(1), () => {
      const destination = new URLSearchParams(window.location.search).get("redirect");
      const safeDestination = safeRedirectPath(destination ?? "/dashboard");
      window.history.pushState({}, "", safeDestination);
      loadSession().then(renderRoute);
    });
  } else if (path === "/profile" || path === "/settings/profile") {
    if (!currentUser) {
      window.history.replaceState({}, "", `/login?redirect=${encodeURIComponent(path)}`);
      loadSession().then(renderRoute);
      return;
    }
    if (path === "/profile") {
      renderProfilePage(content);
    } else {
      renderProfileSettings(content);
    }
  } else if (path === "/dashboard") {
    if (!currentUser) {
      window.history.replaceState({}, "", `/login?redirect=${encodeURIComponent(path)}`);
      renderRoute();
      return;
    }
    renderDashboard(content, currentUser, async () => {
      await authService.logout();
      currentUser = null;
      updateAuthControls();
      window.history.pushState({}, "", "/explore");
      renderRoute();
    });
  } else if (path === "/" || path === "/explore") {
    renderExplorePage(content);
  } else if (path === "/search") {
    const query = params.get("q")?.trim();

    searchSuggestions.close();

    if (!query) {
      searchInput.value = "";
      renderSearchLanding(content);
      return;
    }

    searchInput.value = query;
    renderSearchPage(content, query, params.get("type"), params.get("sort"));
  } else if (path.startsWith("/media/")) {
    const mediaRoute = parseMediaRoute(path);
    if (!mediaRoute) {
      content.classList.remove("explore-shell");
      content.innerHTML = `
        <section class="explore-state explore-state-empty page-placeholder">
          <div><p class="eyebrow">Invalid media link</p><h1>That title link is not valid.</h1>
          <p class="muted">Choose a movie or TV show from Explore or Search.</p></div>
          <a class="button button-primary" href="/explore">Back to Explore</a>
        </section>`;
      return;
    }
    renderMediaDetailsPage(content, mediaRoute);
  } else {
    renderPlaceholder("This page is not available yet.");
  }
}

themeToggle.addEventListener("click", () => {
  setTheme(!document.documentElement.hasAttribute("data-theme"));
});

sidebarToggle.addEventListener("click", () => {
  if (window.matchMedia("(max-width: 800px)").matches) {
    const isOpen = sidebar.classList.toggle("sidebar-mobile-open");
    sidebarOverlay.classList.toggle("sidebar-overlay-visible", isOpen);
    sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    sidebarToggle.setAttribute("aria-label", isOpen ? "Close sidebar" : "Open sidebar");
    return;
  }

  setSidebarCollapsed(!sidebar.classList.contains("sidebar-collapsed"));
});

sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("sidebar-mobile-open");
  sidebarOverlay.classList.remove("sidebar-overlay-visible");
  sidebarToggle.setAttribute("aria-expanded", "false");
  sidebarToggle.setAttribute("aria-label", "Open sidebar");
});

loginButton.addEventListener("click", () => {
  window.location.href = "/login";
});
registerButton.addEventListener("click", () => {
  window.location.href = "/register";
});
profileButton.addEventListener("click", () => {
  if (currentUser) {
    window.history.pushState({}, "", "/profile");
    renderRoute();
  } else {
    showMessage("Sign in to open your profile.");
  }
});

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!link.classList.contains("nav-link-disabled") && isCurrentNavigationTarget(link)) {
      event.preventDefault();
      const label = link.textContent.trim().replace(/\s+/g, " ");
      showMessage(`You are already viewing ${label}.`);
      return;
    }

    if (!link.classList.contains("nav-link-disabled")) {
      return;
    }

    event.preventDefault();
    showMessage("This navigation item is reserved for a future module.");
  });
});

function submitSearchQuery(rawQuery) {
  const query = rawQuery.trim();

  if (!query) {
    showMessage("Enter a title to start searching.");
    return;
  }

  saveRecentSearch(query);
  searchInput.value = query;
  window.history.pushState({}, "", `/search?q=${encodeURIComponent(query)}`);
  loadSession().then(renderRoute);
}

const searchSuggestions = createSearchSuggestions({
  input: searchInput,
  form: searchForm,
  onSelect: (item) => submitSearchQuery(item.title)
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSearchQuery(searchInput.value);
});

window.addEventListener("popstate", () => {
  searchSuggestions.close();
  loadSession().then(renderRoute);
});

restoreTheme();
if (!window.matchMedia("(max-width: 800px)").matches) {
  setSidebarCollapsed(true);
}

renderRoute();
