import { imageUrl } from "../../api/tmdb.js";
import { reviewService } from "../../reviews/review-service.js";
import { escapeHtml } from "../../utils/escape-html.js";
import {
  formatReviewDate,
  reviewTypeLabel,
  visibilityLabel
} from "../../components/review/review-card.js";
import { createReviewEditor } from "../../components/review/review-editor.js";

const sorts = [
  ["recent", "Recently updated"],
  ["oldest", "Oldest"],
  ["title", "Title"]
];

const truncate = (value, limit = 220) => {
  const text = value.trim();
  return text.length <= limit ? text : `${text.slice(0, limit).trimEnd()}…`;
};

function myReviewRow(item) {
  const media = item.media;
  const poster = media.poster_path ? imageUrl(media.poster_path, "w92") : "";
  const badges = [
    `<span class="badge">${visibilityLabel(item.visibility)}</span>`,
    item.contains_spoilers ? `<span class="badge">Spoiler</span>` : ""
  ].filter(Boolean).join("");
  const title = escapeHtml(media.title);
  return `
    <article class="my-review-row" data-review-id="${item.id}">
      ${poster ? `<img class="my-review-poster" src="${poster}" alt="">` : ""}
      <div class="my-review-content">
        <header class="my-review-header">
          <h2>${title}</h2>
          <p>${reviewTypeLabel(media.media_type)} · ${badges}</p>
        </header>
        ${item.title ? `<h3>${escapeHtml(item.title)}</h3>` : ""}
        <p class="my-review-excerpt">${escapeHtml(truncate(item.body))}</p>
        <small>Updated ${escapeHtml(formatReviewDate(item.updated_at))}</small>
      </div>
      <div class="my-review-actions">
        <button class="button button-ghost" type="button" data-edit>Edit</button>
        <a class="button button-ghost" href="/media/${media.media_type}/${encodeURIComponent(media.provider_media_id)}">Open title</a>
      </div>
    </article>`;
}

function emptyMarkup(filters) {
  const filtering = filters.type !== "all" || filters.visibility !== "all" || filters.spoilers !== "all";
  return `<div class="reviews-state">
    <h2>${filtering ? "Nothing matches these filters." : "You have not written any reviews yet."}</h2>
    <p>${filtering ? "Try a different filter." : "Open a movie or TV show and share your thoughts."}</p>
    <a class="button button-primary" href="/explore">Explore titles</a>
  </div>`;
}

function pageMarkup(filters) {
  const typeTabs = ["all", "movie", "tv"]
    .map((type) => `<a class="button ${filters.type === type ? "button-primary" : "button-ghost"}"
      href="/reviews?type=${type}&visibility=${filters.visibility}&spoilers=${filters.spoilers}&sort=${filters.sort}">${type === "all" ? "All" : type === "movie" ? "Movies" : "TV Shows"}</a>`)
    .join("");
  const option = (values, current) => values
    .map(([value, label]) => `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`)
    .join("");
  return `
    <section class="reviews-page" aria-labelledby="reviews-title">
      <div class="reviews-heading">
        <div>
          <p class="eyebrow">Library</p>
          <h1 id="reviews-title">My Reviews</h1>
          <p class="muted">What you think about the titles you have watched.</p>
        </div>
        <a class="button button-ghost" href="/ratings">View ratings</a>
      </div>
      <div class="reviews-toolbar">
        <div class="reviews-tabs" role="tablist" aria-label="Filter by type">${typeTabs}</div>
        <div class="reviews-controls">
          <label class="reviews-filter">Visibility
            <select data-visibility>${option([["all", "All"], ["public", "Public"], ["private", "Private"]], filters.visibility)}</select>
          </label>
          <label class="reviews-filter">Spoilers
            <select data-spoilers>${option([["all", "All"], ["spoiler", "Contains spoilers"], ["no_spoiler", "No spoilers"]], filters.spoilers)}</select>
          </label>
          <label class="reviews-filter">Sort
            <select data-sort>${option(sorts, filters.sort)}</select>
          </label>
        </div>
      </div>
      <p class="reviews-count muted" data-reviews-count>Loading your reviews…</p>
      <div class="reviews-list" data-reviews-list></div>
      <p class="profile-form-message" data-reviews-message role="status" aria-live="polite"></p>
      <button class="button button-ghost reviews-load-more" type="button" data-load-more hidden>Load more</button>
    </section>`;
}

