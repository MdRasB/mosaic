const themeToggle = document.querySelector("#theme-toggle");
const appShell = document.querySelector(".app-shell");
const toast = document.querySelector("#toast");
const toastTrigger = document.querySelector("#toast-trigger");
const sidebar = document.querySelector("#sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const modal = document.querySelector("#demo-modal");
const openModalButton = document.querySelector("#open-modal");
const closeModalButton = document.querySelector("#close-modal");
const cancelModalButton = document.querySelector("#cancel-modal");
const confirmModalButton = document.querySelector("#confirm-modal");
const loadingState = document.querySelector("#loading-state");
const loginButton = document.querySelector("#login-button");
const registerButton = document.querySelector("#register-button");
const profileButton = document.querySelector("#profile-button");
const navLinks = document.querySelectorAll(".nav-link-disabled");
const searchInput = document.querySelector("#demo-search");
const mediaTypeSelect = document.querySelector("#demo-select");
const applyFiltersButton = document.querySelector("#apply-filters");
const clearFiltersButton = document.querySelector("#clear-filters");
const themeStorageKey = "mosaic-theme";

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

function closeModal() {
  modal.close();
}

function restoreTheme() {
  const savedTheme = window.localStorage.getItem(themeStorageKey);
  setTheme(savedTheme === "light", { persist: false });
}

themeToggle.addEventListener("click", () => {
  setTheme(!document.documentElement.hasAttribute("data-theme"));
});

toastTrigger.addEventListener("click", showToast);

sidebarToggle.addEventListener("click", () => {
  if (window.matchMedia("(max-width: 800px)").matches) {
    const isOpen = sidebar.classList.toggle("sidebar-mobile-open");
    sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    sidebarToggle.setAttribute("aria-label", isOpen ? "Close sidebar" : "Open sidebar");
    return;
  }

  const isCollapsed = sidebar.classList.toggle("sidebar-collapsed");
  appShell.classList.toggle("sidebar-is-collapsed", isCollapsed);
  sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
  sidebarToggle.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
});

openModalButton.addEventListener("click", () => modal.showModal());
closeModalButton.addEventListener("click", closeModal);
cancelModalButton.addEventListener("click", closeModal);
confirmModalButton.addEventListener("click", () => {
  closeModal();
  showMessage("Added to your collection.");
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

// Keep the loading example interactive without introducing a data layer in M01.
document.querySelector("#show-loading").addEventListener("click", () => {
  loadingState.classList.add("is-visible");
  window.setTimeout(() => loadingState.classList.remove("is-visible"), 1500);
  showMessage("Loading state preview complete.");
});

applyFiltersButton.addEventListener("click", () => {
  const selectedType = mediaTypeSelect.value;
  const searchTerm = searchInput.value.trim();
  const filterDescription = searchTerm || selectedType === "All media"
    ? `${searchTerm || "All media"} · ${selectedType}`
    : selectedType;

  showMessage(`Filters applied: ${filterDescription}`);
});

clearFiltersButton.addEventListener("click", () => {
  searchInput.value = "";
  mediaTypeSelect.value = "All media";
  showMessage("Filters cleared.");
});

// M05 authentication is not implemented yet; these controls document the planned public header.
loginButton.addEventListener("click", () => showMessage("Login will be available in Module M05."));
registerButton.addEventListener("click", () => showMessage("Registration will be available in Module M05."));
profileButton.addEventListener("click", () => showMessage("Profile will be available in Module M06."));

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showMessage("This navigation item is reserved for a future module.");
  });
});

restoreTheme();
