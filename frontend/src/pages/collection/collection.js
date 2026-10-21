import { imageUrl } from "../../api/tmdb.js";
import { collectionService } from "../../collection/collection-service.js";
import { readCached } from "../../api/query-cache.js";
import { escapeHtml } from "../../utils/escape-html.js";

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
    : "Date unavailable";
}

function mediaCard(item, favoritePage) {
  const media = item.media;
  const poster = media.poster_path ? imageUrl(media.poster_path, "w342") : "";
  const title = escapeHtml(media.title);
  const type = media.media_type === "tv" ? "TV Show" : "Movie";
  return `
    <article class="collection-card">
      <a href="/media/${media.media_type}/${encodeURIComponent(media.provider_media_id)}" class="collection-card-link">
        <div class="collection-card-poster">
          ${poster ? `<img src="${poster}" alt="${title} poster" loading="lazy">` : `<span>No poster</span>`}
        </div>
        <div class="collection-card-content">
          <h2>${title}</h2>
          <p>${type}</p>
          <small>Added ${escapeHtml(formatDate(item.created_at))}</small>
        </div>
      </a>
      <div class="collection-card-actions">
        <button class="icon-button collection-favorite ${item.is_favorite ? "is-favorite" : ""}" type="button"
          data-favorite-id="${item.id}" aria-pressed="${item.is_favorite}"
          aria-label="${item.is_favorite ? "Remove" : "Add"} ${title} ${favoritePage ? "from" : "to"} favorites">
          ${item.is_favorite ? "♥" : "♡"}
        </button>
        ${favoritePage ? "" : `<button class="button button-ghost collection-remove" type="button" data-remove-id="${item.id}">Remove</button>`}
      </div>
    </article>`;
}

function pageMarkup(favoritePage, filters) {
  const title = favoritePage ? "My Favorites" : "My Collection";
  return `
    <section class="collection-page" aria-labelledby="collection-title">
      <div class="collection-heading">
        <div><p class="eyebrow">${favoritePage ? "Curated" : "Library"}</p><h1 id="collection-title">${title}</h1>
        <p class="muted">${favoritePage ? "The titles you want close." : "Everything you have saved in one place."}</p></div>
        <a class="button button-ghost" href="${favoritePage ? "/collection" : "/favorites"}">${favoritePage ? "View collection" : "View favorites"}</a>
      </div>
      <div class="collection-toolbar">
        <div class="collection-tabs" role="tablist" aria-label="Filter by type">
          ${["all", "movie", "tv"].map((type) => `<button class="button ${filters.type === type ? "button-primary" : "button-ghost"}" type="button" data-collection-type="${type}" aria-pressed="${filters.type === type}">${type === "all" ? "All" : type === "movie" ? "Movies" : "TV Shows"}</button>`).join("")}
        </div>
        <label class="collection-sort">Sort
          <select data-collection-sort>
            ${favoritePage ? `<option value="recent" ${filters.sort === "recent" ? "selected" : ""}>Recently favorited</option>` : ""}
            <option value="recent" ${filters.sort === "recent" ? "selected" : ""}>Recently added</option>
            <option value="oldest" ${filters.sort === "oldest" ? "selected" : ""}>Oldest added</option>
            <option value="title" ${filters.sort === "title" ? "selected" : ""}>Title</option>
          </select>
        </label>
      </div>
      <p class="collection-count muted" data-collection-count></p>
      <div class="collection-grid" data-collection-grid></div>
      <p class="profile-form-message" data-collection-message role="status" aria-live="polite"></p>
      <button class="button button-ghost collection-load-more" type="button" data-load-more hidden>Load more</button>
    </section>`;
}

