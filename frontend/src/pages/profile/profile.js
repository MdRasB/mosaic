import { profileService } from "../../profile/profile-service.js";
import { escapeHtml } from "../../utils/escape-html.js";

function initials(profile) {
  return (profile.display_name || profile.username)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarMarkup(profile) {
  if (profile.avatar_url) {
    return `<img class="profile-avatar-image" src="${escapeHtml(profile.avatar_url)}" alt="" data-profile-avatar>`;
  }
  return `<span class="profile-avatar-fallback" aria-hidden="true">${escapeHtml(initials(profile))}</span>`;
}

function profileMarkup(profile) {
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
  return `
    <section class="profile-page" aria-labelledby="profile-title">
      <div class="profile-heading">
        <div>
          <p class="eyebrow">Profile</p>
          <h1 id="profile-title">Your media world.</h1>
          <p class="muted">A compact view of how you show up in Mosaic.</p>
        </div>
        <a class="button button-primary" href="/settings/profile">Edit profile</a>
      </div>
      <article class="profile-card">
        <div class="profile-identity">
          <div class="profile-avatar">${avatarMarkup(profile)}</div>
          <div>
            <h2>${escapeHtml(profile.display_name)}</h2>
            <p class="profile-username">@${escapeHtml(profile.username)}</p>
            <p class="profile-member">Member since ${escapeHtml(joined)}</p>
          </div>
        </div>
        <p class="profile-bio">${profile.bio ? escapeHtml(profile.bio) : "No biography added yet."}</p>
        <div class="profile-visibility">
          <span>Profile visibility</span>
          <span class="badge">${escapeHtml(profile.visibility)}</span>
        </div>
      </article>
    </section>`;
}

export async function renderProfilePage(container) {
  container.classList.remove("explore-shell");
  container.innerHTML = `<section class="profile-state" aria-live="polite"><p>Loading profile...</p></section>`;
  try {
    const profile = await profileService.get();
    container.innerHTML = profileMarkup(profile);
    container.querySelector("[data-profile-avatar]")?.addEventListener("error", (event) => {
      event.currentTarget.replaceWith(
        Object.assign(document.createElement("span"), {
          className: "profile-avatar-fallback",
          textContent: initials(profile)
        })
      );
    });
  } catch (error) {
    container.innerHTML = `
      <section class="profile-state" role="alert">
        <h1>Profile unavailable</h1>
        <p class="muted">${escapeHtml(error.message)}</p>
        <button class="button button-primary" type="button" data-profile-retry>Try again</button>
      </section>`;
    container.querySelector("[data-profile-retry]").addEventListener("click", () => renderProfilePage(container));
  }
}
