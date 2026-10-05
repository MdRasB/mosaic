import { createSearchSuggestions } from "./components/search/search-suggestions.js";
import { renderExplorePage } from "./pages/explore/explore.js";
import { renderSearchPage } from "./pages/search/search.js";

const themeToggle = document.querySelector("#theme-toggle");
const appShell = document.querySelector(".app-shell");
const toast = document.querySelector("#toast");
const sidebar = document.querySelector("#sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const sidebarOverlay = document.querySelector("#sidebar-overlay");
const loginButton = document.querySelector("#login-button");
const registerButton = document.querySelector("#register-button");
const profileButton = document.querySelector("#profile-button");
const navLinks = document.querySelectorAll(".nav-link-disabled");
const themeStorageKey = "mosaic-theme";
const content = document.querySelector("#app-content");
const searchForm = document.querySelector("#global-search-form");
const searchInput = document.querySelector("#global-search");

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

function renderRoute() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  if (path === "/" || path === "/explore") {
    renderExplorePage(content);
  } else if (path === "/search") {
    const query = params.get("q")?.trim();

    if (!query) {
      renderPlaceholder("Search for a movie or TV show.");
      return;
    }

    searchSuggestions.close();
    searchInput.value = query;
    renderSearchPage(content, query, params.get("type"));
  } else if (path.startsWith("/media/")) {
    renderPlaceholder("Media details are coming in Module M04.");
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

// M05 authentication is not implemented yet; these controls document the planned public header.
loginButton.addEventListener("click", () => {
  window.location.href = "/login";
});
registerButton.addEventListener("click", () => {
  window.location.href = "/register";
});
profileButton.addEventListener("click", () => showMessage("Profile will be available in Module M06."));

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
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

  searchInput.value = query;
  window.history.pushState({}, "", `/search?q=${encodeURIComponent(query)}`);
  renderRoute();
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
  renderRoute();
});

restoreTheme();
if (!window.matchMedia("(max-width: 800px)").matches) {
  setSidebarCollapsed(true);
}

renderRoute();