export async function renderCollectionPage(container, { favoritePage = false } = {}) {
  const params = new URLSearchParams(window.location.search);
  const filters = {
    type: ["all", "movie", "tv"].includes(params.get("type")) ? params.get("type") : "all",
    sort: ["recent", "oldest", "title"].includes(params.get("sort")) ? params.get("sort") : "recent",
    offset: 0,
    limit: 50
  };
  container.classList.remove("explore-shell");
  container.innerHTML = pageMarkup(favoritePage, filters);
  const grid = container.querySelector("[data-collection-grid]");
  const count = container.querySelector("[data-collection-count]");
  const message = container.querySelector("[data-collection-message]");
  const loadMore = container.querySelector("[data-load-more]");
  const sort = container.querySelector("[data-collection-sort]");
  let items = [];
  let result;

  sort.addEventListener("change", () => {
    filters.sort = sort.value;
    updateURL();
    renderItems();
  });

  function updateURL() {
    const url = favoritePage ? "/favorites" : "/collection";
    window.history.replaceState({}, "", `${url}?type=${filters.type}&sort=${filters.sort}`);
  }

  function visibleItems() {
    const filtered = filters.type === "all"
      ? items
      : items.filter((item) => item.media.media_type === filters.type);
    return [...filtered].sort((left, right) => {
      if (filters.sort === "title") return left.media.title.localeCompare(right.media.title);
      const leftDate = new Date(favoritePage ? left.favorited_at ?? left.created_at : left.created_at).getTime();
      const rightDate = new Date(favoritePage ? right.favorited_at ?? right.created_at : right.created_at).getTime();
      return filters.sort === "oldest" ? leftDate - rightDate : rightDate - leftDate;
    });
  }

  function renderItems() {
    const visible = visibleItems();
    count.textContent = `${visible.length} saved title${visible.length === 1 ? "" : "s"}`;
    grid.innerHTML = visible.length
      ? visible.map((item) => mediaCard(item, favoritePage)).join("")
      : `<div class="collection-state"><h2>${favoritePage ? "No favorites yet." : "Your collection is empty."}</h2><p>${favoritePage ? "Use the heart on a title to save a favorite." : "Explore a movie or TV show and add it to your collection."}</p><a class="button button-primary" href="/explore">Explore titles</a></div>`;
    loadMore.hidden = !result?.pagination.has_more;
    container.querySelectorAll("[data-collection-type]").forEach((button) => {
      const active = button.dataset.collectionType === filters.type;
      button.classList.toggle("button-primary", active);
      button.classList.toggle("button-ghost", !active);
      button.setAttribute("aria-pressed", String(active));
    });
    bindActions();
  }

  function bindFilterActions() {
    container.querySelectorAll("[data-collection-type]").forEach((button) => {
      button.addEventListener("click", () => {
        filters.type = button.dataset.collectionType;
        updateURL();
        renderItems();
      });
    });
  }

  async function load(reset = true) {
    if (reset) {
      filters.offset = 0;
      items = [];
      const cached = readCached(collectionService.listCacheKey(favoritePage, {
        type: "all",
        sort: "recent",
        limit: filters.limit,
        offset: 0
      }));
      if (!cached) {
        grid.innerHTML = `<div class="collection-state"><span class="spinner"></span><p>Loading your titles…</p></div>`;
      }
    }
    try {
      result = favoritePage
        ? await collectionService.listFavorites({ ...filters, type: "all", sort: "recent" })
        : await collectionService.list({ ...filters, type: "all", sort: "recent" });
      items = reset ? result.items : [...items, ...result.items];
      renderItems();
    } catch (error) {
      count.textContent = "";
      grid.innerHTML = `<div class="collection-state"><h2>We could not load this page.</h2><p>${escapeHtml(error.message)}</p><button class="button button-primary" type="button" data-retry>Try again</button></div>`;
      grid.querySelector("[data-retry]").addEventListener("click", () => load(true), { once: true });
      loadMore.hidden = true;
    }
  }

  async function bindActions() {
    container.querySelectorAll("[data-favorite-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        const item = items.find((entry) => String(entry.id) === button.dataset.favoriteId);
        try {
          const updated = item.is_favorite
            ? await collectionService.unfavorite(item.id)
            : await collectionService.favorite(item.id);
          if (favoritePage && !updated.is_favorite) {
            items = items.filter((entry) => entry.id !== updated.id);
          } else {
            items = items.map((entry) => entry.id === updated.id ? updated : entry);
          }
          grid.innerHTML = items.length ? items.map((entry) => mediaCard(entry, favoritePage)).join("") : `<div class="collection-state"><h2>No favorites yet.</h2><p>Use the heart on a title to save a favorite.</p></div>`;
          bindActions();
        } catch (error) {
          message.textContent = error.message;
          button.disabled = false;
        }
      });
    });
    container.querySelectorAll("[data-remove-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await collectionService.remove(button.dataset.removeId);
          items = items.filter((item) => String(item.id) !== button.dataset.removeId);
          grid.innerHTML = items.length ? items.map((item) => mediaCard(item, favoritePage)).join("") : `<div class="collection-state"><h2>Your collection is empty.</h2><p>Explore a title and add it to your collection.</p></div>`;
          bindActions();
        } catch (error) {
          message.textContent = error.message;
          button.disabled = false;
        }
      });
    });
  }
  loadMore.addEventListener("click", () => { filters.offset += filters.limit; load(false); });
  bindFilterActions();
  await load();
}
