import { imageUrl } from "../../api/tmdb.js";
import { escapeHtml } from "../../utils/escape-html.js";

function getYear(date) {
  return date ? new Date(`${date}T00:00:00`).getFullYear() : "—";
}

function formatRating(rating) {
  return rating && rating > 0 ? `★ ${rating.toFixed(1)}` : "NR";
}

export function mediaCard(media) {
  const poster = media.posterUrl || imageUrl(media.posterPath, "w342");
  const routeType = media.type === "multi" ? "multi" : media.type;
  const title = escapeHtml(media.title);

  return `
    <a class="media-card" href="/media/${routeType}/${media.id}" title="${title}" data-media-card>
      <div class="media-card-poster">
        ${poster
          ? `<img src="${poster}" alt="${title} poster" loading="lazy" />`
          : `<span class="media-card-fallback">No poster</span>`}
        <span class="media-card-type">${routeType.toUpperCase()}</span>
      </div>
      <div class="media-card-content">
        <h3>${title}</h3>
        <div class="media-card-meta">
          <span>${getYear(media.releaseDate)}</span>
          <span class="media-rating">${formatRating(media.rating)}</span>
        </div>
      </div>
    </a>
  `;
}
