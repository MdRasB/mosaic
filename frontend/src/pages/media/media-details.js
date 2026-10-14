import { getMediaDetails, imageUrl } from "../../api/tmdb.js";
import { errorState } from "../../components/empty-state/empty-state.js";
import { mediaRow } from "../../components/media-row/media-row.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { collectionService } from "../../collection/collection-service.js";

const validTypes = new Set(["movie", "tv"]);

export function parseMediaRoute(pathname) {
  const match = pathname.match(/^\/media\/([^/]+)\/([^/]+)\/?$/);
  if (!match || !validTypes.has(match[1]) || !/^\d+$/.test(match[2])) {
    return null;
  }

  const id = Number(match[2]);
  return Number.isSafeInteger(id) && id > 0 ? { type: match[1], id } : null;
}

function formatDate(date) {
  return date
    ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00`))
    : "Release date unavailable";
}

function formatRuntime(media) {
  const minutes = media.runtime ?? media.episodeRuntime;
  if (minutes) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  if (media.type === "tv" && (media.seasons || media.episodes)) {
    return `${media.seasons ?? "—"} seasons · ${media.episodes ?? "—"} episodes`;
  }
  return "Runtime unavailable";
}

function personMarkup(person) {
  const name = escapeHtml(person.name);
  return `
    <li class="media-person">
      ${person.profileUrl ? `<img src="${person.profileUrl}" alt="" loading="lazy">` : `<span class="media-person-fallback" aria-hidden="true">◎</span>`}
      <span><strong>${name}</strong>${person.character ? `<small>${escapeHtml(person.character)}</small>` : ""}</span>
    </li>
  `;
}

function detailsMarkup(media, currentUser) {
  const title = escapeHtml(media.title);
  const backdrop = imageUrl(media.backdropPath, "w1280");
  const rating = media.rating > 0 ? `★ ${media.rating.toFixed(1)}` : "Not rated";
  const trailer = media.videos[0];
  const providerLink = /^https?:\/\//i.test(media.providerLink) ? media.providerLink : "";

  return `
    <article class="media-details">
      <div class="media-details-hero" style="--details-image: url('${backdrop}')">
        <div class="media-details-hero-overlay"></div>
        <div class="media-details-hero-content">
          <a class="button button-ghost media-details-back" href="/explore">← Back to Explore</a>
          <div class="media-details-heading">
            <div class="media-details-poster">
              ${media.posterUrl ? `<img src="${media.posterUrl}" alt="${title} poster">` : `<span>No poster</span>`}
            </div>
            <div>
              <p class="eyebrow">${media.type === "tv" ? "TV show" : "Movie"}</p>
              <h1>${title}</h1>
              ${media.tagline ? `<p class="media-details-tagline">${escapeHtml(media.tagline)}</p>` : ""}
              <div class="media-details-meta"><span>${formatDate(media.releaseDate)}</span><span>${formatRuntime(media)}</span><span class="rating">${rating}</span></div>
              <div class="media-details-genres">${media.genres.map((genre) => `<span class="badge">${escapeHtml(genre)}</span>`).join("")}</div>
              <div class="media-details-collection-action" data-collection-action>
                ${currentUser
                  ? `<button class="button button-primary" type="button" data-add-collection>Add to Collection</button>
                     <button class="button button-ghost" type="button" data-add-favorite>Add to Favorites</button>
                     <span class="muted" data-collection-status></span>`
                  : `<a class="button button-primary" href="/login?redirect=${encodeURIComponent(window.location.pathname)}">Sign in to save this title</a>`}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="media-details-body">
        <section class="media-details-section" aria-labelledby="overview-title">
          <p class="eyebrow">The story</p>
          <h2 id="overview-title">Overview</h2>
          <p class="media-details-overview">${escapeHtml(media.overview || "No overview is available for this title.")}</p>
        </section>
        ${media.cast.length || media.creators.length ? `
          <section class="media-details-section" aria-labelledby="people-title">
            <p class="eyebrow">People</p><h2 id="people-title">Cast and creators</h2>
            ${media.creators.length ? `<h3>Creators</h3><ul class="media-people">${media.creators.map(personMarkup).join("")}</ul>` : ""}
            ${media.cast.length ? `<h3>Cast</h3><ul class="media-people">${media.cast.map(personMarkup).join("")}</ul>` : ""}
          </section>` : ""}
        ${trailer || media.providers.length ? `
          <section class="media-details-section media-details-links" aria-labelledby="watch-title">
            <p class="eyebrow">Continue watching</p><h2 id="watch-title">Trailer and where to watch</h2>
            <div class="button-row">
              ${trailer ? `<a class="button button-primary" href="https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}" target="_blank" rel="noopener noreferrer">▶ Watch trailer</a>` : ""}
              ${providerLink ? `<a class="button button-ghost" href="${providerLink}" target="_blank" rel="noopener noreferrer">View providers</a>` : ""}
            </div>
            ${media.providers.length ? `<div class="provider-list">${media.providers.map((provider) => `<span class="provider"><img src="${provider.logoUrl}" alt="">${escapeHtml(provider.name)}</span>`).join("")}</div>` : ""}
          </section>` : ""}
        ${media.related.length ? `<section class="media-details-section media-details-related" aria-labelledby="related-title"><p class="eyebrow">Keep exploring</p><h2 id="related-title">More like this</h2><div class="media-row">${mediaRow(media.related)}</div></section>` : ""}
      </div>
    </article>
  `;
}

export async function renderMediaDetailsPage(container, route, currentUser = null) {
  container.exploreRenderCleanup?.();
  container.classList.remove("explore-shell");
  const renderToken = Symbol("media-details-render");
  container.mediaDetailsRenderToken = renderToken;
  container.innerHTML = `<section class="media-details-state"><span class="spinner"></span><p>Loading title details…</p></section>`;

  try {
    const media = await getMediaDetails(route.type, route.id);
    if (container.mediaDetailsRenderToken !== renderToken) return;
    container.innerHTML = detailsMarkup(media, currentUser);
    if (currentUser) bindCollectionActions(container, media);
  } catch (error) {
    if (container.mediaDetailsRenderToken !== renderToken) return;
    container.innerHTML = errorState(
      error.message === "Invalid media route." ? "This media link is not valid." : "We could not load this title.",
      "media-details"
    );
    container.querySelector("[data-retry='media-details']")?.addEventListener("click", () => {
      renderMediaDetailsPage(container, route, currentUser);
    }, { once: true });
    console.error("Unable to load media details.", error);
  }

  function collectionInput(media) {
    return {
      provider: "tmdb",
      media_type: media.type,
      provider_media_id: String(media.id),
      title: media.title,
      poster_path: media.posterPath ? `/${media.posterPath.replace(/^\/+/, "")}` : null,
      release_date: media.releaseDate || null
    };
  }

  async function bindCollectionActions(container, media) {
    const addButton = container.querySelector("[data-add-collection]");
    const favoriteButton = container.querySelector("[data-add-favorite]");
    const status = container.querySelector("[data-collection-status]");
    if (!addButton || !favoriteButton) return;
    try {
      const result = await collectionService.check(collectionInput(media));
      const item = result.item;
      if (item) {
        addButton.textContent = "In Collection";
        addButton.disabled = true;
        favoriteButton.textContent = item.is_favorite ? "Remove from Favorites" : "Add to Favorites";
        favoriteButton.dataset.collectionId = item.id;
        favoriteButton.dataset.favorite = String(item.is_favorite);
      }
    } catch (error) {
      status.textContent = error.message;
    }
    addButton.addEventListener("click", async () => {
      addButton.disabled = true;
      try {
        const item = await collectionService.add(collectionInput(media));
        addButton.textContent = "In Collection";
        favoriteButton.dataset.collectionId = item.id;
        status.textContent = "Saved to your collection.";
      } catch (error) {
        status.textContent = error.message;
        addButton.disabled = false;
      }
    });
    favoriteButton.addEventListener("click", async () => {
      favoriteButton.disabled = true;
      try {
        const item = favoriteButton.dataset.collectionId
          ? (favoriteButton.dataset.favorite === "true"
            ? await collectionService.unfavorite(favoriteButton.dataset.collectionId)
            : await collectionService.favorite(favoriteButton.dataset.collectionId))
          : await collectionService.addAsFavorite(collectionInput(media));
        favoriteButton.dataset.collectionId = item.id;
        favoriteButton.dataset.favorite = String(item.is_favorite);
        favoriteButton.textContent = item.is_favorite ? "Remove from Favorites" : "Add to Favorites";
        addButton.textContent = "In Collection";
        addButton.disabled = true;
        status.textContent = item.is_favorite ? "Added to favorites." : "Removed from favorites.";
      } catch (error) {
        status.textContent = error.message;
      } finally {
        favoriteButton.disabled = false;
      }
    });
  }
}
