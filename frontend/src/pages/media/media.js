/**
 * Media Details Page (Module M04)
 * Consumes TMDB details, cast/crew, trailers, recommendations, and watch providers.
 * Integration maintained by: Md. Migdadur Rahman Khan (ID: 46)
 */

import { getCompleteMediaDetails, imageUrl } from "../../api/tmdb.js";
import { emptyState, errorState } from "../../components/empty-state/empty-state.js";
import { loadingCards, mediaRow } from "../../components/media-row/media-row.js";
import { escapeHtml } from "../../utils/escape-html.js";

function renderLoadingShell() {
  return `
    <section class="media-details-page">
      <div class="media-details-hero" style="min-height: 380px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 100%; padding: var(--space-8);">
          ${loadingCards(1)}
        </div>
      </div>
      <div class="media-section-heading">
        <h2>Loading media details...</h2>
      </div>
    </section>
  `;
}

function renderMediaDetailsMarkup({ details, credits, videos, recommendations, watchProviders }) {
  const title = escapeHtml(details.title);
  const tagline = details.tagline ? `<p class="media-tagline">“${escapeHtml(details.tagline)}”</p>` : "";
  const overview = escapeHtml(details.overview);
  const releaseYear = details.releaseYear ? `<span>${details.releaseYear}</span>` : "";
  const runtime = details.runtime ? `<span>• ${escapeHtml(details.runtime)}</span>` : "";
  const rating = details.rating > 0 ? `<span class="media-rating-badge">★ ${details.rating.toFixed(1)}</span>` : "";

  const genrePills = details.genres.length
    ? `<div class="media-genre-pills">
        ${details.genres.map((g) => `<span class="media-genre-pill">${escapeHtml(g)}</span>`).join("")}
       </div>`
    : "";

  const directorsText = credits.directors.length
    ? `<div class="media-crew-line"><strong>${details.type === "tv" ? "Creators / Showrunners:" : "Director:"}</strong> ${escapeHtml(credits.directors.join(", "))}</div>`
    : "";

  // Cast
  const castMarkup = credits.cast.length
    ? `
      <section class="media-cast-section">
        <div class="media-section-heading">
          <h2>Top Cast</h2>
        </div>
        <div class="media-cast-grid">
          ${credits.cast.map((member) => `
            <div class="cast-card">
              ${member.profileUrl
                ? `<img src="${member.profileUrl}" alt="${escapeHtml(member.name)}" loading="lazy" />`
                : `<div class="cast-card-fallback">${escapeHtml(member.name)}</div>`}
              <div class="cast-card-info">
                <span class="cast-name">${escapeHtml(member.name)}</span>
                <span class="cast-character">${escapeHtml(member.character || "")}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `
    : "";

  // Video / Trailer
  const trailerMarkup = videos.trailer
    ? `
      <section class="media-trailer-section">
        <div class="media-section-heading">
          <h2>Official Trailer</h2>
        </div>
        <div class="media-video-container">
          <iframe
            src="${videos.trailer.embedUrl}"
            title="${escapeHtml(videos.trailer.name)}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
      </section>
    `
    : "";

  // Watch Providers
  const hasProviders = watchProviders.stream.length || watchProviders.rent.length || watchProviders.buy.length;
  const providersMarkup = hasProviders
    ? `
      <section class="media-providers-section">
        <div class="media-section-heading">
          <h2>Where to Watch</h2>
        </div>
        <div class="watch-providers-group">
          ${watchProviders.stream.length ? `
            <div class="watch-providers-row">
              <span class="muted" style="min-width: 80px;">Stream:</span>
              ${watchProviders.stream.map((p) => `
                <div class="provider-badge">
                  <img src="${p.logoUrl}" alt="${escapeHtml(p.name)}" />
                  <span>${escapeHtml(p.name)}</span>
                </div>
              `).join("")}
            </div>
          ` : ""}
          ${watchProviders.rent.length ? `
            <div class="watch-providers-row">
              <span class="muted" style="min-width: 80px;">Rent:</span>
              ${watchProviders.rent.map((p) => `
                <div class="provider-badge">
                  <img src="${p.logoUrl}" alt="${escapeHtml(p.name)}" />
                  <span>${escapeHtml(p.name)}</span>
                </div>
              `).join("")}
            </div>
          ` : ""}
          ${watchProviders.buy.length ? `
            <div class="watch-providers-row">
              <span class="muted" style="min-width: 80px;">Buy:</span>
              ${watchProviders.buy.map((p) => `
                <div class="provider-badge">
                  <img src="${p.logoUrl}" alt="${escapeHtml(p.name)}" />
                  <span>${escapeHtml(p.name)}</span>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>
      </section>
    `
    : "";

  // Recommendations
  const recommendationsMarkup = recommendations.length
    ? `
      <section class="media-recommendations-section">
        <div class="media-section-heading">
          <h2>Recommended Titles</h2>
        </div>
        <div class="media-row-shell">
          <div class="media-row">${mediaRow(recommendations)}</div>
        </div>
      </section>
    `
    : "";

  return `
    <article class="media-details-page">
      <div class="media-details-hero">
        ${details.backdropUrl ? `<img class="media-details-backdrop" src="${details.backdropUrl}" alt="" aria-hidden="true" />` : ""}
        <div class="media-details-hero-content">
          <div class="media-details-poster-wrap">
            ${details.posterUrl
              ? `<img class="media-details-poster" src="${details.posterUrl}" alt="${title} poster" />`
              : `<div class="poster-placeholder">${title[0]}</div>`}
          </div>
          <div class="media-details-info">
            <span class="eyebrow">${details.type.toUpperCase()}</span>
            <h1>${title}</h1>
            ${tagline}
            <div class="media-details-meta">
              ${rating}
              ${releaseYear}
              ${runtime}
            </div>
            ${genrePills}
            <p class="media-overview">${overview}</p>
            ${directorsText}
          </div>
        </div>
      </div>

      ${trailerMarkup}
      ${castMarkup}
      ${providersMarkup}
      ${recommendationsMarkup}
    </article>
  `;
}

export async function renderMediaPage(container, type, id) {
  container.mediaRenderToken = Symbol("media-render");
  const renderToken = container.mediaRenderToken;

  container.innerHTML = renderLoadingShell();

  const loadMedia = async () => {
    try {
      const data = await getCompleteMediaDetails(type, id);

      if (container.mediaRenderToken !== renderToken) {
        return;
      }

      container.innerHTML = renderMediaDetailsMarkup(data);
      document.title = `${data.details.title} — Mosaic`;
    } catch (error) {
      if (container.mediaRenderToken !== renderToken) {
        return;
      }

      container.innerHTML = `
        <section class="media-details-page" style="padding: var(--space-6);">
          ${errorState(error?.message || "Could not load media details.", `media-${type}-${id}`)}
        </section>
      `;

      console.error(`Unable to load media details for ${type}/${id}:`, error);

      const retryBtn = container.querySelector(`[data-retry="media-${type}-${id}"]`);
      if (retryBtn) {
        retryBtn.addEventListener("click", () => {
          container.innerHTML = renderLoadingShell();
          loadMedia();
        });
      }
    }
  };

  await loadMedia();
}
