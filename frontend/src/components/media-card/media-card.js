import { imageUrl } from "../../api/tmdb.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function getYear(date) {
  return date ? new Date(`${date}T00:00:00`).getFullYear() : "—";
}

export function mediaCard(media) {
  const poster = imageUrl(media.posterPath, "w342");
  const routeType = media.type === "multi" ? "multi" : media.type;
  const title = escapeHtml(media.title);

  return `
    <a class="media-card" href="/media/${routeType}/${media.id}" data-media-card>
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
          <span class="media-rating">★ ${media.rating.toFixed(1)}</span>
        </div>
      </div>
    </a>
  `;
}
