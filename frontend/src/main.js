import { renderExplorePage } from "./pages/explore/explore.js";

const themeToggle = document.querySelector("#theme-toggle");
const appShell = document.querySelector(".app-shell");
const toast = document.querySelector("#toast");
const sidebar = document.querySelector("#sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const loginButton = document.querySelector("#login-button");
const registerButton = document.querySelector("#register-button");
const profileButton = document.querySelector("#profile-button");
const navLinks = document.querySelectorAll(".nav-link-disabled");
const themeStorageKey = "mosaic-theme";
const content = document.querySelector("#app-content");

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

themeToggle.addEventListener("click", () => {
  setTheme(!document.documentElement.hasAttribute("data-theme"));
});

sidebarToggle.addEventListener("click", () => {
  if (window.matchMedia("(max-width: 800px)").matches) {
    const isOpen = sidebar.classList.toggle("sidebar-mobile-open");
    sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    sidebarToggle.setAttribute("aria-label", isOpen ? "Close sidebar" : "Open sidebar");
    return;
  }

  setSidebarCollapsed(!sidebar.classList.contains("sidebar-collapsed"));
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

restoreTheme();
if (!window.matchMedia("(max-width: 800px)").matches) {
  setSidebarCollapsed(true);
}

if (window.location.pathname === "/" || window.location.pathname === "/explore") {
  renderExplorePage(content);
} else if (window.location.pathname.startsWith("/media/")) {
  renderPlaceholder("Media details are coming in Module M04.");
} else {
  renderPlaceholder("This page is not available yet.");
}
