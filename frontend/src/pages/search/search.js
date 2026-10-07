import { searchMedia } from "../../api/tmdb.js";
import { emptyState, errorState } from "../../components/empty-state/empty-state.js";
import { loadingCards, mediaRow } from "../../components/media-row/media-row.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { getRecentSearches } from "../../utils/recent-searches.js";

const filters = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV Shows" }
];

const sortOptions = [
  { id: "relevance", label: "Relevance" },
  { id: "rating-desc", label: "Rating: High to Low" },
  { id: "year-desc", label: "Year: Newest first" },
  { id: "year-asc", label: "Year: Oldest first" },
  { id: "title-asc", label: "Title: A–Z" }
];

function normalizeFilter(value) {
  return filters.some((filter) => filter.id === value) ? value : "all";
}

function normalizeSort(value) {
  return sortOptions.some((sort) => sort.id === value) ? value : "relevance";
}

function getVisibleItems(items, filter) {
  return filter === "all" ? items : items.filter((item) => item.type === filter);
}

function sortItems(items, sortBy) {
  const copy = [...items];
  switch (sortBy) {
    case "rating-desc":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "year-desc":
      return copy.sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""));
    case "year-asc":
      return copy.sort((a, b) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate.localeCompare(b.releaseDate);
      });
    case "title-asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return copy;
  }
}

function searchMarkup(query, filter, sortBy) {
  return `
    <section class="search-page" aria-labelledby="search-title">
      <div class="search-page-heading">
        <div>
          <p class="eyebrow">Global search</p>
          <h1 id="search-title">Results for “${escapeHtml(query)}”</h1>
          <p class="search-result-count" id="search-result-count">Searching...</p>
        </div>
      </div>
      <div class="search-controls-bar">
        <div class="search-filters" role="group" aria-label="Filter search results">
          ${filters
            .map(
              ({ id, label }) => `
            <button
              class="button button-ghost search-filter${id === filter ? " is-active" : ""}"
              type="button"
              data-search-filter="${id}"
              aria-pressed="${id === filter}"
            >${label}</button>
          `
            )
            .join("")}
        </div>
        <div class="search-sort-wrapper">
          <label class="search-sort-label" for="search-sort">Sort by</label>
          <select class="search-sort-select" id="search-sort" aria-label="Sort search results">
            ${sortOptions
              .map(
                ({ id, label }) => `
              <option value="${id}"${id === sortBy ? " selected" : ""}>${label}</option>
            `
              )
              .join("")}
          </select>
        </div>
      </div>
      <div class="search-results-grid" id="search-results-grid">${loadingCards(12)}</div>
      <div class="search-page-footer" id="search-page-footer"></div>
    </section>
  `;
}

function updateCount(container, visibleCount, totalCount, filter) {
  const countEl = container.querySelector("#search-result-count");
  if (!countEl) {
    return;
  }

  if (filter === "all") {
    countEl.textContent = `${totalCount} ${totalCount === 1 ? "title" : "titles"} found`;
  } else {
    countEl.textContent = `Showing ${visibleCount} of ${totalCount} ${totalCount === 1 ? "title" : "titles"}`;
  }
}

function renderResults(container, state) {
  const grid = container.querySelector("#search-results-grid");
  const filtered = getVisibleItems(state.items, state.filter);
  const sorted = sortItems(filtered, state.sortBy);

  if (sorted.length) {
    grid.innerHTML = mediaRow(sorted);
  } else {
    const filterLabel =
      state.filter === "movie" ? "movies" : state.filter === "tv" ? "TV shows" : "titles";
    grid.innerHTML = emptyState(`No ${filterLabel} found for “${escapeHtml(state.query)}”.`);
  }

  updateCount(container, sorted.length, state.items.length, state.filter);
}

function renderLoadMore(container, state, loadNextPage) {
  const footer = container.querySelector("#search-page-footer");

  if (state.page >= state.totalPages) {
    footer.innerHTML = "";
    return;
  }

  footer.innerHTML = `
    <button class="button button-secondary" type="button" data-load-more>
      Load more
    </button>
  `;
  footer.querySelector("[data-load-more]").addEventListener("click", loadNextPage);
}

