import { mediaCard } from "../media-card/media-card.js";

export function loadingCards(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="media-card media-card-skeleton" aria-hidden="true">
      <div class="skeleton-poster"></div>
      <div class="skeleton-line skeleton-line-title"></div>
      <div class="skeleton-line"></div>
    </div>
  `).join("");
}

export function mediaRow(items) {
  return items.map(mediaCard).join("");
}
