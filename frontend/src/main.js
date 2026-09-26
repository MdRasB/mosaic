const themeToggle = document.querySelector("#theme-toggle");
const toast = document.querySelector("#toast");
const toastTrigger = document.querySelector("#toast-trigger");
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

function restoreTheme() {
  const savedTheme = window.localStorage.getItem(themeStorageKey);
  setTheme(savedTheme === "light", { persist: false });
}

themeToggle.addEventListener("click", () => {
  setTheme(!document.documentElement.hasAttribute("data-theme"));
});

toastTrigger.addEventListener("click", showToast);

applyFiltersButton.addEventListener("click", () => {
  const selectedType = mediaTypeSelect.value;
  const searchTerm = searchInput.value.trim();
  const filterDescription = searchTerm || selectedType === "All media"
    ? `${searchTerm || "All media"} · ${selectedType}`
    : selectedType;

  toast.textContent = `Filters applied: ${filterDescription}`;
  showToast();
});

clearFiltersButton.addEventListener("click", () => {
  searchInput.value = "";
  mediaTypeSelect.value = "All media";
  toast.textContent = "Filters cleared.";
  showToast();
});

restoreTheme();
