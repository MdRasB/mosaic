import { imageUrl } from "../../api/tmdb.js";
import { ratingService } from "../../ratings/rating-service.js";
import { escapeHtml } from "../../utils/escape-html.js";

const sorts = [
  ["recent", "Recently rated"],
  ["highest", "Highest rated"],
  ["lowest", "Lowest rated"],
  ["title", "Title"]
];

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
    : "Date unavailable";
}

function formatRating(value) {
  return typeof value === "number" ? `${value.toFixed(1)} / 10` : "Not rated";
}

function typeLabel(value) {
  return value === "tv" ? "TV Show" : "Movie";
}

function ratingCard(item) {
  const media = item.media;
  const poster = media.poster_path ? imageUrl(media.poster_path, "w342") : "";
  const title = escapeHtml(media.title);
  return `
    <article class="ratings-card">
      <a class="ratings-card-link" href="/media/${media.media_type}/${encodeURIComponent(media.provider_media_id)}">
        <div class="ratings-card-poster">
          ${poster ? `<img src="${poster}" alt="${title} poster" loading="lazy">` : `<span>No poster</span>`}
        </div>
        <div class="ratings-card-content">
          <h2>${title}</h2>
          <p>${typeLabel(media.media_type)}</p>
          <p class="ratings-card-score">${formatRating(item.rating)}</p>
          <small>Rated ${escapeHtml(formatDate(item.rated_at))}</small>
        </div>
      </a>
    </article>`;
}

function emptyMarkup(filters) {
  const filtering = filters.type !== "all";
  return `<div class="ratings-state">
    <h2>${filtering ? "Nothing matches this filter." : "You have not rated anything yet."}</h2>
    <p>${filtering ? "Try a different media type." : "Open a movie or TV show and give it a score."}</p>
    <a class="button button-primary" href="/explore">Explore titles</a>
  </div>`;
}

function pageMarkup(filters) {
  const typeTabs = ["all", "movie", "tv"]
    .map((type) => `<a class="button ${filters.type === type ? "button-primary" : "button-ghost"}"
      href="/ratings?type=${type}&sort=${filters.sort}">${type === "all" ? "All" : type === "movie" ? "Movies" : "TV Shows"}</a>`)
    .join("");
  const sortOptions = sorts
    .map(([value, label]) => `<option value="${value}" ${filters.sort === value ? "selected" : ""}>${label}</option>`)
    .join("");
  return `
    <section class="ratings-page" aria-labelledby="ratings-title">
      <div class="ratings-heading">
        <div>
          <p class="eyebrow">Library</p>
          <h1 id="ratings-title">My Ratings</h1>
          <p class="muted">Your personal scores, separate from the TMDB rating.</p>
        </div>
        <a class="button button-ghost" href="/collection">View collection</a>
      </div>
      <div class="ratings-toolbar">
        <div class="ratings-tabs" role="tablist" aria-label="Filter by type">${typeTabs}</div>
        <label class="ratings-sort">Sort
          <select data-ratings-sort>${sortOptions}</select>
        </label>
      </div>
      <p class="ratings-count muted" data-ratings-count>Loading your ratings…</p>
      <div class="ratings-grid" data-ratings-grid></div>
      <p class="profile-form-message" data-ratings-message role="status" aria-live="polite"></p>
      <button class="button button-ghost ratings-load-more" type="button" data-load-more hidden>Load more</button>
    </section>`;
}

export async function renderRatingsPage(container) {
  const params = new URLSearchParams(window.location.search);
  const filters = {
    type: ["all", "movie", "tv"].includes(params.get("type")) ? params.get("type") : "all",
    sort: sorts.some(([value]) => value === params.get("sort")) ? params.get("sort") : "recent",
    offset: 0,
    limit: 20
  };

  container.classList.remove("explore-shell");
  container.innerHTML = pageMarkup(filters);

  const grid = container.querySelector("[data-ratings-grid]");
  const count = container.querySelector("[data-ratings-count]");
  const message = container.querySelector("[data-ratings-message]");
  const loadMore = container.querySelector("[data-load-more]");
  const sort = container.querySelector("[data-ratings-sort]");
  let items = [];
  let total = 0;

  sort.addEventListener("change", () => {
    window.history.pushState({}, "", `/ratings?type=${filters.type}&sort=${sort.value}`);
    renderRatingsPage(container);
  });

  function paint() {
    grid.innerHTML = items.length ? items.map(ratingCard).join("") : emptyMarkup(filters);
  }

  function refreshCount() {
    const suffix = total === 1 ? "" : "s";
    count.textContent = `${total} rated title${suffix}`;
  }

  async function load(reset = true) {
    if (reset) {
      filters.offset = 0;
      items = [];
      grid.innerHTML = `<div class="ratings-state"><span class="spinner"></span><p>Loading your ratings…</p></div>`;
    }
    try {
      const result = await ratingService.list(filters);
      items = reset ? result.items : [...items, ...result.items];
      total = result.pagination.total;
      refreshCount();
      paint();
      loadMore.hidden = !result.pagination.has_more;
    } catch (error) {
      count.textContent = "";
      grid.innerHTML = `<div class="ratings-state"><h2>We could not load your ratings.</h2><p>${escapeHtml(error.message)}</p><button class="button button-primary" type="button" data-retry>Try again</button></div>`;
      grid.querySelector("[data-retry]").addEventListener("click", () => load(true), { once: true });
      loadMore.hidden = true;
      message.textContent = "";
    }
  }

  loadMore.addEventListener("click", () => {
    filters.offset += filters.limit;
    load(false);
  });

  await load();
}
