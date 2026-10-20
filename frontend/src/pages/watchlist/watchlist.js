import { imageUrl } from "../../api/tmdb.js";
import { watchlistService } from "../../watchlist/watchlist-service.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { renderStatusSelect } from "../../components/status-select/status-select.js";
import { STATUS_OPTIONS as statuses, statusLabel } from "../../status/status-config.js";

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
    : "Date unavailable";
}

function typeLabel(value) {
  return value === "tv" ? "TV Show" : "Movie";
}

function mediaCard(item) {
  const media = item.media;
  const poster = media.poster_path ? imageUrl(media.poster_path, "w342") : "";
  const title = escapeHtml(media.title);
  const current = item.status ?? "watchlist";
  return `
    <article class="watchlist-card">
      <a href="/media/${media.media_type}/${encodeURIComponent(media.provider_media_id)}" class="watchlist-card-link">
        <div class="watchlist-card-poster">
          ${poster ? `<img src="${poster}" alt="${title} poster" loading="lazy">` : `<span>No poster</span>`}
        </div>
        <div class="watchlist-card-content">
          <h2>${title}</h2>
          <p>${typeLabel(media.media_type)}</p>
          <small>Added ${escapeHtml(formatDate(item.created_at))}</small>
        </div>
      </a>
      <div class="watchlist-card-actions">
        <label class="watchlist-status">
          <span class="watchlist-status-label">Status</span>
          <select data-status-id="${item.id}" aria-label="Status for ${title}">
            ${statuses.map(([status, label]) => `<option value="${status}" ${status === current ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <button class="button button-ghost watchlist-history" type="button" data-history-id="${item.id}">History</button>
        <button class="button button-ghost watchlist-remove" type="button" data-remove-id="${item.id}">Remove</button>
      </div>
    </article>`;
}

function emptyMarkup(filters) {
  const filtering = filters.type !== "all" || filters.status !== "all";
  return `<div class="watchlist-state">
    <h2>${filtering ? "Nothing matches these filters." : "Your watchlist is empty."}</h2>
    <p>${filtering ? "Try a different type or status." : "Open a movie or TV show and add it to your watchlist."}</p>
    <a class="button button-primary" href="/explore">Explore titles</a>
  </div>`;
}

function pageMarkup(filters) {
  const typeTabs = ["all", "movie", "tv"]
    .map((type) => `<a class="button ${filters.type === type ? "button-primary" : "button-ghost"}"
      href="/watchlist?type=${type}&status=${filters.status}&sort=${filters.sort}">${type === "all" ? "All" : type === "movie" ? "Movies" : "TV Shows"}</a>`)
    .join("");
  return `
    <section class="watchlist-page" aria-labelledby="watchlist-title">
      <div class="watchlist-heading">
        <div>
          <p class="eyebrow">Library</p>
          <h1 id="watchlist-title">My Watchlist</h1>
          <p class="muted">What you plan to watch next, and how far you got.</p>
        </div>
        <a class="button button-ghost" href="/collection">View collection</a>
      </div>
      <div class="watchlist-toolbar">
        <div class="watchlist-tabs" role="tablist" aria-label="Filter by type">${typeTabs}</div>
        <div class="watchlist-controls">
          <label class="watchlist-status">Status
            <select data-watchlist-status-filter aria-label="Filter by status">
              <option value="all" ${filters.status === "all" ? "selected" : ""}>All statuses</option>
              ${statuses.map(([status, label]) => `<option value="${status}" ${filters.status === status ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
          <label class="watchlist-sort">Sort
            <select data-watchlist-sort>
              <option value="recent" ${filters.sort === "recent" ? "selected" : ""}>Recently added</option>
              <option value="oldest" ${filters.sort === "oldest" ? "selected" : ""}>Oldest added</option>
              <option value="title" ${filters.sort === "title" ? "selected" : ""}>Title</option>
            </select>
          </label>
        </div>
      </div>
      <p class="watchlist-count muted" data-watchlist-count>Loading your watchlist…</p>
      <div class="watchlist-grid" data-watchlist-grid></div>
      <p class="profile-form-message" data-watchlist-message role="status" aria-live="polite"></p>
      <button class="button button-ghost watchlist-load-more" type="button" data-load-more hidden>Load more</button>
    </section>`;
}

export async function renderWatchlistPage(container) {
  const params = new URLSearchParams(window.location.search);
  const filters = {
    type: ["all", "movie", "tv"].includes(params.get("type")) ? params.get("type") : "all",
    status: ["all", ...statuses.map(([status]) => status)].includes(params.get("status")) ? params.get("status") : "all",
    sort: ["recent", "oldest", "title"].includes(params.get("sort")) ? params.get("sort") : "recent",
    offset: 0,
    limit: 20
  };
  container.classList.remove("explore-shell");
  container.innerHTML = pageMarkup(filters);
  const grid = container.querySelector("[data-watchlist-grid]");
  const count = container.querySelector("[data-watchlist-count]");
  const message = container.querySelector("[data-watchlist-message]");
  const loadMore = container.querySelector("[data-load-more]");
  const sort = container.querySelector("[data-watchlist-sort]");
  const statusFilter = container.querySelector("[data-watchlist-status-filter]");
  let items = [];
  let total = 0;

  function applyFilters() {
    window.history.pushState({}, "", `/watchlist?type=${filters.type}&status=${filters.status}&sort=${filters.sort}`);
    renderWatchlistPage(container);
  }

  sort.addEventListener("change", () => {
    filters.sort = sort.value;
    applyFilters();
  });

  statusFilter.addEventListener("change", () => {
    filters.status = statusFilter.value;
    applyFilters();
  });

  function paint() {
    grid.innerHTML = items.length ? items.map(mediaCard).join("") : emptyMarkup(filters);
    container.querySelectorAll("[data-status-id]").forEach((select) => {
      const item = items.find((entry) => String(entry.id) === select.dataset.statusId);
      renderStatusSelect(select, item?.status ?? "watchlist");
    });
    bindActions();
  }

  function refreshCount() {
    const suffix = total === 1 ? "" : "s";
    count.textContent = filters.status === "all"
      ? `${total} title${suffix} on your watchlist`
      : `${total} title${suffix} marked ${statusLabel(filters.status).toLowerCase()}`;
  }

  async function load(reset = true) {
    if (reset) {
      filters.offset = 0;
      items = [];
      grid.innerHTML = `<div class="watchlist-state"><span class="spinner"></span><p>Loading your watchlist…</p></div>`;
    }
    try {
      const result = await watchlistService.list(filters);
      items = reset ? result.items : [...items, ...result.items];
      total = result.pagination.total;
      refreshCount();
      paint();
      loadMore.hidden = !result.pagination.has_more;
    } catch (error) {
      count.textContent = "";
      grid.innerHTML = `<div class="watchlist-state"><h2>We could not load your watchlist.</h2><p>${escapeHtml(error.message)}</p><button class="button button-primary" type="button" data-retry>Try again</button></div>`;
      grid.querySelector("[data-retry]").addEventListener("click", () => load(true), { once: true });
      loadMore.hidden = true;
    }
  }

  function bindActions() {
    container.querySelectorAll("[data-status-id]").forEach((select) => {
      select.addEventListener("change", async () => {
      const currentItem = items.find((entry) => String(entry.id) === select.dataset.statusId);
      const previous = currentItem?.status ?? "watchlist";
      select.disabled = true;
      try {
        const updated = await watchlistService.setStatus(select.dataset.statusId, select.value);
        message.textContent = `“${updated.media.title}” is now ${statusLabel(updated.status).toLowerCase()}.`;
        await load(true);
      } catch (error) {
        select.value = previous;
        message.textContent = error.message;
        select.disabled = false;
      }
    });
    });
    container.querySelectorAll("[data-history-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const result = await watchlistService.history(button.dataset.historyId);
        const item = items.find((entry) => String(entry.id) === button.dataset.historyId);
        const history = result.items.length
          ? result.items.map((entry) => `${entry.previous_status ? statusLabel(entry.previous_status) : "Not tracking"} → ${statusLabel(entry.new_status)}`).join(" · ")
          : "No status changes recorded yet.";
        message.textContent = item ? `${item.media.title}: ${history}` : history;
      } catch (error) {
        message.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    });
    container.querySelectorAll("[data-remove-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await watchlistService.remove(button.dataset.removeId);
          items = items.filter((entry) => String(entry.id) !== button.dataset.removeId);
          total = Math.max(0, total - 1);
          refreshCount();
          message.textContent = "Removed from your watchlist.";
          paint();
        } catch (error) {
          message.textContent = error.message;
          button.disabled = false;
        }
      });
    });
  }

  loadMore.addEventListener("click", () => {
    filters.offset += filters.limit;
    load(false);
  });

  await load();
}