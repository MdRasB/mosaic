import { profileService } from "../../profile/profile-service.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { avatarInitials, describeAvatarFailure, renderAvatar } from "../../profile/avatar.js";

function profileMarkup(profile) {
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
  return `
    <section class="profile-page" aria-labelledby="profile-title">
      <div class="profile-heading">
        <div>
          <p class="eyebrow">Account</p>
          <h1 id="profile-title">Profile</h1>
          <p class="muted">Your identity in the Mosaic community.</p>
        </div>
        <a class="button button-primary" href="/settings/profile">Edit profile</a>
      </div>
      <article class="profile-card">
        <div class="profile-identity">
          <div class="profile-avatar" data-profile-avatar></div>
          <div>
            <h2>${escapeHtml(profile.display_name)}</h2>
            <p class="profile-username">@${escapeHtml(profile.username)}</p>
            <p class="profile-member">Member since ${escapeHtml(joined)}</p>
          </div>
        </div>
        <p class="profile-bio">${profile.bio ? escapeHtml(profile.bio) : "No biography added yet."}</p>
        <p class="profile-avatar-note" data-avatar-note role="status" hidden></p>
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

    const note = container.querySelector("[data-avatar-note]");
    renderAvatar(container.querySelector("[data-profile-avatar]"), profile.avatar_url, {
      imageClass: "profile-avatar-image",
      fallbackClass: "profile-avatar-fallback",
      initials: avatarInitials(profile),
      onError: () => {
        note.textContent = describeAvatarFailure(profile.avatar_url);
        note.hidden = false;
      }
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
