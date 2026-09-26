import "./styles/main.css";

const themeToggle = document.querySelector("#theme-toggle");
const toast = document.querySelector("#toast");
const toastTrigger = document.querySelector("#toast-trigger");

function setTheme(isLight) {
  document.documentElement.toggleAttribute("data-theme", isLight);
  themeToggle.setAttribute("aria-pressed", String(isLight));
  themeToggle.textContent = isLight ? "Use dark theme" : "Use light theme";
}

function showToast() {
  toast.classList.add("toast-visible");
  window.setTimeout(() => toast.classList.remove("toast-visible"), 2600);
}

themeToggle.addEventListener("click", () => {
  setTheme(!document.documentElement.hasAttribute("data-theme"));
});

toastTrigger.addEventListener("click", showToast);