export function renderSearchLanding(container) {
  const recentSearches = getRecentSearches();
  const popularCategories = [
    "Trending",
    "Action",
    "Sci-Fi",
    "Anime",
    "Drama",
    "Comedy",
    "Animation",
    "Thriller",
    "Horror"
  ];

  container.classList.remove("explore-shell");
  container.innerHTML = `
    <section class="search-landing" aria-labelledby="search-landing-title">
      <div class="search-landing-header">
        <p class="eyebrow">Search Catalog</p>
        <h1 id="search-landing-title">Search <span>Your World</span></h1>
        <p>Explore thousands of movies, TV shows, and entertainment across Mosaic.</p>
      </div>

      <form class="search-landing-form" id="search-landing-form" role="search">
        <input
          class="search-landing-input"
          id="search-landing-input"
          type="search"
          placeholder="Search movies, TV shows..."
          aria-label="Search movies and TV shows"
          autocomplete="off"
        />
        <button class="button button-primary" type="submit">Search</button>
      </form>

      ${
        recentSearches.length
          ? `
        <div class="search-landing-section">
          <h2>Recent searches</h2>
          <div class="search-chips">
            ${recentSearches
              .map(
                (term) => `
              <button class="search-chip search-chip-recent" type="button" data-search-chip="${escapeHtml(term)}">
                <span aria-hidden="true">⏱</span>
                <span>${escapeHtml(term)}</span>
              </button>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }

      <div class="search-landing-section">
        <h2>Popular topics</h2>
        <div class="search-chips">
          ${popularCategories
            .map(
              (cat) => `
            <button class="search-chip" type="button" data-search-chip="${cat}">
              ${cat}
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector("#search-landing-form");
  const input = container.querySelector("#search-landing-input");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      return;
    }
    window.history.pushState({}, "", `/search?q=${encodeURIComponent(query)}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  container.querySelectorAll("[data-search-chip]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const term = chip.dataset.searchChip;
      window.history.pushState({}, "", `/search?q=${encodeURIComponent(term)}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  });
}

export async function renderSearchPage(container, query, initialFilter = "all", initialSort = "relevance") {
  const filter = normalizeFilter(initialFilter);
  const sortBy = normalizeSort(initialSort);
  const renderToken = Symbol("search-render");

  const state = {
    query,
    items: [],
    page: 0,
    totalPages: 1,
    requestId: 0,
    filter,
    sortBy
  };

  container.searchRenderToken = renderToken;
  container.classList.remove("explore-shell");
  container.innerHTML = searchMarkup(query, filter, sortBy);

  const onFilterChange = (nextFilter) => {
    if (state.filter === nextFilter) {
      return;
    }
    state.filter = nextFilter;

    container.querySelectorAll("[data-search-filter]").forEach((button) => {
      const isActive = button.dataset.searchFilter === nextFilter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    const params = new URLSearchParams(window.location.search);
    params.set("q", query);
    params.set("type", nextFilter);
    if (state.sortBy !== "relevance") {
      params.set("sort", state.sortBy);
    }
    window.history.replaceState({}, "", `/search?${params.toString()}`);

    renderResults(container, state);
  };

  container.querySelectorAll("[data-search-filter]").forEach((button) => {
    button.addEventListener("click", () => onFilterChange(button.dataset.searchFilter));
  });

  const sortSelect = container.querySelector("#search-sort");
  sortSelect?.addEventListener("change", (event) => {
    state.sortBy = normalizeSort(event.target.value);

    const params = new URLSearchParams(window.location.search);
    params.set("q", query);
    params.set("type", state.filter);
    if (state.sortBy !== "relevance") {
      params.set("sort", state.sortBy);
    } else {
      params.delete("sort");
    }
    window.history.replaceState({}, "", `/search?${params.toString()}`);

    renderResults(container, state);
  });

  const loadPage = async (page, append = false) => {
    const requestId = ++state.requestId;
    const grid = container.querySelector("#search-results-grid");
    const footer = container.querySelector("#search-page-footer");

    if (!append) {
      grid.innerHTML = loadingCards(12);
      footer.innerHTML = "";
    } else {
      const button = footer.querySelector("[data-load-more]");
      if (button) {
        button.disabled = true;
        button.textContent = "Loading...";
      }
    }

    try {
      const response = await searchMedia(query, page);

      if (container.searchRenderToken !== renderToken || requestId !== state.requestId) {
        return;
      }

      const existingKeys = new Set(state.items.map((item) => `${item.type}:${item.id}`));
      state.items = append
        ? [...state.items, ...response.items.filter((item) => !existingKeys.has(`${item.type}:${item.id}`))]
        : response.items;
      state.page = response.page;
      state.totalPages = response.totalPages;

      renderResults(container, state);
      renderLoadMore(container, state, () => loadPage(state.page + 1, true));
    } catch (error) {
      if (container.searchRenderToken !== renderToken || requestId !== state.requestId) {
        return;
      }

      grid.innerHTML = errorState(error.message || "Could not complete your search.", "search");
      footer.innerHTML = "";
      console.error(`Unable to search for "${query}".`, error);

      grid.querySelector("[data-retry]")?.addEventListener("click", () => loadPage(state.page || 1));
    }
  };

  await loadPage(1);
}
