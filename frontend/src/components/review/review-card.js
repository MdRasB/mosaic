import { escapeHtml } from "../../utils/escape-html.js";

export function formatReviewDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
    : "Date unavailable";
}

export function reviewTypeLabel(mediaType) {
  return mediaType === "tv" ? "TV Show" : "Movie";
}

export function visibilityLabel(visibility) {
  return visibility === "public" ? "Public" : "Private";
}

function authorMarkup(review) {
  const name = review.author?.display_name ?? "Mosaic User";
  const initials = name.trim().slice(0, 2).toUpperCase() || "MU";
  const avatar = review.author?.avatar_url
    ? `<img src="${escapeHtml(review.author.avatar_url)}" alt="" loading="lazy">`
    : `<span aria-hidden="true">${escapeHtml(initials)}</span>`;
  return `<span class="review-avatar">${avatar}</span><span class="review-author">${escapeHtml(name)}</span>`;
}

/**
 * Markup for one review card.
 *
 * The body is always inserted as escaped text, and a spoiler review keeps its
 * text concealed until the reader chooses to reveal it. Concealment is a
 * courtesy, not a security boundary: the text is already in the payload.
 */
export function reviewCard(review) {
  const spoiler = Boolean(review.contains_spoilers);
  return `
    <article class="review-card">
      <header class="review-card-header">
        <span class="review-byline">${authorMarkup(review)}</span>
        <span class="review-card-date">${escapeHtml(formatReviewDate(review.updated_at))}</span>
      </header>
      ${review.title ? `<h3 class="review-card-title">${escapeHtml(review.title)}</h3>` : ""}
      <div class="review-card-body-wrap ${spoiler ? "is-concealed" : ""}" data-spoiler-wrap>
        ${spoiler ? `<p class="review-spoiler-note"><span class="badge badge-accent">Spoiler</span> This review discusses plot details.</p>` : ""}
        <p class="review-card-body" data-spoiler-body>${escapeHtml(review.body)}</p>
        ${spoiler ? `<button class="button button-ghost review-reveal" type="button" data-reveal-spoiler>Reveal spoiler</button>` : ""}
      </div>
    </article>`;
}

// Binds the reveal control. Called after each paint so re-rendered cards keep
// working without stacking duplicate listeners on detached nodes.
export function bindSpoilerReveals(container) {
  container.querySelectorAll("[data-reveal-spoiler]").forEach((button) => {
    button.addEventListener("click", () => {
      const wrap = button.closest("[data-spoiler-wrap]");
      if (!wrap) return;
      const concealed = wrap.classList.toggle("is-concealed");
      button.textContent = concealed ? "Reveal spoiler" : "Hide spoiler";
    });
  });
}
