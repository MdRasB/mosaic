import { apiPath } from "../api/http.js";

export function avatarInitials(profile, fallback = "MR") {
  const source = (profile?.display_name || profile?.username || "").trim();
  if (!source) return fallback;
  const letters = source.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return letters || fallback;
}

function showInitials(container, initials, fallbackClass) {
  if (!fallbackClass) {
    container.textContent = initials;
    return;
  }
  const fallback = document.createElement("span");
  fallback.className = fallbackClass;
  fallback.setAttribute("aria-hidden", "true");
  fallback.textContent = initials;
  container.replaceChildren(fallback);
}

export function renderAvatar(container, url, options = {}) {
  const { imageClass = "", fallbackClass = "", initials = "MR", onError } = options;

  container.replaceChildren();
  if (!url) {
    showInitials(container, initials, fallbackClass);
    return;
  }

  const image = document.createElement("img");
  if (imageClass) image.className = imageClass;
  image.alt = "";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => {
    showInitials(container, initials, fallbackClass);
    onError?.();
  }, { once: true });
  image.src = url;
  container.append(image);
}

// avatarSource resolves which image to render. An uploaded image wins over a
// pasted URL, and the cache key changes with updated_at so a replaced avatar
// is never served from the browser cache.
export function avatarSource(profile) {
  if (profile?.has_uploaded_avatar) {
    const stamp = profile.updated_at ? `?v=${encodeURIComponent(profile.updated_at)}` : "";
    return apiPath(`/profile/me/avatar${stamp}`);
  }
  return profile?.avatar_url ?? "";
}

export function describeAvatarFailure(value) {
  const source = (value || "").trim();
  if (!source) return "";
  let host = "";
  try {
    host = new URL(source).host;
  } catch {
    return "That is not a valid URL. Paste a full link that starts with https://.";
  }
  return `Nothing loaded from ${host}. Use a direct image link — right-click the image itself and choose "Copy image address", not the Google search page.`;
}