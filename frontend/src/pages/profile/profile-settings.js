import { profileService } from "../../profile/profile-service.js";
import { escapeHtml } from "../../utils/escape-html.js";

function formMarkup(profile) {
  return `
    <section class="profile-page" aria-labelledby="settings-title">
      <div class="profile-heading">
        <div>
          <p class="eyebrow">Settings</p>
          <h1 id="settings-title">Edit your profile.</h1>
          <p class="muted">Keep the details that shape your Mosaic identity up to date.</p>
        </div>
        <a class="button button-ghost" href="/profile">Cancel</a>
      </div>
      <form class="profile-form" id="profile-form">
        <label>Username
          <input name="username" required minlength="3" maxlength="24" pattern="[a-z0-9_]+" value="${escapeHtml(profile.username)}" autocomplete="username">
          <span class="field-help">3–24 lowercase letters, numbers, or underscores.</span>
        </label>
        <label>Display name
          <input name="display_name" required maxlength="60" value="${escapeHtml(profile.display_name)}">
        </label>
        <label>Bio
          <textarea name="bio" maxlength="300" rows="5">${escapeHtml(profile.bio)}</textarea>
          <span class="field-help"><span data-bio-count>${profile.bio.length}</span>/300 characters</span>
        </label>
        <label>Avatar URL <span class="muted">(optional)</span>
          <input name="avatar_url" type="url" placeholder="https://..." value="${escapeHtml(profile.avatar_url ?? "")}">
          <span class="field-help">Use an HTTPS image URL. File uploads arrive in a later module.</span>
        </label>
        <label>Profile visibility
          <select name="visibility">
            <option value="private" ${profile.visibility === "private" ? "selected" : ""}>Private</option>
            <option value="public" ${profile.visibility === "public" ? "selected" : ""}>Public</option>
          </select>
        </label>
        <p class="profile-form-message" id="profile-form-message" role="status" aria-live="polite"></p>
        <button class="button button-primary" type="submit">Save changes</button>
      </form>
    </section>`;
}

export async function renderProfileSettings(container) {
  container.classList.remove("explore-shell");
  container.innerHTML = `<section class="profile-state" aria-live="polite"><p>Loading profile settings...</p></section>`;
  try {
    const profile = await profileService.get();
    container.innerHTML = formMarkup(profile);
    const form = container.querySelector("#profile-form");
    const message = container.querySelector("#profile-form-message");
    const bio = form.elements.bio;
    const counter = form.querySelector("[data-bio-count]");
    bio.addEventListener("input", () => { counter.textContent = bio.value.length; });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = form.querySelector("button[type=submit]");
      const data = new FormData(form);
      const avatarURL = data.get("avatar_url").trim();
      button.disabled = true;
      message.textContent = "Saving...";
      try {
        await profileService.update({
          username: data.get("username"),
          display_name: data.get("display_name"),
          bio: data.get("bio"),
          avatar_url: avatarURL || null,
          visibility: data.get("visibility")
        });
        message.textContent = "Profile saved.";
      } catch (error) {
        message.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  } catch (error) {
    container.innerHTML = `
      <section class="profile-state" role="alert">
        <h1>Settings unavailable</h1>
        <p class="muted">${escapeHtml(error.message)}</p>
        <button class="button button-primary" type="button" data-profile-retry>Try again</button>
      </section>`;
    container.querySelector("[data-profile-retry]").addEventListener("click", () => renderProfileSettings(container));
  }
}