export async function renderReviewsPage(container) {
  const params = new URLSearchParams(window.location.search);
  const filters = {
    type: ["all", "movie", "tv"].includes(params.get("type")) ? params.get("type") : "all",
    visibility: ["all", "public", "private"].includes(params.get("visibility")) ? params.get("visibility") : "all",
    spoilers: ["all", "spoiler", "no_spoiler"].includes(params.get("spoilers")) ? params.get("spoilers") : "all",
    sort: sorts.some(([value]) => value === params.get("sort")) ? params.get("sort") : "recent",
    offset: 0,
    limit: 20
  };

  container.classList.remove("explore-shell");
  container.innerHTML = pageMarkup(filters);

  const list = container.querySelector("[data-reviews-list]");
  const count = container.querySelector("[data-reviews-count]");
  const message = container.querySelector("[data-reviews-message]");
  const loadMore = container.querySelector("[data-load-more]");
  const sort = container.querySelector("[data-sort]");
  const visibilityFilter = container.querySelector("[data-visibility]");
  const spoilersFilter = container.querySelector("[data-spoilers]");
  let items = [];
  let total = 0;

  function applyFilters() {
    window.history.pushState({}, "",
      `/reviews?type=${filters.type}&visibility=${filters.visibility}&spoilers=${filters.spoilers}&sort=${filters.sort}`);
    renderReviewsPage(container);
  }

  sort.addEventListener("change", () => {
    filters.sort = sort.value;
    applyFilters();
  });
  visibilityFilter.addEventListener("change", () => {
    filters.visibility = visibilityFilter.value;
    applyFilters();
  });
  spoilersFilter.addEventListener("change", () => {
    filters.spoilers = spoilersFilter.value;
    applyFilters();
  });

  function refreshCount() {
    const suffix = total === 1 ? "" : "s";
    count.textContent = `${total} review${suffix}`;
  }

  function paint() {
    list.innerHTML = items.length ? items.map(myReviewRow).join("") : emptyMarkup(filters);
    bindEditButtons();
  }

  function bindEditButtons() {
    list.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const row = button.closest("[data-review-id]");
        const item = items.find((entry) => entry.id === Number(row.dataset.reviewId));
        if (!item) return;
        startEditing(row, item);
      });
    });
  }

  // Inline edit: the row is swapped for the same editor used on Media Details.
  function startEditing(row, item) {
    const holder = document.createElement("div");
    holder.className = "my-review-edit";
    const editor = createReviewEditor({
      media: item.media,
      review: item,
      onSaved: (saved) => {
        items = items.map((entry) => (entry.id === saved.id ? saved : entry));
        paint();
      },
      onDeleted: () => {
        items = items.filter((entry) => entry.id !== item.id);
        total = Math.max(0, total - 1);
        refreshCount();
        paint();
      }
    });
    const cancel = document.createElement("button");
    cancel.className = "button button-ghost";
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", paint);
    holder.append(editor.element, cancel);
    row.replaceWith(holder);
    message.textContent = "";
  }

  async function load(reset = true) {
    if (reset) {
      filters.offset = 0;
      items = [];
      list.innerHTML = `<div class="reviews-state"><span class="spinner"></span><p>Loading your reviews…</p></div>`;
    }
    try {
      const result = await reviewService.listMine(filters);
      items = reset ? result.items : [...items, ...result.items];
      total = result.pagination.total;
      refreshCount();
      paint();
      loadMore.hidden = !result.pagination.has_more;
    } catch (error) {
      count.textContent = "";
      list.innerHTML = `<div class="reviews-state"><h2>We could not load your reviews.</h2><p>${escapeHtml(error.message)}</p><button class="button button-primary" type="button" data-retry>Try again</button></div>`;
      list.querySelector("[data-retry]").addEventListener("click", () => load(true), { once: true });
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
